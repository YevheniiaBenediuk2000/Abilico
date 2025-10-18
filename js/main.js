// import {
//   pipeline,
//   env,
// } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";
import debounce from "https://cdn.jsdelivr.net/npm/lodash.debounce@4.0.8/+esm";

import {
  fetchPlace,
  fetchPlaceGeometry,
  fetchPlaces,
} from "./api/fetchPlaces.js";
import { fetchRoute } from "./api/fetchRoute.js";
import { obstacleStorage, reviewStorage } from "./api/obstacleStorage.js";
import {
  BASE_PATH,
  DEFAULT_ZOOM,
  SHOW_PLACES_ZOOM,
  EXCLUDED_PROPS,
} from "./constants.mjs";
import { ICON_MANIFEST } from "./static/manifest.js";
import { showModal } from "./utils/modal.mjs";
import {
  createMarker,
  waypointDivIcon,
  WP_COLORS,
} from "./utils/wayPoints.mjs";

let selectedPlaceLayer = null;
let placesPane;

const placesLayer = L.geoJSON(null, {
  pointToLayer: ({ properties: tags }, latlng) => {
    const marker = L.marker(latlng, {
      pane: "places-pane",
      icon: L.icon({ iconUrl: iconFor(tags), iconSize: [32, 32] }),
    }).on("click", () => renderDetails(tags, latlng));

    const title = tags.name ?? tags.amenity ?? "Unnamed place";

    marker.bindPopup(`<strong>${title}</strong>`);

    return marker;
  },
});

// ===== OMNIBOX STATE =====
let userLocation = null;
const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");
const suggestionsEl = document.getElementById("search-suggestions");

let obstacleFeatures = [];

const detailsPanel = document.getElementById("details-panel");

// --- LRM adapter that calls our existing OpenRouteService-based fetchRoute() ---
const WheelchairRouter = L.Class.extend({
  initialize(options = {}) {
    L.setOptions(this, options);
  },

  // LRM calls this when it needs a route
  async route(waypoints, callback, context, opts) {
    const coords = waypoints.map((wp) => [wp.latLng.lng, wp.latLng.lat]);

    try {
      // Use your existing obstacleFeatures + fetchRoute (ORS wheelchair + avoid_polygons)
      const geojson = await fetchRoute(coords, obstacleFeatures);

      if (!geojson || !geojson.features || !geojson.features.length) {
        return callback.call(context, { status: 500, message: "No route" });
      }

      const feat = geojson.features[0];
      const line = feat.geometry; // LineString
      const props = feat.properties || {};
      const summary = props.summary || { distance: 0, duration: 0 };

      const lrmCoords = line.coordinates.map(([lng, lat]) =>
        L.latLng(lat, lng)
      );

      const route = {
        name: "Wheelchair",
        coordinates: lrmCoords,
        // LRM expects these two props in meters/seconds:
        summary: {
          totalDistance: summary.distance || props.segments?.[0]?.distance || 0,
          totalTime: summary.duration || props.segments?.[0]?.duration || 0,
        },
        // Echo back waypoints for LRM
        inputWaypoints: waypoints,
        waypoints: waypoints.map((wp) => wp.latLng),
        // You can build turn-by-turn instructions later if you want:
        instructions: [],
      };

      callback.call(context, null, [route]);
    } catch (error) {
      callback.call(context, {
        status: 500,
        message: error?.message || "Routing error",
      });
    }
  },
});

const geocoder = L.Control.Geocoder.photon({
  serviceUrl: "https://photon.komoot.io/api/",
  reverseUrl: "https://photon.komoot.io/reverse/",
});
const routingControl = L.Routing.control({
  position: "topleft",
  router: new WheelchairRouter(),
  geocoder,
  routeWhileDragging: true,
  reverseWaypoints: true,
  showAlternatives: true,
  createMarker,
});

