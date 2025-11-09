// your old Leaflet app logic

// will now just render a wrapper
// import {
//   pipeline,
//   env,
// } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";
import debounce from "lodash.debounce"

import {
    fetchPlace,
    fetchPlaceGeometry,
    fetchPlaces,
} from "./api/fetchPlaces.js";
import { fetchRoute } from "./api/fetchRoute.js";
import { obstacleStorage } from "./api/obstacleStorage.js";
import {
    BASE_PATH,
    DEFAULT_ZOOM,
    EXCLUDED_PROPS,
    SIZE_BY_TIER,
    placeClusterConfig,
} from "./constants.mjs";
import { toastError, toastWarn } from "./utils/toast.mjs";
import { waypointDivIcon, WP_COLORS } from "./utils/wayPoints.mjs";
import {
    DRAW_HELP_LS_KEY,
    DrawHelpAlert,
} from "./leaflet-controls/DrawHelpAlert.mjs";
import {
    AccessibilityLegend,
    getAccessibilityTier,
} from "./leaflet-controls/AccessibilityLegend.mjs";
import { ls } from "./utils/localStorage.mjs";
import {
    duringLoading,
    hideLoading,
    showDetailsLoading,
    showListSpinner,
    showLoading,
    withButtonLoading,
} from "./utils/loading.mjs";
import {
    baseLayers,
    BASEMAP_LS_KEY,
    BasemapGallery,
    osm,
} from "./leaflet-controls/BasemapGallery.mjs";
import { detailsPanel } from "./utils/commonVariables.mjs";
import {
    renderPhotosGrid,
    resolvePlacePhotos,
    showMainPhoto,
} from "./modules/fetchPhotos.mjs";

console.log("🧭 mapMain.js imported fetchPhotos.mjs successfully");

import { makePoiIcon } from "./icons/makePoiIcon.mjs";
import { supabase } from "./api/supabaseClient.js";
import { ensurePlaceExists, reviewStorage } from "./api/reviewStorage.js";


const detailsCtx = { latlng: null, placeId: null };

let accessibilityFilter = new Set(["designated", "yes", "limited", "unknown", "no"]);

let clickPopup = null;

