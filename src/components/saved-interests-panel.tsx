"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { filterDestinationsBySavedSlugs } from "@/lib/data/selectors";
import {
  clearSavedInterests,
  readSavedInterestSlugs,
  removeSavedInterest
} from "@/lib/persistence/interests";
import { resolveLocale } from "@/lib/i18n/config";

export function SavedInterestsPanel({ locale }: { locale: string }) {
  const normalizedLocale = resolveLocale(locale);
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const destinations = useMemo(
    () => normalizeDestinations(loadDestinations(), normalizedLocale),
    [normalizedLocale]
  );

  useEffect(() => {
    setSavedSlugs(readSavedInterestSlugs());
  }, []);

  const savedDestinations = useMemo(
    () => filterDestinationsBySavedSlugs(destinations, savedSlugs),
    [destinations, savedSlugs]
  );

  if (savedSlugs.length === 0) {
    return (
      <section className="card">
        <h2>{normalizedLocale === "ar" ? "الاهتمامات المحفوظة" : "Saved interests"}</h2>
        <p>
          {normalizedLocale === "ar"
            ? "ابدأ من صفحة الاكتشاف وأضف وجهات لتجهيز المخطط."
            : "Start in discovery and save destinations here before opening the planner."}
        </p>
        <div className="ctaRow">
          <Link className="pill pillPrimary" href={`/${normalizedLocale}/discover`}>
            {normalizedLocale === "ar" ? "اذهب للاكتشاف" : "Go to discovery"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>
        {normalizedLocale === "ar" ? "الاهتمامات المحفوظة" : "Saved interests"} ({savedSlugs.length})
      </h2>
      <p>
        {normalizedLocale === "ar"
          ? "تم حفظ هذه الوجهات محلياً في المتصفح لاستخدامها في إدخال المخطط."
          : "These destinations are saved in local browser storage and can prefill planner inputs."}
      </p>

      <div className="listStack">
        {savedDestinations.map((destination) => (
          <article key={destination.id} className="card cardSubtle">
            <h3>
              <Link href={`/${normalizedLocale}/discover/${destination.slug}`}>
                {destination.name[normalizedLocale]}
              </Link>
            </h3>
            <p>{destination.description[normalizedLocale]}</p>
            <div className="ctaRow">
              <button
                className="pill"
                type="button"
                onClick={() => setSavedSlugs(removeSavedInterest(destination.slug))}
              >
                {normalizedLocale === "ar" ? "إزالة" : "Remove"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="ctaRow" style={{ marginTop: "1rem" }}>
        <Link className="pill pillPrimary" href={`/${normalizedLocale}/planner`}>
          {normalizedLocale === "ar" ? "انتقل إلى المخطط" : "Continue to planner"}
        </Link>
        <button
          type="button"
          className="pill"
          onClick={() => {
            clearSavedInterests();
            setSavedSlugs([]);
          }}
        >
          {normalizedLocale === "ar" ? "مسح الكل" : "Clear all"}
        </button>
      </div>
    </section>
  );
}
