"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { useState } from "react";

function NewMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [obstacleType, setObstacleType] = useState("");

  const map = useMapEvents({
    click(event) {
      const userInput = prompt("What's the obstacle type?");
      if (userInput === null) {
        // User cancelled the prompt, do nothing
        return;
      }
      setObstacleType(userInput);
      setPosition(event.latlng);
      map.flyTo(event.latlng, map.getZoom());
    },
  });

  return (
    position && (
      <Marker position={position}>
        <Popup>{obstacleType}</Popup>
      </Marker>
    )
  );
}

export default function Map() {
  return (
    <MapContainer
      center={{ lat: 51.505, lng: -0.09 }}
      zoom={20}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <NewMarker />
    </MapContainer>
  );
}