export async function initMap() {

function showQuickRoutePopup(latlng) {
    const html = `
    <div class="d-flex align-items-center gap-2" role="group" aria-label="Quick route actions">
      <button id="qp-start" type="button" class="btn btn-sm btn-primary">Start here</button>
      <button id="qp-go" type="button" class="btn btn-sm btn-danger">Go here</button>
    </div>
  `;

    if (clickPopup) {
        map.closePopup(clickPopup);
        clickPopup = null;
    }

    clickPopup = L.popup({
        className: "quick-choose-popup",
        offset: [0, -8],
        autoClose: true,
        closeOnClick: true,
        closeButton: true,
    })
        .setLatLng(latlng)
        .setContent(html)
        .openOn(map);

    const startBtn = document.getElementById("qp-start");
    const goBtn = document.getElementById("qp-go");

    startBtn.addEventListener("click", async (ev) => {
        L.DomEvent.stop(ev);
        console.log("🟢 CLICK: Start here clicked at latlng:", latlng);
        try {
            directionsUi.classList.remove("d-none");
            moveDepartureSearchBarUnderTo();
            mountInOffcanvas("Directions");

            await setFrom(latlng, null, { fit: false });
            // chInput.focus();
            departureSearchInput.focus();
        } finally {
            map.closePopup(clickPopup);
            console.log("🟢 Start here handler finished");
        }
    });

    goBtn.addEventListener("click", async (ev) => {
        console.log("🟢 CLICK: Go here clicked at latlng:", latlng);
        L.DomEvent.stop(ev);
        try {
            directionsUi.classList.remove("d-none");
            moveDepartureSearchBarUnderTo();
            mountInOffcanvas("Directions");

            await setTo(latlng, null, { fit: false });
            departureSearchInput.focus();
        } finally {
            map.closePopup(clickPopup);
        }
    });
}

const directionsUi = document.getElementById("directions-ui");

let selectedPlaceLayer = null;
let placesPane;

const placeClusterLayer = L.markerClusterGroup(placeClusterConfig);

// Track when Leaflet.Draw is in editing/deleting mode
const drawState = { editing: false, deleting: false };
let drawControl = null;

// ===== OMNIBOX STATE =====
const destinationSearchBar = document.getElementById("destination-search-bar");
const destinationSearchBarHome = destinationSearchBar.parentElement;
const destinationSearchInput = document.getElementById(
    "destination-search-input"
);
const destinationSuggestionsEl = document.getElementById(
    "destination-suggestions"
);

const departureSearchBar = document.getElementById("departure-search-bar");
const departureSearchInput = document.getElementById("departure-search-input");
const departureSuggestionsEl = document.getElementById("departure-suggestions");

let fromLatLng = null;
let toLatLng = null;
let fromMarker = null;
let toMarker = null;
let routeLayer = null;

const drawnItems = new L.FeatureGroup();
let drawHelpAlertControl = null;

let obstacleFeatures = [];
let reviews = [];

const reviewForm = detailsPanel.querySelector("#review-form");
const reviewsListEl = detailsPanel.querySelector("#reviews-list");
const submitReviewBtn = detailsPanel.querySelector("#submit-review-btn");

// ----- Offcanvas integration -----
const offcanvasEl = document.getElementById("placeOffcanvas");
const offcanvasTitleEl = document.getElementById("placeOffcanvasLabel");
const offcanvasInstance = new bootstrap.Offcanvas(offcanvasEl);

/** Mount search bar + details panel into the Offcanvas and open it. */
function mountInOffcanvas(titleText) {
    offcanvasTitleEl.textContent = titleText;
    offcanvasInstance.show();
}

offcanvasEl.addEventListener("hidden.bs.offcanvas", () => {
    destinationSearchBarHome.prepend(destinationSearchBar);
    destinationSearchBar.classList.remove("d-none");
});

// ---------- Bootstrap Modal + Tooltip helpers ----------
let obstacleModalInstance = null;
let obstacleForm, obstacleTitleInput;

function toggleDepartureSuggestions(visible) {
    departureSuggestionsEl.classList.toggle("d-none", !visible);
    departureSearchInput.setAttribute(
        "aria-expanded",
        visible ? "true" : "false"
    );
}

function toggleDestinationSuggestions(visible) {
    destinationSuggestionsEl.classList.toggle("d-none", !visible);
    destinationSearchInput.setAttribute(
        "aria-expanded",
        visible ? "true" : "false"
    );
}

function ensureObstacleModal() {
    if (!obstacleModalInstance) {
        const modalEl = document.getElementById("obstacleModal");
        obstacleForm = document.getElementById("obstacle-form");
        obstacleTitleInput = document.getElementById("obstacle-title");
        obstacleModalInstance = new bootstrap.Modal(modalEl);
    }
}

/**
 * Opens the Bootstrap modal. Returns a Promise that resolves to:
 *  { title } on Save, or null on Cancel/close.
 */
function showObstacleModal(initial = { title: "" }) {
    ensureObstacleModal();
    obstacleTitleInput.value = initial.title;

    return new Promise((resolve) => {
        let saved = false;

        const onSubmit = (e) => {
            e.preventDefault();
            saved = true;
            const title = obstacleTitleInput.value.trim();
            obstacleModalInstance.hide();
            obstacleForm.removeEventListener("submit", onSubmit);
            modalEl.removeEventListener("hidden.bs.modal", onHidden);
            resolve({ title });
        };

        const modalEl = document.getElementById("obstacleModal");
        const onHidden = () => {
            obstacleForm.removeEventListener("submit", onSubmit);
            modalEl.removeEventListener("hidden.bs.modal", onHidden);
            if (!saved) resolve(null);
        };

        obstacleForm.addEventListener("submit", onSubmit);
        modalEl.addEventListener("hidden.bs.modal", onHidden);
        obstacleModalInstance.show();
    });
}

function tooltipTextFromProps(p = {}) {
    const t = p.title?.trim();
    if (t) return t;
    return "Obstacle";
}

function attachBootstrapTooltip(layer, text) {
    // Vector layers (polygon/circle/line) are SVG paths; markers have icons.
    const el = layer.getElement?.() || layer._path || layer._icon;
    if (!el) return;

    // Dispose an existing tooltip on this layer if present.
    if (layer._bsTooltip) {
        layer._bsTooltip.dispose();
        layer._bsTooltip = null;
    }

    el.setAttribute("data-bs-toggle", "tooltip");
    el.setAttribute("data-bs-title", text);
    // A11y
    el.setAttribute("aria-label", text);

    // Create a fresh tooltip instance
    layer._bsTooltip = new bootstrap.Tooltip(el, {
        placement: "top",
        trigger: "hover focus",
        container: "body",
    });
}

async function openEditModalForLayer(layer) {
    const id = layer.options.obstacleId;
    const idx = obstacleFeatures.findIndex(
        (f) => f.properties?.obstacleId === id
    );
    if (idx === -1) return;

    const props = obstacleFeatures[idx].properties || {};
    const result = await showObstacleModal({ title: props.title });
    if (!result) return; // cancelled

    // Update in-memory + storage
    obstacleFeatures[idx].properties = {
        ...props,
        obstacleId: id,
        title: result.title,
    };
    await obstacleStorage("PUT", obstacleFeatures);

    // Update tooltip
    attachBootstrapTooltip(
        layer,
        tooltipTextFromProps(obstacleFeatures[idx].properties)
    );
}

function hookLayerInteractions(layer, props) {
    // Ensure the element exists in the DOM before creating tooltip
    // (safe if we call after the layer is added to the map/featureGroup).
    // Re-attach tooltip whenever the layer is re-added to the map
    layer.once("add", () =>
        attachBootstrapTooltip(layer, tooltipTextFromProps(props))
    );

    layer.off("click");
    layer.on("click", () => {
        if (drawState.deleting || drawState.editing) return;
        openEditModalForLayer(layer);
    });
}

function toggleObstaclesByZoom() {
    const allow = map.getZoom() >= DEFAULT_ZOOM;

    if (allow) {
        if (!drawHelpAlertControl && !ls.get(DRAW_HELP_LS_KEY)) {
            drawHelpAlertControl = new DrawHelpAlert();
            map.addControl(drawHelpAlertControl);
        }

        map.addControl(drawControl);
    } else {
        if (drawHelpAlertControl && !ls.get(DRAW_HELP_LS_KEY)) {
            map.removeControl(drawHelpAlertControl);
            drawHelpAlertControl = null;
        }

        map.removeControl(drawControl);
    }
}

    // ✅ Create a Photon-based geocoder instance from Leaflet-Control-Geocoder.
// This object normally has `geocode()` (search by name) and `reverse()` (get name from coordinates),
// but the default implementation uses XHR, which often fails in modern frameworks (Next.js, Vite, Turbopack).
    const geocoder = L.Control.Geocoder.photon({
        serviceUrl: "https://photon.komoot.io/api/",
        reverseUrl: "https://photon.komoot.io/reverse/",
    });


// ------------------------------------------------------------
// Utility helper for making safe JSON requests
// ------------------------------------------------------------

// Instead of repeating fetch + error handling in both functions,
// we define a helper that guarantees consistent error messages.
    const safeFetch = async (url) => {
        const res = await fetch(url);

        // If Photon responds with non-2xx (e.g., 403 or 500), throw a descriptive error.
        if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);

        // Parse JSON — Photon always returns valid GeoJSON FeatureCollection.
        return res.json();
    };


