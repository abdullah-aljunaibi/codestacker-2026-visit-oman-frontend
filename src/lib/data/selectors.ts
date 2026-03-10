import type { DatasetDestination, Locale } from "@/types/dataset";

import {
  getLocalizedRegionLabel,
  getRegionKey,
  normalizeDestinations
} from "@/lib/data/normalize-destinations";
import { getCategoryLabel, getMonthLabel } from "@/lib/i18n/messages";

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

export function getCategoryOptions(destinations: DatasetDestination[], locale: Locale) {
  return Array.from(new Set(destinations.flatMap((destination) => destination.categories)))
    .map((value) => ({ value, label: getCategoryLabel(value, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getSeasonOptions(locale: Locale) {
  return Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    return {
      value: String(value),
      label: getMonthLabel(value, locale)
    };
  });
}

export function getCategorySpotlights(
  destinations: DatasetDestination[],
  locale: Locale,
  limit = 6
) {
  return getCategoryOptions(destinations, locale)
    .map((category) => {
      const categoryDestinations = getByCategory(destinations, category.value);
      const featured = sortByCrowd(sortByCost(categoryDestinations)).slice(0, 3);

      return {
        ...category,
        count: categoryDestinations.length,
        featured
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}

export function getFeaturedDestinations(destinations: DatasetDestination[], limit = 4) {
  return destinations
    .slice()
    .sort((a, b) => {
      if (a.crowd_level !== b.crowd_level) {
        return a.crowd_level - b.crowd_level;
      }
      if (a.ticket_cost_omr !== b.ticket_cost_omr) {
        return a.ticket_cost_omr - b.ticket_cost_omr;
      }
      return b.avg_visit_duration_minutes - a.avg_visit_duration_minutes;
    })
    .slice(0, limit);
}

export function getRegionHighlights(destinations: DatasetDestination[], locale: Locale, limit = 4) {
  return getRegionOptions(destinations, locale)
    .map((region) => {
      const regionDestinations = getByRegion(destinations, region.value);
      const sample = sortByCrowd(sortByCost(regionDestinations))[0];

      return {
        ...region,
        count: regionDestinations.length,
        sample
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
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
