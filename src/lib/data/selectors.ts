import type { DatasetDestination, Locale } from "@/types/dataset";

import {
  getLocalizedRegionLabel,
  getRegionKey,
  normalizeDestination,
  type NormalizedDestination
} from "@/lib/data/normalize-destinations";

export function normalizeDestinations(
  destinations: DatasetDestination[],
  locale: Locale
): NormalizedDestination[] {
  return destinations.map((destination) => normalizeDestination(destination, locale));
}

export function findDestinationBySlug(
  destinations: DatasetDestination[],
  slug: string
): DatasetDestination | undefined {
  return destinations.find((destination) => destination.slug === slug);
}

export function getRegionOptions(destinations: DatasetDestination[], locale: Locale) {
  return Array.from(
    new Map(
      destinations.map((destination) => [
        getRegionKey(destination),
        getLocalizedRegionLabel(destination, locale)
      ])
    ).entries()
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getCategoryOptions(destinations: DatasetDestination[]) {
  return Array.from(new Set(destinations.flatMap((destination) => destination.categories))).sort();
}

export function filterDestinationsBySavedSlugs(
  destinations: DatasetDestination[],
  savedSlugs: string[]
) {
  const savedSlugSet = new Set(savedSlugs);
  return destinations.filter((destination) => savedSlugSet.has(destination.slug));
}