// ------------------------------------------------------------
// Override the default forward geocoding behavior (Search bar)
// ------------------------------------------------------------

// This replaces Leaflet’s internal geocode() implementation
// with our own version that uses fetch() and always calls the callback (`cb`)
// — even if the request fails or returns no results.
    geocoder.geocode = async function (query, cb) {
        try {
            // ✅ Ignore empty or whitespace-only queries.
            if (!query?.trim()) return cb([]);

            // Compose the Photon API endpoint with a properly encoded search string.
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}`;

            // Fetch the GeoJSON response safely.
            const json = await safeFetch(url);

            // Map each GeoJSON feature into Leaflet-friendly result objects.
            const results = (json.features || []).map((f) => ({
                name:
                    f.properties.name ||               // normal place name
                    f.properties.osm_value ||          // fallback: OSM tag (like "restaurant")
                    f.properties.street ||             // or street name
                    "Unnamed",                         // fallback if no name at all
                center: [                            // convert [lon, lat] → [lat, lon] for Leaflet
                    f.geometry.coordinates[1],
                    f.geometry.coordinates[0],
                ],
                properties: f.properties,            // keep all Photon metadata for later (e.g. OSM ID)
            }));

            // Log to help debug and confirm search → callback path.
            console.log("🌍 Photon geocode callback fired:", query, results);

            // ✅ Always call the callback with results — this updates the search suggestions.
            cb(results);
        } catch (err) {
            // In case of fetch/network/parse errors, print clearly in console.
            console.error("❌ Photon geocode failed:", err);

            // ✅ Important: still call `cb([])` so the UI spinner stops instead of hanging forever.
            cb([]);
        }
    };


// ------------------------------------------------------------
// 📍 Override reverse geocoding behavior (Route start/end naming)
// ------------------------------------------------------------

// Similar to above, but goes the other way around: lat/lng → nearest place name.
    geocoder.reverse = async function (latlng, scale, cb) {
        try {
            // Build the reverse geocoding URL with coordinates.
            const url = `https://photon.komoot.io/reverse?lat=${latlng.lat}&lon=${latlng.lng}`;

            // Fetch and parse JSON safely.
            const json = await safeFetch(url);

            // Convert GeoJSON features to Leaflet-friendly results.
            const results = (json.features || []).map((f) => ({
                name:
                    f.properties.name ||               // best available name
                    f.properties.osm_value ||          // fallback (e.g., "building" or "bus_stop")
                    f.properties.street ||             // or nearby street
                    "Unnamed",                         // last-resort fallback
                center: [
                    f.geometry.coordinates[1],
                    f.geometry.coordinates[0],
                ],
                properties: f.properties,
            }));

            // Log to confirm reverse geocode happened and data returned.
            console.log("📍 Photon reverse callback fired:", latlng, results);

            // ✅ Pass results to the callback so map labels and inputs update.
            cb(results);
        } catch (err) {
            // Handle network, JSON, or HTTP failures.
            console.error("❌ Photon reverse failed:", err);

            // ✅ Always call cb([]) — never leave routing promises hanging.
            cb([]);
        }
    };

