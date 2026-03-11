"use client";
import { useEffect, useRef, useState } from "react";

import { createBlurDataUrl } from "@/lib/ui/image-placeholders";
import type { Destination } from "@/types/domain";
import type { Locale } from "@/types/dataset";

const STORAGE_PREFIX = "vo_img_";

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
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_PREFIX + destination.slug);
    if (stored) {
      setImgSrc(stored);
      setIsCustom(true);
    }
  }, [destination.slug]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      localStorage.setItem(STORAGE_PREFIX + destination.slug, dataUrl);
      setImgSrc(dataUrl);
      setIsCustom(true);
    };
    reader.readAsDataURL(file);
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
