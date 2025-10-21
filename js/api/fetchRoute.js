import turfcircle from "https://cdn.jsdelivr.net/npm/@turf/circle@7.2.0/+esm";
import turfbuffer from "https://cdn.jsdelivr.net/npm/@turf/buffer@7.2.0/+esm";

import { ORS_API_KEY } from "../constants.mjs";
import { showToast } from "../utils/toast.mjs";

let routeAbortController = null;

export async function fetchRoute(coordinates, obstacleFeatures) {
  if (routeAbortController) {
    routeAbortController.abort();
  }
  routeAbortController = new AbortController();
  const { signal } = routeAbortController;

  const url =
    "https://api.openrouteservice.org/v2/directions/wheelchair/geojson";

  const obstacleCoordinates = obstacleFeatures.flatMap((f) => {
    if (f.geometry.type === "Polygon") {
      return [f.geometry.coordinates];
    } else if (f.geometry.type === "MultiPolygon") {
      return f.geometry.coordinates;
    } else if (f.geometry.type === "Point") {
      const poly = turfcircle(f.geometry.coordinates, f.properties.radius, {
        steps: 32,
        units: "meters",
      });
      return [poly.geometry.coordinates];
    } else if (f.geometry.type === "LineString") {
      const buffer = turfbuffer(f, 1, { units: "meters", steps: 16 });
      return [buffer.geometry.coordinates];
    }
  });

  const requestBody = {
    coordinates,
    options: {
      avoid_polygons: {
        type: "MultiPolygon",
        coordinates: obstacleCoordinates,
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error.code === 2004) {
        showToast(
          "The distance between points is too long (over 300 km). Please choose closer locations.",
          { title: "Routing", variant: "warning", assertive: false }
        );
      } else {
        showToast(data?.error?.message || "Routing failed.", {
          title: "Routing",
          variant: "danger",
        });
      }

      throw new Error(await data.error.message);
    }

    console.log("Alternative Route:", data);

    const routeGeometry = data.features[0].geometry; // LineString coordinates
    // Use your mapping library (e.g., Leaflet/Mapbox) to draw the route
    console.log("Route Geometry:", routeGeometry);

    return data;
  } catch (error) {
    console.error(error);
  }
}