let placesReqSeq = 0;
async function refreshPlaces() {
    const mySeq = ++placesReqSeq; // capture this call’s id

    const zoom = map.getZoom();
    const key = showLoading("places");

    try {
        const geojson = await fetchPlaces(map.getBounds(), zoom, {
            accessibilityFilter,
        });
        // If this response is for an old call, ignore it
        if (mySeq !== placesReqSeq) return;

        placeClusterLayer.clearLayers();

        const placesLayer = L.geoJSON(geojson, {
            pointToLayer: (feature, latlng) => {
                const tags = feature.properties.tags || feature.properties;
                // console.log("POI tags sample:", tags);

                const marker = L.marker(latlng, {
                    pane: "places-pane",
                    icon: makePoiIcon(tags), // <-- fixed 33px badge
                })
                    .on("click", () => {
                        renderDetails(tags, latlng, { keepDirectionsUi: true });
                    })
                    .on("add", () => {
                        const title = tags.name ?? tags.amenity ?? "Unnamed place";
                        attachBootstrapTooltip(marker, title);
                    })
                    .on("remove", () => {
                        if (marker._bsTooltip) {
                            marker._bsTooltip.dispose();
                            marker._bsTooltip = null;
                        }
                    });

                return marker;
            },
        });
        placeClusterLayer.addLayer(placesLayer);
    } finally {
        hideLoading(key);
    }
}

    function moveDepartureSearchBarUnderTo() {
        const toLabel = directionsUi?.querySelector?.(
            'label[for="destination-search-input"]'
        );

        if (!toLabel) {
            console.warn("⚠️ moveDepartureSearchBarUnderTo: label not found");
            return;
        }

        toLabel.insertAdjacentElement("afterend", destinationSearchBar);
    }

