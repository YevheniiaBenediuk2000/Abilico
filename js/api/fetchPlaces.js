import pRetry from "https://cdn.jsdelivr.net/npm/p-retry@7.1.0/+esm";
import { pRetryConfig, SHOW_PLACES_ZOOM } from "../constants.mjs";

const OVERPASS_ENDPOINTS = [
  "https://overpass.osm.jp/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

let placeGeometryAbortController = null;

export async function fetchPlaceGeometry(osmType, osmId) {
  if (placeGeometryAbortController) {
    placeGeometryAbortController.abort();
  }
  placeGeometryAbortController = new AbortController();
  const { signal } = placeGeometryAbortController;

  const type = { N: "node", W: "way", R: "relation" }[osmType];

  const query = `
    [out:json];
    ${type}(${osmId});
    out geom;
  `;

  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await pRetry(async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          body: query,
          signal,
        });
        if (!response.ok)
          throw new Error(`Overpass error ${response.status} @ ${endpoint}`);
        const data = await response.json();

        // Convert Overpass JSON to GeoJSON (FeatureCollection)
        return osmtogeojson(data);
      }, pRetryConfig);
    } catch (error) {
      if (error?.name === "AbortError") {
        return { type: "FeatureCollection", features: [] };
      }

      lastError = error;
      console.warn(`[Overpass] ${endpoint} failed, trying next…`, error);
    }
  }

  if (lastError?.name === "AbortError") {
    return { type: "FeatureCollection", features: [] };
  }

  console.error("Geometry fetch failed on all Overpass endpoints:", lastError);
  return { type: "FeatureCollection", features: [] };
}

let placeAbortController = null;

export async function fetchPlace(osmType, osmId) {
  if (placeAbortController) {
    placeAbortController.abort();
  }
  placeAbortController = new AbortController();
  const { signal } = placeAbortController;

  const type = { N: "node", W: "way", R: "relation" }[osmType];

  const query = `
    [out:json];
    ${type}(${osmId});
    out center tags;
  `;

  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await pRetry(async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          body: query,
          signal,
        });

        if (!response.ok) throw new Error("Overpass " + response.status);
        const data = await response.json();

        return data.elements[0].tags;
      }, pRetryConfig);
    } catch (error) {
      if (error?.name === "AbortError") {
        return {};
      }

      lastError = error;
      console.warn(`[Overpass] ${endpoint} failed, trying next…`, error);
    }
  }

  if (lastError?.name === "AbortError") {
    return {};
  }

  console.error("Place fetch failed on all Overpass endpoints:", lastError);
  return {};
}

function buildAccessibilityClauses(allowed) {
  const ALL = ["designated", "yes", "limited", "unknown", "no"];
  if (ALL.every((t) => allowed.has(t))) return [""];

  const clauses = new Set();
  const KEYS = ["wheelchair", "toilets:wheelchair", "wheelchair:toilets"];

  if (allowed.has("designated")) {
    clauses.add('["wheelchair"="designated"]');
  }

  if (allowed.has("yes")) {
    KEYS.forEach((k) => clauses.add(`["${k}"~"^(yes|true)$"]`));
  }

  if (allowed.has("limited")) {
    // IMPORTANT: use a normal capturing group, not (?:...)
    KEYS.forEach((k) => clauses.add(`["${k}"~"^(limited|partial)$"]`));
    // If you don't want to accept "partial", change to: ^limited$
  }

  if (allowed.has("no")) {
    KEYS.forEach((k) => clauses.add(`["${k}"~"^(no|false)$"]`));
  }

  if (allowed.has("unknown")) {
    // wheelchairs present but value is not any of the recognized ones
    clauses.add(
      '["wheelchair"!~"^(designated|yes|true|limited|partial|no|false)$"]'
    );
    // …or none of the relevant keys exist at all
    clauses.add(
      '[!"wheelchair"][!"toilets:wheelchair"][!"wheelchair:toilets"]'
    );
  }

  return Array.from(clauses);
}

let placesAbortController = null;
export async function fetchPlaces(bounds, zoom, options) {
  const { accessibilityFilter } = options;

  const showNoPlaces = zoom < SHOW_PLACES_ZOOM;
  if (showNoPlaces) {
    return { type: "FeatureCollection", features: [] };
  }

  if (placesAbortController) {
    placesAbortController.abort();
  }
  placesAbortController = new AbortController();
  const { signal } = placesAbortController;

  const s = bounds.getSouth();
  const w = bounds.getWest();
  const n = bounds.getNorth();
  const e = bounds.getEast();
  const boundingBox = `${s},${w},${n},${e}`;

  const AMENITY_EXCLUDED =
    "bench|waste_basket|bicycle_parking|vending_machine|fountain|ice_cream|grit_bin|drinking_water|give_box|parcel_locker|water_point|recycling|waste_basket|waste_disposal";
  const LEISURE_EXCLUDED = "park|picnic_table";
  const MAN_MADE_EXCLUDED =
    "surveillance|pump|pipeline|pier|groyne|flagpole|embankment|dyke|clearcut|cutline";
  const MILITARY_EXCLUDED = "trench";

  if (accessibilityFilter.size === 0) {
    // Nothing checked ⇒ show nothing
    return { type: "FeatureCollection", features: [] };
  }

  // Base selectors WITHOUT bbox — we’ll append bbox and the tier clauses after
  const baseSelectors = [
    `node["amenity"]["name"]["amenity"!~"${AMENITY_EXCLUDED}"]`,
    `node["shop"]["name"]`,
    `node["tourism"]["name"]`,
    `node["leisure"]["name"]["leisure"!~"${LEISURE_EXCLUDED}"]`,
    `node["healthcare"]["name"]`,
    `node["building"]["name"]`,
    `node["office"]["name"]`,
    `node["craft"]["name"]`,
    `node["historic"]["name"]`,
    `node["man_made"]["name"]["man_made"!~"${MAN_MADE_EXCLUDED}"]`,
    `node["military"]["name"]["military"!~"${MILITARY_EXCLUDED}"]`,
  ];

  const accClauses = buildAccessibilityClauses(accessibilityFilter);

  // If accClauses === [""] we’ll just append bbox once per base selector.
  const queryParts = [];
  for (const base of baseSelectors) {
    if (accClauses.length === 1 && accClauses[0] === "") {
      queryParts.push(`${base}(${boundingBox})`);
    } else {
      for (const clause of accClauses) {
        queryParts.push(`${base}${clause}(${boundingBox})`);
      }
    }
  }

  const query = `
    [out:json][maxsize:1073741824];
    (
      ${queryParts.join(";\n      ")};
    );
    out center tags;
  `;

  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await pRetry(async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          body: query,
          signal,
        });

        if (!response.ok) {
          throw new Error(`Overpass error ${response.status} @ ${endpoint}`);
        }

        const data = await response.json();
        console.log(data);
        return osmtogeojson(data);
      }, pRetryConfig);
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      lastError = error;
      console.warn(`[Overpass] ${endpoint} failed, trying next…`, error);
    }
  }

  if (lastError?.name === "AbortError") {
    return;
  }

  console.error("Places fetch failed on all Overpass endpoints:", lastError);
}

// add my email for feedback