routingControl.on("routesfound", function (e) {
  searchBar.style.display = "none";
  detailsPanel.style.display = "none";
  routingControl.getContainer().style.marginTop = "10px";

  const routeBounds = L.latLngBounds(e.routes[0].coordinates);
  map.fitBounds(routeBounds, { padding: [70, 50] });
});

function iconFor(tags) {
  const candidates = ICON_MANIFEST.filter((p) =>
    p.endsWith(`/${tags.amenity}.svg`)
  );

  const url = candidates.length
    ? `${BASE_PATH}/${candidates[0]}`
    : `${BASE_PATH}/svg/misc/no_icon.svg`;

  return url;
}

async function refreshPlaces() {
  const zoom = map.getZoom();
  const geojson = await fetchPlaces(map.getBounds(), zoom);
  const visibleIds = new Set(geojson.features.map((f) => f.id));

  placesLayer.eachLayer((layer) => {
    const feature = layer.feature;
    const visible = visibleIds.has(feature.id);

    if (visible) {
      layer._icon && (layer._icon.style.display = "");
    } else {
      layer._icon && (layer._icon.style.display = "none");
    }
  });

  const existingIds = new Set();
  placesLayer.eachLayer((l) => existingIds.add(l.feature.id));

  geojson.features
    .filter((f) => !existingIds.has(f.id))
    .forEach((f) => placesLayer.addData(f));
}

const renderDetails = async (tags, latlng) => {
  detailsPanel.style.display = "block";
  detailsPanel.innerHTML = "<h3>Details</h3>";

  Object.entries(tags).forEach(([key, value]) => {
    if (!EXCLUDED_PROPS.has(key)) {
      const div = document.createElement("div");
      div.className = "detail-item";

      // Format the key for display
      let displayKey = key;
      if (key === "display_name") {
        displayKey = "Address";
      } else {
        // Replace underscores with spaces and capitalize first letters
        displayKey = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }

      div.innerHTML = `<strong>${displayKey}:</strong> ${value}`;
      detailsPanel.appendChild(div);
    }
  });

  // Add Directions button
  const dirBtn = document.createElement("button");
  dirBtn.textContent = "Directions";
  dirBtn.id = "btn-directions";
  dirBtn.addEventListener("click", () => {
    if (selectedPlaceLayer && selectedPlaceLayer instanceof L.Marker) {
      map.removeLayer(selectedPlaceLayer);
      selectedPlaceLayer = null;
    }

    const wps = routingControl.getWaypoints();

    const start = userLocation || wps[0].latLng;
    const end = latlng;

    if (start) {
      routingControl.setWaypoints([start, end]);
    } else {
      routingControl.setWaypoints([null, end]);
    }

    const routingContainer = routingControl.getContainer();
    routingContainer.classList.add("lrm-show-geocoders");
  });
  detailsPanel.appendChild(dirBtn);

  // Add Reviews Section
  const reviews = await reviewStorage();

  const reviewsContainer = document.createElement("div");
  reviewsContainer.id = "reviews-container";
  reviewsContainer.innerHTML = "<h3>Reviews</h3>";
  detailsPanel.appendChild(reviewsContainer);

  const placeId = tags.id ?? tags.osm_id ?? tags.place_id;

  const list = document.createElement("ul");

  reviews.forEach((r) => {
    if (placeId && placeId === r.placeId) {
      const li = document.createElement("li");
      li.innerHTML = r.text;
      list.appendChild(li);
    }
  });
  reviewsContainer.appendChild(list);

  // Add review form
  const form = document.createElement("form");
  form.id = "review-form";
  form.innerHTML = `
    <textarea id="review-text" placeholder="Write your review..." required></textarea><br>
    <button type="submit">Submit Review</button>
  `;
  reviewsContainer.appendChild(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const textarea = form.querySelector("#review-text");
    const text = textarea.value.trim();
    if (!text) return;

    const newReview = { text, placeId };
    reviews.push(newReview);

    const record = await reviewStorage("PUT", reviews);

    const li = document.createElement("li");
    li.innerHTML = record[record.length - 1].text;
    list.appendChild(li);
    textarea.value = "";
  });
};

