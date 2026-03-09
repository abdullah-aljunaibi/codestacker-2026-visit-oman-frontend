"use client";

import { useEffect, useState } from "react";

import { readSavedInterestSlugs, toggleSavedInterest } from "@/lib/persistence/interests";
import { resolveLocale } from "@/lib/i18n/config";

export function SaveInterestButton({
  slug,
  locale
}: {
  slug: string;
  locale: string;
}) {
  const normalizedLocale = resolveLocale(locale);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSavedInterestSlugs().includes(slug));
  }, [slug]);

  return (
    <button
      type="button"
      className={saved ? "pill pillSaved" : "pill"}
      onClick={() => {
        const next = toggleSavedInterest(slug);
        setSaved(next.includes(slug));
      }}
    >
      {saved
        ? normalizedLocale === "ar"
          ? "محفوظة للاهتمام"
          : "Saved to interests"
        : normalizedLocale === "ar"
          ? "احفظ للاهتمام"
          : "Save as interest"}
    </button>
  );
}
