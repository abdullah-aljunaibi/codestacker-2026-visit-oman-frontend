"use client";

import { useEffect } from "react";
import type { LatLngBoundsExpression } from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

import { expandBounds, getBoundsForCoordinates, OMAN_BOUNDS } from "@/components/maps/map-config";
import type { Locale } from "@/types/dataset";

export interface ItineraryMapStop {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

export interface ItineraryMapDay {
  dayNumber: number;
  stops: ItineraryMapStop[];
}

interface ItineraryMapClientProps {
  days: ItineraryMapDay[];
  selectedDayNumber: number;
  activeStopSlug: string | null;
  locale: Locale;
  onActiveStopChange: (slug: string) => void;
}

function FitBoundsController({ day }: { day: ItineraryMapDay | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (!day || day.stops.length === 0) {
      map.fitBounds(
        [
          [OMAN_BOUNDS.south, OMAN_BOUNDS.west],
          [OMAN_BOUNDS.north, OMAN_BOUNDS.east]
        ],
        { padding: [28, 28] }
      );
      return;
    }

    const bounds = expandBounds(
      getBoundsForCoordinates(day.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })))
    );

    map.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      ],
      { padding: [28, 28], maxZoom: day.stops.length === 1 ? 10 : 9 }
    );
  }, [day, map]);

  return null;
}

export default function ItineraryMapClient({
  days,
  selectedDayNumber,
  activeStopSlug,
  locale,
  onActiveStopChange
}: ItineraryMapClientProps) {
  const isRtl = locale === "ar";
  const selectedDay = days.find((day) => day.dayNumber === selectedDayNumber) ?? days[0];
  const omanBounds: LatLngBoundsExpression = [
    [OMAN_BOUNDS.south, OMAN_BOUNDS.west],
    [OMAN_BOUNDS.north, OMAN_BOUNDS.east]
  ];

  return (
    <div className="leafletMapShell itineraryLeafletMap">
      <MapContainer
        bounds={omanBounds}
        scrollWheelZoom={false}
        className="leafletCanvas"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <FitBoundsController day={selectedDay} />

        {days.map((day) => {
          const positions = day.stops.map((stop) => [stop.lat, stop.lng] as [number, number]);
          const isSelectedDay = day.dayNumber === selectedDayNumber;

          return positions.length > 1 ? (
            <Polyline
              key={`route-${day.dayNumber}`}
              positions={positions}
              pathOptions={{
                color: isSelectedDay ? "#0b6f5b" : "#94a39a",
                weight: isSelectedDay ? 4 : 2,
                opacity: isSelectedDay ? 0.9 : 0.45
              }}
            />
          ) : null;
        })}

        {days.flatMap((day) =>
          day.stops.map((stop, index) => {
            const isSelectedDay = day.dayNumber === selectedDayNumber;
            const isActive = stop.slug === activeStopSlug;

            return (
              <CircleMarker
                key={`${day.dayNumber}-${stop.slug}`}
                center={[stop.lat, stop.lng]}
                radius={isActive ? 9 : isSelectedDay ? 7 : 5}
                pathOptions={{
                  color: "#ffffff",
                  weight: isActive ? 3 : 2,
                  fillColor: isActive ? "#bd7a2d" : isSelectedDay ? "#0b6f5b" : "#88958d",
                  fillOpacity: isSelectedDay ? 0.95 : 0.72
                }}
                eventHandlers={{
                  click: () => onActiveStopChange(stop.slug)
                }}
              >
                <Tooltip direction={isRtl ? "left" : "right"} offset={[10, 0]}>
                  {`${stop.name} · ${index + 1}`}
                </Tooltip>
              </CircleMarker>
            );
          })
        )}
      </MapContainer>
    </div>
  );
}
