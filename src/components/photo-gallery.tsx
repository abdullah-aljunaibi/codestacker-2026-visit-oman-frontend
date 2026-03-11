"use client";
import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "vo_gallery_";

interface PhotoGalleryProps {
  images: string[];
  name: string;
  slug: string;
  photosLabel?: string;
}

export function PhotoGallery({ images, name, slug, photosLabel = "Photos" }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [displayImages, setDisplayImages] = useState(images);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const updated = images.map((img, i) => {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${slug}_${i}`);
      return stored || img;
    });
    setDisplayImages(updated);
  }, [images, slug]);

  const handleUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(`${STORAGE_PREFIX}${slug}_${index}`, dataUrl);
      setDisplayImages(prev => {
        const next = [...prev];
        next[index] = dataUrl;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  if (!displayImages || displayImages.length === 0) return null;

  return (
    <>
      <h3 className="photoGalleryHeading">📸 {photosLabel}</h3>
      <div className="photoGalleryGrid">
        {displayImages.map((img, i) => (
          <div key={i} style={{ position: "relative" }}>
            <button
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
            <button
              className="imageUploadBtn"
              onClick={() => fileRefs.current[i]?.click()}
              title="Upload replacement"
              aria-label="Upload replacement"
            >
              📷
            </button>
            <input
              ref={el => { fileRefs.current[i] = el; }}
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(i, e)}
              style={{ display: "none" }}
            />
          </div>
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

          {displayImages.length > 1 && (
            <button
              className="photoGalleryNav photoGalleryPrev"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex((selectedIndex - 1 + displayImages.length) % displayImages.length); }}
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          <img
            src={displayImages[selectedIndex]}
            alt={`${name} photo ${selectedIndex + 1}`}
            className="photoGalleryMainImg"
            onClick={(e) => e.stopPropagation()}
          />

          {displayImages.length > 1 && (
            <button
              className="photoGalleryNav photoGalleryNext"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex((selectedIndex + 1) % displayImages.length); }}
              aria-label="Next"
            >
              ›
            </button>
          )}

          <div className="photoGalleryCounter">
            {selectedIndex + 1} / {displayImages.length}
          </div>
        </div>
      )}
    </>
  );
}