async function initDrawingObstacles() {
  const drawnItems = new L.FeatureGroup();
  obstacleFeatures = await obstacleStorage();
  obstacleFeatures.forEach((feature) => {
    const layer = L.geoJSON(feature, {
      style: { color: "red" },
    }).getLayers()[0];
    layer.options.obstacleId = feature.properties.obstacleId;
    drawnItems.addLayer(layer);
  });
  map.addLayer(drawnItems);

  const drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: {
      polyline: false,
      marker: false,
      polygon: { allowIntersection: false, shapeOptions: { color: "red" } },
      rectangle: false,
      circle: false,
      circlemarker: { radius: 13, color: "red", fillColor: "red" },
    },
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, async (e) => {
    drawnItems.addLayer(e.layer);

    let newFeature;

    if (e.layerType === "circle" || e.layerType === "circlemarker") {
      // turf.buffer requires a point + radius in km
      const center = e.layer.getLatLng();
      const radiusKm = e.layer.getRadius() / 1000;
      newFeature = turf.buffer(turf.point([center.lng, center.lat]), radiusKm, {
        units: "kilometers",
      });
    } else if (e.layerType === "polygon" || e.layerType === "rectangle") {
      newFeature = e.layer.toGeoJSON();
    }

    newFeature.properties.obstacleId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    obstacleFeatures = await obstacleStorage("PUT", [
      ...obstacleFeatures,
      newFeature,
    ]);
  });

  map.on(L.Draw.Event.EDITED, (e) => {
    e.layers.eachLayer((layer) => {
      let updated;
      if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
        const c = layer.getLatLng();
        const radiusKm = layer.getRadius() / 1000;
        updated = turf.buffer(turf.point([c.lng, c.lat]), radiusKm, {
          units: "kilometers",
        });
      } else {
        updated = layer.toGeoJSON();
      }

      const i = obstacleFeatures.findIndex(
        (f) => f.properties.obstacleId === layer.feature.properties.obstacleId
      );
      if (i === -1) return;

      obstacleFeatures[i] = updated;
      obstacleStorage("PUT", obstacleFeatures);
    });
  });

  map.on(L.Draw.Event.DELETED, (e) => {
    e.layers.eachLayer((layer) => {
      obstacleFeatures = obstacleFeatures.filter(
        (f) => f.properties.obstacleId !== layer.feature.properties.obstacleId
      );
    });
    obstacleStorage("PUT", obstacleFeatures);
  });
}

function createButton(label, container) {
  const btn = L.DomUtil.create("button", "", container);
  btn.setAttribute("type", "button");
  btn.innerHTML = label;
  return btn;
}

// ============= INIT ================

const map = L.map("map", { zoomControl: false });
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      userLocation = L.latLng(latitude, longitude);
      map.setView([latitude, longitude], DEFAULT_ZOOM);
      L.marker([latitude, longitude]).addTo(map);
    },
    (error) => {
      const userDeniedGeolocation = error.code === 1;
      if (userDeniedGeolocation) {
        const defaultLatLng = [50.4501, 30.5234]; // Kyiv, Ukraine
        map.setView(defaultLatLng, SHOW_PLACES_ZOOM);
      } else {
        console.log(error);
      }
    }
  );
} else {
  console.log(error);
  showModal("Geolocation not supported. Using default location.");
}

// ============= EVENT LISTENERS ================

