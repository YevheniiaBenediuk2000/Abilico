"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  // useMap,
  useMapEvents,
} from "react-leaflet";
import { useCallback, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { createControlComponent } from "@react-leaflet/core";

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

// // TODO  • Save lat, lng, type to PostgreSQL table obstacles

const createRoutineMachineLayer = () => {
  const instance = L.Routing.control({
    waypoints: [L.latLng(57.74, 11.94), L.latLng(57.6792, 11.949)],
  });

  return instance;
};

const RoutingMachine = createControlComponent(createRoutineMachineLayer);

export default function Map() {
  const position: [number, number] = [51.505, -0.09];

  return (
    <MapContainer
      placeholder={<MapPlaceholder />}
      center={position}
      zoom={13}
      style={{ height: "100vh" }}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RoutingMachine />
      <NewMarker />
    </MapContainer>
  );
}
