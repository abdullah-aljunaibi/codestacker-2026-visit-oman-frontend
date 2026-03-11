"use client";
import { useRef, useState } from "react";

interface ImageUploadOverlayProps {
  imageKey: string;
  currentSrc: string;
  onImageChange?: (newSrc: string) => void;
  children: React.ReactNode;
  className?: string;
}

const STORAGE_PREFIX = "vo_img_";

function getStoredImage(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_PREFIX + key);
}

function storeImage(key: string, dataUrl: string) {
  localStorage.setItem(STORAGE_PREFIX + key, dataUrl);
}

export function ImageUploadOverlay({
  imageKey,
  currentSrc,
  onImageChange,
  children,
  className = ""
}: ImageUploadOverlayProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      storeImage(imageKey, dataUrl);
      onImageChange?.(dataUrl);
      setUploading(false);
      window.location.reload();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`imageUploadWrapper ${className}`} style={{ position: "relative" }}>
      {children}
      <button
        className="imageUploadBtn"
        onClick={() => fileRef.current?.click()}
        title="Upload replacement image"
        aria-label="Upload replacement image"
      >
        {uploading ? "⏳" : "📷"}
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

export function useUploadedImage(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getStoredImage(key) || fallback;
}