const renderOneReview = (text) => {
    const li = document.createElement("li");
    li.className = "list-group-item text-wrap";
    li.innerHTML = text;
    reviewsListEl.appendChild(li);
};

    const renderDetails = async (tags, latlng, { keepDirectionsUi } = {}) => {
        // ✅ Normalize latlng to ensure it always has valid structure
        if (!latlng || typeof latlng.lat !== "number" || typeof latlng.lng !== "number") {
            console.warn("⚠️ renderDetails received invalid latlng, repairing from tags:", latlng, tags);
            // Try to reconstruct from tag coordinates if possible
            if (tags.lat && tags.lon) {
                latlng = { lat: parseFloat(tags.lat), lng: parseFloat(tags.lon) };
            } else if (tags.geometry?.coordinates) {
                const [lon, lat] = tags.geometry.coordinates;
                latlng = { lat, lng: lon };
            } else {
                // fallback to map center to avoid crash
                latlng = map.getCenter();
            }
        }

        detailsCtx.tags = tags;
        const titleText = tags.name || tags.amenity || "Details";

        detailsPanel.classList.remove("d-none");
        const list = detailsPanel.querySelector("#details-list");
        list.innerHTML = "";

        // --- Render basic tags (address, amenity, etc.) ---
        Object.entries(tags).forEach(([key, value]) => {
            const containsAltName = /alt\s*name/i.test(key);
            const containsLocalizedVariants = /^(name|alt_name|short_name|display_name):/.test(key.toLowerCase());
            const isCountryKey = /^country$/i.test(key);

            const isExcluded =
                EXCLUDED_PROPS.has(key) ||
                containsAltName ||
                containsLocalizedVariants ||
                isCountryKey;

            if (!isExcluded) {
                const item = document.createElement("div");
                item.className = "list-group-item d-flex justify-content-between align-items-start";
                let displayKey = key === "display_name"
                    ? "Address"
                    : key.replace(/^Addr_?/i, "").replace(/[_:]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                const displayValue = String(value)
                    .replace(/[_:]/g, " ")
                    .replace(/\b\w/g, c => c.toUpperCase());
                item.innerHTML = `
        <div class="me-2">
          <h6 class="mb-1 fw-semibold">${displayKey}</h6>
          <p class="small mb-1">${displayValue}</p>
        </div>`;
                list.appendChild(item);
            }
        });

        detailsCtx.latlng = latlng;

        // ✅ Ensure the place exists before fetching reviews
        let uuid = null;
        try {
            uuid = await ensurePlaceExists(tags, latlng);
            detailsCtx.placeId = uuid;
            console.log("✅ detailsCtx.placeId (UUID):", uuid);
        } catch (err) {
            console.warn("⚠️ ensurePlaceExists failed, skipping reviews:", err);
            detailsCtx.placeId = null; // still allow photos to load
        }
        detailsCtx.placeId = uuid;
        console.log("✅ detailsCtx.placeId (UUID):", uuid);

        // ✅ Give Supabase a short delay to confirm record visibility (important for free tier)
        await new Promise(r => setTimeout(r, 300));

        // ✅ Fetch reviews ONCE (with small retry for consistency)
        const key = showLoading("reviews-load");
        let reviewsData = [];
        try {
            let retries = 3;
            while (retries-- > 0) {
                const data = await reviewStorage("GET", { place_id: detailsCtx.placeId });
                if (data?.length || retries === 0) {
                    reviewsData = data;
                    break;
                }
                await new Promise(r => setTimeout(r, 600));
            }
        } finally {
            hideLoading(key);
        }

        // ✅ Render reviews
        reviewsListEl.innerHTML = "";
        if (reviewsData.length === 0) {
            const emptyMsg = document.createElement("li");
            emptyMsg.className = "list-group-item text-muted";
            emptyMsg.textContent = "No reviews yet.";
            reviewsListEl.appendChild(emptyMsg);
        } else {
            reviewsData.forEach(r => renderOneReview(r.comment));
        }

        // ✅ Handle layout and offcanvas
        if (!keepDirectionsUi) directionsUi.classList.add("d-none");
        moveDepartureSearchBarUnderTo();
        mountInOffcanvas(titleText);

        // --- Photos ---
        try {
            const keyPhotos = showLoading("photos-load");
            const photos = await resolvePlacePhotos(tags, latlng);

            console.log("📷 resolvePlacePhotos returned", photos.length, "items:", photos);
            showMainPhoto(photos[0]);
            renderPhotosGrid(photos);
            hideLoading(keyPhotos);
        } catch (err) {
            console.warn("Photo resolution failed", err);
            showMainPhoto(null);
            renderPhotosGrid([]);
        }
    };

function makeCircleFeature(layer) {
    const center = layer.getLatLng();
    const radius = layer.getRadius(); // meters
    return {
        type: "Feature",
        properties: { radius },
        geometry: { type: "Point", coordinates: [center.lng, center.lat] },
    };
}

// ================= INIT OBSTACLES =================
async function initDrawingObstacles() {
    const key = showLoading("obstacles-load");
    try {
        obstacleFeatures = await obstacleStorage();
    } finally {
        hideLoading(key);
    }

    // 🧩 Log all obstacle IDs for debugging
    // console.group("🧱 Obstacles loaded from Supabase");
    // obstacleFeatures.forEach((row, idx) => {
    //     console.log(`${idx + 1}. id: ${row.id}, type: ${row.type}, description: ${row.description}`);
    // });
    // console.groupEnd();

    obstacleFeatures.forEach((row) => {
        const feature = {
            type: "Feature",
            properties: {
                obstacleId: row.id,
                shape: row.type,
                title: row.description,
                radius: row.radius,
            },
            geometry: row.geometry,
        };

        let layer;
        if (feature.properties.shape === "circle") {
            const [lng, lat] = feature.geometry.coordinates;
            layer = L.circle([lat, lng], {
                radius: feature.properties.radius || 10,
                color: "red",
            });
        } else if (feature.properties.shape === "rectangle") {
            const bounds = L.geoJSON(feature).getBounds();
            layer = L.rectangle(bounds, { color: "red" });
        } else {
            layer = L.geoJSON(feature, { style: { color: "red" } }).getLayers()[0];
        }

        layer.options.obstacleId = feature.properties.obstacleId;
        drawnItems.addLayer(layer);
        hookLayerInteractions(layer, feature.properties);
    });

    map.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        position: "topright",
        edit: { featureGroup: drawnItems },
        draw: {
            polyline: { shapeOptions: { color: "red" } },
            polygon: { allowIntersection: false, shapeOptions: { color: "red" } },
            rectangle: { shapeOptions: { color: "red" } },
            circle: { shapeOptions: { color: "red" } },
            marker: false,
            circlemarker: false,
        },
    });
    toggleObstaclesByZoom();

    // CREATE
    map.on(L.Draw.Event.CREATED, async (e) => {
        let layerToAdd, featureToStore;

        if (e.layer instanceof L.Circle) {
            featureToStore = makeCircleFeature(e.layer);
            layerToAdd = L.circle(e.layer.getLatLng(), {
                radius: e.layer.getRadius(),
                color: "red",
            });
        } else {
            featureToStore = e.layer.toGeoJSON();
            layerToAdd = e.layer;
        }

        drawnItems.addLayer(layerToAdd);
        const result = await showObstacleModal();

        if (!result) {
            drawnItems.removeLayer(layerToAdd);
            return;
        }

        featureToStore.properties = {
            ...(featureToStore.properties || {}),
            title: result.title,
            shape: e.layerType,
        };

        hookLayerInteractions(layerToAdd, featureToStore.properties);
        attachBootstrapTooltip(layerToAdd, tooltipTextFromProps(featureToStore.properties));

        const key = showLoading("obstacles-put");
        try {
            const { data, error } = await supabase
                .from("obstacles")
                .insert([
                    {
                        type: featureToStore.properties.shape,
                        description: featureToStore.properties.title,
                        geometry: featureToStore.geometry,
                        radius: featureToStore.properties.radius ?? (e.layer.getRadius?.() || null),
                    },
                ])
                .select();

            if (error) throw error;

            const newObstacle = data[0];
            layerToAdd.options.obstacleId = newObstacle.id;
            obstacleFeatures.push({
                type: "Feature",
                properties: {
                    obstacleId: newObstacle.id,
                    shape: newObstacle.type,
                    title: newObstacle.description,
                },
                geometry: newObstacle.geometry,
            });
            console.log("✅ Inserted new obstacle:", newObstacle.id);
        } catch (err) {
            console.error("❌ Failed to save obstacle:", err);
            drawnItems.removeLayer(layerToAdd);
            toastError("Could not save obstacle.");
        } finally {
            hideLoading(key);
        }
    });

    // EDIT
    map.on(L.Draw.Event.EDITED, async (e) => {
        e.layers.eachLayer(async (layer) => {
            const id = layer.options.obstacleId;
            const updated = layer instanceof L.Circle ? makeCircleFeature(layer) : layer.toGeoJSON();
            const existing = obstacleFeatures.find((f) => f.properties.obstacleId === id);
            if (!existing) return;

            existing.geometry = updated.geometry;
            try {
                await obstacleStorage("PUT", {
                    id,
                    type: existing.properties.shape,
                    description: existing.properties.title,
                    geometry: updated.geometry,
                    radius: updated.properties?.radius || layer.getRadius?.() || null,
                });
                console.log("✅ Updated obstacle:", id);
            } catch (err) {
                console.error("❌ Failed to update:", err);
                toastError("Could not update obstacle.");
            }
        });
    });

    // DELETE
    map.on(L.Draw.Event.DELETED, async (e) => {
        e.layers.eachLayer(async (layer) => {
            const id =
                layer?.options?.obstacleId ||
                layer?.feature?.properties?.obstacleId ||
                layer?.feature?.id ||
                null;

            if (!id) {
                console.warn("⚠️ Skipping layer without obstacleId:", layer);
                return;
            }

            // Safely filter local list
            obstacleFeatures = obstacleFeatures.filter(
                (f) => f?.properties?.obstacleId !== id
            );

            try {
                console.log("🚀 Deleting from Supabase with ID:", id);
                await obstacleStorage("DELETE", { id });
                console.log("🗑️ Deleted obstacle:", id);
            } catch (err) {
                console.error("❌ Failed to delete obstacle:", err);
                toastError("Could not delete obstacle.");
            }
        });
    });
} // ✅ end of initDrawingObstacles()


