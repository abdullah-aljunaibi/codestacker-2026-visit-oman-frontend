"use client";
import { useEffect, useRef, useState } from "react";
import { getImage, storeImage } from "@/lib/image-store";

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
    Promise.all(
      images.map((img, i) => getImage(`gallery_${slug}_${i}`).then(stored => stored || img))
    ).then(setDisplayImages);
  }, [images, slug]);

  const handleUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxW = 1200;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      storeImage(`gallery_${slug}_${index}`, dataUrl).then(() => {
        setDisplayImages(prev => {
          const next = [...prev];
          next[index] = dataUrl;
          return next;
        });
      });
    };
    img.src = URL.createObjectURL(file);
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
