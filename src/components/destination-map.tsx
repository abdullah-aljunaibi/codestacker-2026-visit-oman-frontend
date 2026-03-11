"use client";

import type { Locale } from "@/types/dataset";

interface DestinationMapProps {
  name: string;
  lat: number;
  lng: number;
  locale: Locale;
  className?: string;
}

export function DestinationMap({
  name,
  lat: _lat,
  lng: _lng,
  locale,
  className = ""
}: DestinationMapProps) {
  const placeQuery = encodeURIComponent(`${name}, Oman`);
  const embedUrl = `https://maps.google.com/maps?q=${placeQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${placeQuery}`;
  const _placeUrl = `https://www.google.com/maps/search/?api=1&query=${placeQuery}`;
  // View Photos removed — now in-page gallery instead
  const getDirectionsLabel = locale === "ar" ? "احصل على الاتجاهات" : "Get Directions";
  const locationLabel = locale === "ar" ? "الموقع" : "Location";
  const classes = ["destinationMapEmbed", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="destinationMapFrame">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${name}`}
          className="destinationMapIframe"
        />
      </div>

      <div className="destinationMapActions">
        <div className="destinationMapTitle">
          <span className="destinationMapPin" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                d="M17.657 16.657 13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <span className="destinationMapLabel">{locationLabel}</span>
            <strong>{name}</strong>
          </div>
        </div>

        <div className="destinationMapButtonRow">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="destinationMapButton destinationMapButtonPrimary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path
                d="m9 20-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{getDirectionsLabel}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