map.whenReady(() => {
  placesPane = map.createPane("places-pane");
  placesPane.style.zIndex = 450; // below selected

  const selectedPane = map.createPane("selected-pane");
  selectedPane.style.zIndex = 650; // above normal markers

  L.control.zoom({ position: "bottomright" }).addTo(map);

  routingControl.addTo(map);
  const routingContainer = routingControl.getContainer();
  routingContainer.appendChild(detailsPanel);

  // We’ll toggle this class to show LRM's geocoder fields when needed
  routingContainer.classList.remove("lrm-show-geocoders");

  placesLayer.addTo(map);

  refreshPlaces();
  initDrawingObstacles();

  map.on("moveend", debounce(refreshPlaces, 300));

  map.on("click", function (e) {
    const container = L.DomUtil.create("div"),
      startBtn = createButton("Start here", container),
      endBtn = createButton("Go here", container);

    const wps = routingControl.getWaypoints();
    const bothSet = wps.every((wp) => !!wp.latLng);
    let viaBtn;
    if (bothSet) {
      viaBtn = createButton("Add via here", container);
    }

    const popup = L.popup()
      .setLatLng(e.latlng)
      .setContent(container)
      .openOn(map);

    // Set START (replace waypoint 0)
    L.DomEvent.on(startBtn, "click", function () {
      routingControl.spliceWaypoints(0, 1, e.latlng);
      map.closePopup();
    });

    // Set END (replace last waypoint)
    L.DomEvent.on(endBtn, "click", function () {
      const last = routingControl.getWaypoints().length - 1;
      routingControl.spliceWaypoints(last, 1, e.latlng);
      map.closePopup();
    });

    // Insert VIA (before last), only if start+end already set
    if (viaBtn) {
      L.DomEvent.on(viaBtn, "click", function () {
        const last = routingControl.getWaypoints().length - 1;
        routingControl.spliceWaypoints(last, 0, e.latlng); // insert
        map.closePopup();
      });
    }
  });
});

/** Render suggestions list */
function renderSuggestions(items) {
  suggestionsEl.innerHTML = "";
  if (!items || !items.length) {
    suggestionsEl.style.display = "none";
    return;
  }
  items.forEach((res, idx) => {
    const li = document.createElement("li");
    li.role = "option";
    li.dataset.index = String(idx);
    li.innerHTML = res.name;
    li.addEventListener("click", () => selectSuggestion(items[idx]));
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.style.display = "block";
}

/** Select a suggestion: center map, drop marker, render card */
async function selectSuggestion(res) {
  suggestionsEl.style.display = "none";

  if (selectedPlaceLayer) {
    map.removeLayer(selectedPlaceLayer);
  }

  const osmType = res.properties.osm_type;
  const osmId = res.properties.osm_id;

  const geojsonGeometry = await fetchPlaceGeometry(osmType, osmId);

  const polyLike =
    geojsonGeometry.features.find(
      (f) => f.geometry && f.geometry.type !== "Point"
    ) || null;

  if (polyLike) {
    selectedPlaceLayer = L.geoJSON(geojsonGeometry, {
      style: {
        color: "#d33",
        weight: 2,
        opacity: 0.8,
        fillColor: "#f03",
        fillOpacity: 0.1,
        dashArray: "6,4",
      },
    });
    map.fitBounds(selectedPlaceLayer.getBounds());
  } else {
    const icon = waypointDivIcon("", WP_COLORS.end);
    selectedPlaceLayer = L.marker(res.center, {
      icon,
      keyboard: false,
      interactive: false,
    });
    map.setView(selectedPlaceLayer.getLatLng(), 18);
  }

  selectedPlaceLayer.addTo(map);

  const tags = await fetchPlace(res.properties.osm_type, res.properties.osm_id);
  renderDetails(tags, res.center);
}

searchInput.addEventListener(
  "input",
  debounce((e) => {
    const searchQuery = e.target.value.trim();
    if (!searchQuery) {
      suggestionsEl.style.display = "none";
      return;
    }

    geocoder.geocode(searchQuery, renderSuggestions);
  }, 300)
);

const hideSuggestionsIfClickedOutside = (e) => {
  if (!searchBar.contains(e.target)) {
    suggestionsEl.style.display = "none";
  }
};
document.addEventListener("click", hideSuggestionsIfClickedOutside);
