import type { Destination } from "@/types/domain";

export type DiscoverySort = "popularity_desc" | "cost_asc" | "duration_asc";

export interface DiscoveryFilters {
  region?: string;
  tag?: string;
  budget?: Destination["costLevel"];
  sort?: DiscoverySort;
}

const COST_WEIGHT: Record<Destination["costLevel"], number> = {
  low: 1,
  medium: 2,
  high: 3
};

export function getRegions(destinations: Destination[]): string[] {
  return Array.from(new Set(destinations.map((d) => d.region))).sort();
}

export function getTags(destinations: Destination[]): string[] {
  return Array.from(new Set(destinations.flatMap((d) => d.tags))).sort();
}

export function applyDiscoveryQuery(
  destinations: Destination[],
  filters: DiscoveryFilters
): Destination[] {
  const filtered = destinations.filter((destination) => {
    if (filters.region && destination.region !== filters.region) {
      return false;
    }

    if (filters.tag && !destination.tags.includes(filters.tag)) {
      return false;
    }

    if (filters.budget && destination.costLevel !== filters.budget) {
      return false;
    }

    return true;
  });

  const sort = filters.sort ?? "popularity_desc";

  return filtered.sort((a, b) => {
    if (sort === "duration_asc") {
      return a.recommendedDurationHours - b.recommendedDurationHours;
    }

    if (sort === "cost_asc") {
      return COST_WEIGHT[a.costLevel] - COST_WEIGHT[b.costLevel];
    }

    return b.popularityScore - a.popularityScore;
  });
}

export function parseDiscoveryFilters(
  searchParams?: Record<string, string | string[] | undefined>
): DiscoveryFilters {
  const region = pickOne(searchParams?.region);
  const tag = pickOne(searchParams?.tag);
  const budgetRaw = pickOne(searchParams?.budget);
  const sortRaw = pickOne(searchParams?.sort);

  const budget =
    budgetRaw === "low" || budgetRaw === "medium" || budgetRaw === "high"
      ? budgetRaw
      : undefined;

  const sort =
    sortRaw === "duration_asc" ||
    sortRaw === "cost_asc" ||
    sortRaw === "popularity_desc"
      ? sortRaw
      : undefined;

  return { region, tag, budget, sort };
}

function pickOne(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}