// ============= MAP INIT =============
const map = L.map("map", { zoomControl: false });

const initialName = ls.get(BASEMAP_LS_KEY) || "OSM";
let currentBasemapLayer = baseLayers[initialName] || osm;
currentBasemapLayer.addTo(map);

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], DEFAULT_ZOOM);
            L.marker([latitude, longitude]).addTo(map);
        },
        () => {
            map.setView([50.4501, 30.5234], DEFAULT_ZOOM); // Kyiv
        }
    );
} else {
    map.setView([50.4501, 30.5234], DEFAULT_ZOOM);
}

// ============= EVENT LISTENERS =============
map.whenReady(async () => {
    // console.log("✅ Leaflet map ready, initializing places...");
    placesPane = map.createPane("places-pane");
    placesPane.style.zIndex = 450;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    placeClusterLayer.addTo(map);
    map.addControl(new AccessibilityLegend());
    // temp
    console.log("🧩 AccessibilityLegend added to map");

    map.on("draw:editstart", () => (drawState.editing = true));
    map.on("draw:editstop", () => (drawState.editing = false));
    map.on("draw:deletestart", () => (drawState.deleting = true));
    map.on("draw:deletestop", () => (drawState.deleting = false));

    map.on("moveend", debounce(refreshPlaces, 200));
    await initDrawingObstacles();
    map.addControl(new BasemapGallery({ initial: initialName }));

    map.on("baselayerchange", (e) => ls.set(BASEMAP_LS_KEY, e.name));
    map.on("zoomend", toggleObstaclesByZoom);
    map.on("click", (e) => {
        if (drawState.editing || drawState.deleting) return;
        showQuickRoutePopup(e.latlng);

    });
    // ✅ ensure first batch loads immediately
    await refreshPlaces();
});

function renderDepartureSuggestions(items) {
    departureSuggestionsEl.innerHTML = "";
    if (!items || !items.length) {
        toggleDepartureSuggestions(false);
        return;
    }
    items.forEach((res, idx) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
            "list-group-item list-group-item-action list-group-item-light";
        btn.role = "option";
        btn.dataset.index = String(idx);
        btn.textContent = res.name;
        btn.addEventListener("click", () => selectDepartureSuggestion(items[idx]));
        li.appendChild(btn);
        departureSuggestionsEl.appendChild(li);
    });
    toggleDepartureSuggestions(true);
}

function renderDestinationSuggestions(items) {
    destinationSuggestionsEl.innerHTML = "";
    if (!items || !items.length) {
        toggleDestinationSuggestions(false);
        return;
    }
    items.forEach((res, idx) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
            "list-group-item list-group-item-action list-group-item-light";
        btn.role = "option";
        btn.dataset.index = String(idx);
        btn.textContent = res.name;
        btn.addEventListener("click", () =>
            selectDestinationSuggestion(items[idx])
        );
        li.appendChild(btn);
        destinationSuggestionsEl.appendChild(li);
    });
    toggleDestinationSuggestions(true);
}

function attachDraggable(marker, onMove) {
    marker.on("dragend", async (e) => {
        const ll = e.target.getLatLng();
        await onMove(ll);
    });
}

