import type { DatasetDestination } from "@/types/dataset";

import {
  getByCategory,
  getByRegion,
  getRegionKey,
  sortByCost,
  sortByCrowd
} from "@/lib/data/selectors";

export type DiscoverySort = "crowd_asc" | "cost_asc" | "duration_asc";

export interface DiscoveryFilters {
  region?: string;
  category?: string;
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
  const filtered = getByCategory(getByRegion(destinations, filters.region), filters.category);

  const sort = filters.sort ?? "crowd_asc";

  if (sort === "duration_asc") {
    return filtered
      .slice()
      .sort((a, b) => a.avg_visit_duration_minutes - b.avg_visit_duration_minutes);
  }

  if (sort === "cost_asc") {
    return sortByCost(filtered);
  }

  return sortByCrowd(filtered);
}

export function parseDiscoveryFilters(
  searchParams?: Record<string, string | string[] | undefined>
): DiscoveryFilters {
  const region = pickOne(searchParams?.region);
  const category = pickOne(searchParams?.category) ?? pickOne(searchParams?.tag);
  const sortRaw = pickOne(searchParams?.sort);

  const sort =
    sortRaw === "duration_asc" ||
    sortRaw === "cost_asc" ||
    sortRaw === "crowd_asc"
      ? sortRaw
      : undefined;

  return { region, category, sort };
}

function pickOne(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}
