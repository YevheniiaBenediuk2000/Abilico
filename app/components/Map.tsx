"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import { useCallback, useMemo, useRef, useState } from "react";

function NewMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [obstacleType, setObstacleType] = useState("");
  const [draggable, setDraggable] = useState(false);
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          setPosition(marker.getLatLng());
        }
      },
    }),
    []
  );

  const toggleDraggable = useCallback(() => {
    setDraggable((d) => !d);
  }, []);

  const map = useMapEvents({
    click(event) {
      const inputtedObstacleType = prompt("What's the obstacle type?");
      if (inputtedObstacleType === null) {
        // User cancelled the prompt, do nothing
        return;
      }
      setObstacleType(inputtedObstacleType);
      setPosition(event.latlng);
      map.flyTo(event.latlng, map.getZoom());
    },
  });

  const lat = position?.lat.toFixed(4);
  const lng = position?.lng.toFixed(4);

  const tooltipText = `Obstacle type: ${obstacleType}, latitude: ${lat}, longitude: ${lng}.`;

  return (
    position && (
      <Marker
        draggable={draggable}
        position={position}
        eventHandlers={eventHandlers}
        ref={markerRef}
      >
        <Popup minWidth={90}>
          <span onClick={toggleDraggable}>
            {draggable
              ? "Marker is draggable"
              : "Click here to make marker draggable"}
          </span>
        </Popup>
        <Tooltip permanent>{tooltipText}</Tooltip>
      </Marker>
    )
  );
}

function MapPlaceholder() {
  return (
    <p>
      <noscript>You need to enable JavaScript to see this map.</noscript>
    </p>
  );
}

export default function Map() {
  return (
    <MapContainer
      center={{ lat: 51.505, lng: -0.09 }}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      placeholder={<MapPlaceholder />}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <NewMarker />
    </MapContainer>
  );
}

// TODO  • Save lat, lng, type to PostgreSQL table obstacles
