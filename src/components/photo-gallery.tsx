"use client";
import { useState } from "react";

interface PhotoGalleryProps {
  images: string[];
  name: string;
  photosLabel?: string;
}

export function PhotoGallery({ images, name, photosLabel = "Photos" }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images || images.length === 0) return null;

  return (
    <>
      <h3 className="photoGalleryHeading">📸 {photosLabel}</h3>
      <div className="photoGalleryGrid">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => { setSelectedIndex(i); setLightboxOpen(true); }}
            className="photoGalleryThumb"
          >
            <img
              src={img}
              alt={`${name} photo ${i + 1}`}
              className="photoGalleryThumbImg"
              loading="lazy"
            />
            <div className="photoGalleryThumbOverlay" />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div
          className="photoGalleryLightbox"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="photoGalleryClose"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>

          {images.length > 1 && (
            <button
              className="photoGalleryNav photoGalleryPrev"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex((selectedIndex - 1 + images.length) % images.length); }}
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          <img
            src={images[selectedIndex]}
            alt={`${name} photo ${selectedIndex + 1}`}
            className="photoGalleryMainImg"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              className="photoGalleryNav photoGalleryNext"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex((selectedIndex + 1) % images.length); }}
              aria-label="Next"
            >
              ›
            </button>
          )}

          <div className="photoGalleryCounter">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