function clearRoute() {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
}
    async function updateRoute({fit = true} = {}) {
        console.log("🧭 updateRoute() called:", { fromLatLng, toLatLng });
        clearRoute();

        // 🧩 Defensive guard
        if (
            !fromLatLng ||
            !toLatLng ||
            !fromLatLng.lat ||
            !fromLatLng.lng ||
            !toLatLng.lat ||
            !toLatLng.lng
        ) {
            console.warn("⚠️ updateRoute aborted: invalid from/to coords", { fromLatLng, toLatLng });
            return;
        }

        const key = showLoading("route");

        try {
            const geojson = await fetchRoute(
                [
                    [fromLatLng.lng, fromLatLng.lat],
                    [toLatLng.lng, toLatLng.lat],
                ],
                obstacleFeatures
            );
            console.log("📦 fetchRoute() returned:", geojson);

            if (!geojson) {
                console.warn("⚠️ No route returned from API");
                return;
            }

            routeLayer = L.geoJSON(geojson, {
                style: {color: "var(--bs-indigo)", weight: 5, opacity: 0.9},
                interactive: false,
            }).addTo(map);

            const bounds = routeLayer.getBounds();
            if (fit && bounds.isValid()) {
                map.fitBounds(bounds, {padding: [120, 120]});
            }
        } finally {
            hideLoading(key);
        }
    }

    async function setFrom(latlng, text, opts = {}) {
        console.log("➡️ setFrom() called with:", { latlng, text, opts });

        fromLatLng = latlng;
        if (fromMarker) map.removeLayer(fromMarker);
        fromMarker = L.marker(latlng, {
            draggable: true,
            icon: waypointDivIcon("A", WP_COLORS.start),
        }).addTo(map);

        attachDraggable(fromMarker, async (ll) => {
            console.log("🌀 fromMarker dragged to:", ll);
            fromLatLng = ll;
            departureSearchInput.value = await reverseAddressAt(ll);
            updateRoute({ fit: false });
        });

        const address = await reverseAddressAt(latlng);
        console.log("📍 reverseAddressAt() returned:", address);
        departureSearchInput.value = text ?? address;

        console.log("✅ departureSearchInput.value now:", departureSearchInput.value);

        // 🧭 Only trigger routing when both endpoints exist
        if (toLatLng && fromLatLng) {
            // 🧭 Trigger routing only when both are valid
            if (toLatLng?.lat && toLatLng?.lng && fromLatLng?.lat && fromLatLng?.lng) {
                await updateRoute(opts);
            } else {
                console.log("ℹ️ Waiting for origin to be set before routing.");
            }
        } else {
            console.log("ℹ️ Waiting for destination to be set before routing.");
        }
    }

    async function setTo(latlng, text, opts = {}) {
        console.log("➡️ setTo() called with:", { latlng, text, opts });
        console.log("ℹ️ directionsUi visible?", !directionsUi.classList.contains("d-none"));
        toLatLng = latlng;
        const directionsActive = !directionsUi.classList.contains("d-none");
        if (directionsActive) {
            if (toMarker) map.removeLayer(toMarker);
            toMarker = L.marker(latlng, {
                draggable: true,
                icon: waypointDivIcon("B", WP_COLORS.end),
            }).addTo(map);
            attachDraggable(toMarker, async (ll) => {
                toLatLng = ll;
                destinationSearchInput.value = await reverseAddressAt(ll);
                if (toLatLng && fromLatLng) {
                    await updateRoute(opts);
                } else {
                    console.log("ℹ️ Waiting for origin to be set before routing.");
                }
            });
        }

        destinationSearchInput.value = text ?? (await reverseAddressAt(latlng));
        updateRoute(opts);
    }

    function reverseAddressAt(latlng) {
        console.log("🧭 reverseAddressAt called for:", latlng);

        const key = showLoading("reverse");

        return new Promise((resolve) => {
            geocoder.reverse(latlng, map.options.crs.scale(18), (items) => {
                console.log("📍 reverseAddressAt → got items:", items);
                hideLoading(key);

                const best = items?.[0]?.name;
                resolve(best || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
            });
        });
    }

async function selectDepartureSuggestion(res) {
    toggleDepartureSuggestions(false);
    await setFrom(res.center, res.name);
}

    async function selectDestinationSuggestion(res) {
        toggleDestinationSuggestions(false);

        if (selectedPlaceLayer) map.removeLayer(selectedPlaceLayer);

        showDetailsLoading(
            detailsPanel,
            res.name ?? "Details",
            moveDepartureSearchBarUnderTo,
            mountInOffcanvas
        );

        const key = showLoading("place-select");

        try {
            const osmType = res.properties.osm_type;
            const osmId = res.properties.osm_id;

            // 🗺️ Draw outline or marker
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
                }).addTo(map);
                map.fitBounds(selectedPlaceLayer.getBounds());
            } else {
                const icon = waypointDivIcon("", WP_COLORS.end);
                selectedPlaceLayer = L.marker(res.center, { icon, keyboard: false, interactive: false })
                    .addTo(map);
                map.setView(selectedPlaceLayer.getLatLng(), 18);
            }

            await setTo(res.center, res.name);

            // 🧭 STEP 1: basic Photon tags
            let tags = res.properties.tags || res.properties || {};
            console.log("🔍 Photon basic tags:", tags);

            // 🧭 STEP 2: fetch Overpass enrichment
            const enriched = await fetchPlace(osmType, osmId); // uses Overpass
            tags = { ...tags, ...enriched };
            console.log("📦 Enriched tags:", tags);

            // 🧭 STEP 3: render all details, photos, reviews, etc.
            renderDetails(tags, res.center);
        } catch (err) {
            console.error("❌ selectDestinationSuggestion failed", err);
        } finally {
            hideLoading(key);
        }
    }

