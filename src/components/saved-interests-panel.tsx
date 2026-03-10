"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadDestinations } from "@/lib/data/load-destinations";
import { normalizeDestinations } from "@/lib/data/normalize-destinations";
import { filterDestinationsBySavedSlugs } from "@/lib/data/selectors";
import { resolveLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  clearSavedInterests,
  readSavedInterestSlugs,
  removeSavedInterest
} from "@/lib/persistence/interests";

export function SavedInterestsPanel({ locale }: { locale: string }) {
  const normalizedLocale = resolveLocale(locale);
  const messages = getMessages(normalizedLocale);
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
        <h2>{messages.saved.title}</h2>
        <p>{messages.saved.emptyBody}</p>
        <div className="ctaRow">
          <Link className="pill pillPrimary" href={`/${normalizedLocale}/discover`}>
            {messages.saved.goToDiscovery}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>
        {messages.saved.title} ({savedSlugs.length})
      </h2>
      <p>{messages.saved.body}</p>

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
                {messages.saved.remove}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="ctaRow" style={{ marginTop: "1rem" }}>
        <Link className="pill pillPrimary" href={`/${normalizedLocale}/planner`}>
          {messages.saved.continueToPlanner}
        </Link>
        <button
          type="button"
          className="pill"
          onClick={() => {
            clearSavedInterests();
            setSavedSlugs([]);
          }}
        >
          {messages.saved.clearAll}
        </button>
      </div>
    </section>
  );
}
