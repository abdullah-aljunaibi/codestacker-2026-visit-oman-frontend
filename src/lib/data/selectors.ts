import type { DatasetDestination, Locale } from "@/types/dataset";

import {
  getLocalizedRegionLabel,
  getRegionKey,
  normalizeDestinations
} from "@/lib/data/normalize-destinations";

export function getByCategory(destinations: DatasetDestination[], category?: string): DatasetDestination[] {
  if (!category) {
    return destinations;
  }
  return destinations.filter((destination) => destination.categories.includes(category));
}

export function getByRegion(destinations: DatasetDestination[], region?: string): DatasetDestination[] {
  if (!region) {
    return destinations;
  }
  return destinations.filter((destination) => getRegionKey(destination) === region);
}

export function getBySeason(destinations: DatasetDestination[], month?: number): DatasetDestination[] {
  if (!month) {
    return destinations;
  }
  return destinations.filter((destination) => destination.idealVisitMonths.includes(month));
}

export function sortByCrowd(destinations: DatasetDestination[], direction: "asc" | "desc" = "asc") {
  return destinations.slice().sort((a, b) =>
    direction === "asc" ? a.crowd_level - b.crowd_level : b.crowd_level - a.crowd_level
  );
}

export function sortByCost(destinations: DatasetDestination[], direction: "asc" | "desc" = "asc") {
  return destinations.slice().sort((a, b) =>
    direction === "asc" ? a.ticket_cost_omr - b.ticket_cost_omr : b.ticket_cost_omr - a.ticket_cost_omr
  );
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

export { getLocalizedRegionLabel, getRegionKey };
export { normalizeDestinations };