// Also hide on Escape
departureSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleDepartureSuggestions(false);
});
destinationSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleDestinationSuggestions(false);
});

let destinationGeocodeReqSeq = 0;
destinationSearchInput.addEventListener(
    "input",
    debounce((e) => {
        console.log("🎯 debounce triggered for query:", e.target.value);
        const searchQuery = e.target.value.trim();

        if (!searchQuery) {
            toggleDestinationSuggestions(false);
            return;
        }

        const mySeq = ++destinationGeocodeReqSeq;
        showListSpinner(destinationSuggestionsEl, "Searching…");

        // console.log("📡 sending Photon request for:", searchQuery);
        geocoder.geocode(searchQuery, (items) => {
            if (mySeq !== destinationGeocodeReqSeq) return;

            // console.log("🌍 Photon geocode result for destination:", searchQuery, items);

            renderDestinationSuggestions(items);

            if (!items?.length) {
                destinationSuggestionsEl.innerHTML = `<li class="list-group-item text-muted">No results</li>`;
                destinationSuggestionsEl.classList.remove("d-none");
            }
        });
    }, 200)
);

let departureGeocodeReqSeq = 0;
departureSearchInput.addEventListener(
    "input",
    debounce((e) => {
        const searchQuery = e.target.value.trim();
        if (!searchQuery) {
            toggleDepartureSuggestions(false);
            return;
        }
        const mySeq = ++departureGeocodeReqSeq;
        showListSpinner(departureSuggestionsEl, "Searching…");

        geocoder.geocode(searchQuery, (items) => {
            if (mySeq !== departureGeocodeReqSeq) return;
            console.log("🚀 Photon geocode result for departure:", searchQuery, items);
            renderDepartureSuggestions(items);
            if (!items?.length) {
                departureSuggestionsEl.innerHTML = `<li class="list-group-item text-muted">No results</li>`;
                departureSuggestionsEl.classList.remove("d-none");
            }
        });
    }, 200)
);

const hideSuggestionsIfClickedOutside = (e) => {
    if (!departureSearchBar.contains(e.target)) {
        toggleDepartureSuggestions(false);
    }

    if (!destinationSearchBar.contains(e.target)) {
        toggleDestinationSuggestions(false);
    }
};
document.addEventListener("click", hideSuggestionsIfClickedOutside);

    detailsPanel
        .querySelector("#btn-start-here")
        .addEventListener("click", async () => {
            // ✅ Ensure directions UI is visible
            directionsUi.classList.remove("d-none");
            mountInOffcanvas("Directions");

            // 🧭 Clear destination (To)
            if (toMarker) {
                map.removeLayer(toMarker);
                toMarker = null;
                toLatLng = null;
            }
            destinationSearchInput.value = "";

            // 🧹 Also clear any highlighted place polygon or marker
            if (selectedPlaceLayer) {
                map.removeLayer(selectedPlaceLayer);
                selectedPlaceLayer = null;
            }

            // 🧩 Set this place as the new origin (From)
            await setFrom(detailsCtx.latlng, detailsCtx.tags?.name || "Selected place");

            // ✅ Focus on "From" input for user clarity
            departureSearchInput.focus();
        });

detailsPanel
    .querySelector("#btn-go-here")
    .addEventListener("click", async () => {
        directionsUi.classList.remove("d-none");
        mountInOffcanvas("Directions");
        await setTo(detailsCtx.latlng);
        departureSearchInput.focus();
    });

    reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const textarea = reviewForm.querySelector("#review-text");
        const text = textarea.value.trim();
        if (!text) return;

        try {
            console.log("🧭 Review submit ctx:", detailsCtx);
            const placeId = detailsCtx.placeId ?? (await ensurePlaceExists(detailsCtx.tags, detailsCtx.latlng));
            const newReview = { text, place_id: placeId };

            await withButtonLoading(
                submitReviewBtn,
                reviewStorage("POST", newReview),
                "Saving…"
            );

            // ✅ Reload and render updated reviews list
            const updated = await reviewStorage("GET", { place_id: placeId });
            reviewsListEl.innerHTML = "";
            updated.forEach((r) => renderOneReview(r.comment));

            textarea.value = "";
        } catch (error) {
            console.error("❌ Failed to save review:", error);
            toastError("Could not save your review. Please try again.");
        }
    });

// ✅ Global — must be OUTSIDE the submit handler
    document.addEventListener("accessibilityFilterChanged", (e) => {
        const incoming = e.detail;

        if (!incoming || !incoming.length) {
            accessibilityFilter = new Set(["designated", "yes", "limited", "unknown", "no"]);
        } else {
            accessibilityFilter = new Set(incoming);
        }

        refreshPlaces();
    });
}