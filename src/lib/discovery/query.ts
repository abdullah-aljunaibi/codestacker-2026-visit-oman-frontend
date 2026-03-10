import type { DatasetDestination } from "@/types/dataset";

import { getRegionKey, minutesToHours } from "@/lib/data/normalize-destinations";

export type DiscoverySort = "crowd_asc" | "cost_asc" | "duration_asc";

export interface DiscoveryFilters {
  region?: string;
  tag?: string;
  sort?: DiscoverySort;
}

export function getRegions(destinations: DatasetDestination[]): string[] {
  return Array.from(new Set(destinations.map((destination) => getRegionKey(destination)))).sort();
}

export function getTags(destinations: DatasetDestination[]): string[] {
  return Array.from(new Set(destinations.flatMap((destination) => destination.categories))).sort();
}

export function applyDiscoveryQuery(
  destinations: DatasetDestination[],
  filters: DiscoveryFilters
): DatasetDestination[] {
  const filtered = destinations.filter((destination) => {
    if (filters.region && getRegionKey(destination) !== filters.region) {
      return false;
    }

    if (filters.tag && !destination.categories.includes(filters.tag)) {
      return false;
    }

    return true;
  });

  const sort = filters.sort ?? "crowd_asc";

  return filtered.sort((a, b) => {
    if (sort === "duration_asc") {
      return a.avg_visit_duration_minutes - b.avg_visit_duration_minutes;
    }

    if (sort === "cost_asc") {
      return a.ticket_cost_omr - b.ticket_cost_omr;
    }

    return a.crowd_level - b.crowd_level;
  });
}

export function parseDiscoveryFilters(
  searchParams?: Record<string, string | string[] | undefined>
): DiscoveryFilters {
  const region = pickOne(searchParams?.region);
  const tag = pickOne(searchParams?.tag);
  const sortRaw = pickOne(searchParams?.sort);

  const sort =
    sortRaw === "duration_asc" ||
    sortRaw === "cost_asc" ||
    sortRaw === "crowd_asc"
      ? sortRaw
      : undefined;

  return { region, tag, sort };
}

function pickOne(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}
