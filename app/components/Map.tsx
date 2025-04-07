// "use client";

// import "leaflet/dist/leaflet.css";
// import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
// import "leaflet-defaulticon-compatibility";

// import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// import * as LeafletRoutingMachine from "leaflet-routing-machine";

// import {
//   MapContainer,
//   Marker,
//   Popup,
//   TileLayer,
//   Tooltip,
//   useMap,
//   useMapEvents,
// } from "react-leaflet";
// import { useCallback, useMemo, useRef, useState } from "react";
// import L from "leaflet";
// import { createControlComponent } from "@react-leaflet/core";

// const createRoutineMachineLayer = (props) => {
//   const instance = L.Routing.control({
//     waypoints: [
//       L.latLng(33.52001088075479, 36.26829385757446),
//       L.latLng(33.50546582848033, 36.29547681726967),
//     ],
//     lineOptions: {
//       styles: [{ color: "#6FA1EC", weight: 4 }],
//     },
//     show: false,
//     addWaypoints: false,
//     routeWhileDragging: true,
//     draggableWaypoints: true,
//     fitSelectedRoutes: true,
//     showAlternatives: false,
//   });

//   return instance;
// };

// const RoutingMachine = createControlComponent(createRoutineMachineLayer);

// function NewMarker() {
//   const [position, setPosition] = useState<L.LatLng | null>(null);
//   const [obstacleType, setObstacleType] = useState("");
//   const [draggable, setDraggable] = useState(false);
//   const markerRef = useRef<L.Marker | null>(null);

//   const eventHandlers = useMemo(
//     () => ({
//       dragend() {
//         const marker = markerRef.current;
//         if (marker != null) {
//           setPosition(marker.getLatLng());
//         }
//       },
//     }),
//     []
//   );

//   const toggleDraggable = useCallback(() => {
//     setDraggable((d) => !d);
//   }, []);

//   const map = useMapEvents({
//     click(event) {
//       const inputtedObstacleType = prompt("What's the obstacle type?");
//       if (inputtedObstacleType === null) {
//         // User cancelled the prompt, do nothing
//         return;
//       }
//       setObstacleType(inputtedObstacleType);
//       setPosition(event.latlng);
//       map.flyTo(event.latlng, map.getZoom());
//     },
//   });

//   const lat = position?.lat.toFixed(4);
//   const lng = position?.lng.toFixed(4);

//   const tooltipText = `Obstacle type: ${obstacleType}, latitude: ${lat}, longitude: ${lng}.`;

//   return (
//     position && (
//       <Marker
//         draggable={draggable}
//         position={position}
//         eventHandlers={eventHandlers}
//         ref={markerRef}
//       >
//         <Popup minWidth={90}>
//           <span onClick={toggleDraggable}>
//             {draggable
//               ? "Marker is draggable"
//               : "Click here to make marker draggable"}
//           </span>
//         </Popup>
//         <Tooltip permanent>{tooltipText}</Tooltip>
//       </Marker>
//     )
//   );
// }

// function MapPlaceholder() {
//   return (
//     <p>
//       <noscript>You need to enable JavaScript to see this map.</noscript>
//     </p>
//   );
// }

// export default function Map() {
//   return (
//     <MapContainer
//       center={{ lat: 51.505, lng: -0.09 }}
//       zoom={13}
//       style={{ height: "100%", width: "100%" }}
//       placeholder={<MapPlaceholder />}
//     >
//       <TileLayer
//         attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//       />
//       <RoutingMachine />
//       <NewMarker />
//     </MapContainer>
//   );
// }

// // TODO  • Save lat, lng, type to PostgreSQL table obstacles

// import React, { useEffect } from "react";
// import { MapContainer, TileLayer, useMap } from "react-leaflet";
// import "leaflet-routing-machine";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";

// const Routing = ({ start, end }) => {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     // Create a routing control and add it to the map
//     const routingControl = L.Routing.control({
//       waypoints: [L.latLng(start.lat, start.lng), L.latLng(end.lat, end.lng)],
//       routeWhileDragging: true,
//       lineOptions: {
//         styles: [{ color: "#6FA1EC", weight: 4 }],
//       },
//     }).addTo(map);

//     return () => {
//       map.removeControl(routingControl);
//     };
//   }, [map, start, end]);

//   return null;
// };

// const Map = (props) => {
//   const startPoint = { lat: 19.076, lng: 72.8777 }; // Example: Mumbai
//   const endPoint = { lat: 18.5204, lng: 73.8567 }; // Example: Pune

//   return (
//     <MapContainer
//       center={[19.076, 72.8777]}
//       zoom={7}
//       style={{ height: "100vh", width: "100%" }}
//     >
//       <TileLayer
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
//       />
//       <Routing start={startPoint} end={endPoint} />
//     </MapContainer>
//   );
// };

// export default Map;

import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import { useMap } from "react-leaflet";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
});

function Routing() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const routingControl = L.Routing.control({
      waypoints: [L.latLng(57.74, 11.94), L.latLng(57.6792, 11.949)],
      routeWhileDragging: true,
    }).addTo(map);

    return () => map.removeControl(routingControl);
  }, [map]);

  return null;
}

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Map() {
  const position = [51.505, -0.09];

  return (
    <MapContainer center={position} zoom={13} style={{ height: "100vh" }}>
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Routing />
    </MapContainer>
  );
}
