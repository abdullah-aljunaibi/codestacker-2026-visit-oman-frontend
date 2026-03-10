"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

interface DestinationPreviewMapClientProps {
  lat: number;
  lng: number;
  title: string;
}

export default function DestinationPreviewMapClient({
  lat,
  lng,
  title
}: DestinationPreviewMapClientProps) {
  return (
    <div className="leafletMapShell destinationLeafletMap">
      <MapContainer
        center={[lat, lng]}
        zoom={9}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="leafletCanvas"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: "#0b6f5b",
            fillOpacity: 1
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent>
            {title}
          </Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
