"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { LatLngExpression } from "leaflet";

export default function Map() {
  const position: LatLngExpression = [40.8054, -74.0241];

  return (
    <MapContainer
      center={position}
      zoom={14}
      style={{ height: "500px", width: "700px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} draggable={false}>
        <Popup>Hey ! I study here</Popup>
      </Marker>
    </MapContainer>
  );
}
