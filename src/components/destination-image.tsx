"use client";
import { useEffect, useRef, useState } from "react";
import { getImage, storeImage } from "@/lib/image-store";
import type { Destination } from "@/types/domain";
import type { Locale } from "@/types/dataset";

export function DestinationImage({
  destination,
  locale,
  priority = false,
  className = "destinationImage"
}: {
  destination: Destination;
  locale: Locale;
  priority?: boolean;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgSrc, setImgSrc] = useState(destination.heroImage.src);

  useEffect(() => {
    getImage("hero_" + destination.slug).then(stored => {
      if (stored) setImgSrc(stored);
    });
  }, [destination.slug]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Resize before storing to save space
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxW = 1200;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      storeImage("hero_" + destination.slug, dataUrl).then(() => {
        setImgSrc(dataUrl);
      });
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={destination.name[locale]}
        className="destinationImageMedia"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        loading={priority ? "eager" : "lazy"}
      />
      <button
        className="imageUploadBtn"
        onClick={() => fileRef.current?.click()}
        title="Upload replacement image"
        aria-label="Upload replacement image"
      >
        📷
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: "none" }}
      />
    </div>
  );
}
