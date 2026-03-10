"use client";

import { useEffect, useState } from "react";

import { readSavedInterestSlugs, toggleSavedInterest } from "@/lib/persistence/interests";
import { resolveLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

export function SaveInterestButton({
  slug,
  locale
}: {
  slug: string;
  locale: string;
}) {
  const normalizedLocale = resolveLocale(locale);
  const messages = getMessages(normalizedLocale);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSavedInterestSlugs().includes(slug));
  }, [slug]);

  return (
    <button
      type="button"
      className={saved ? "pill pillSaved" : "pill"}
      aria-pressed={saved}
      onClick={() => {
        const next = toggleSavedInterest(slug);
        setSaved(next.includes(slug));
      }}
    >
      {saved ? messages.saveInterest.saved : messages.saveInterest.save}
    </button>
  );
}
