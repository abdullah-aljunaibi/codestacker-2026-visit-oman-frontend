import type { Destination, InterestProfile } from "@/types/domain";

import {
  centroid,
  clamp01,
  costLevelToOrdinal,
  haversineDistanceKm,
  monthDistance,
  normalizePopularity,
  toUniqueNormalized
} from "@/lib/planner/scoring-utils";

export function scoreCategoryInterestMatch(destinationTags: string[], preferredThemes: string[]): number {
  const destinationSet = new Set(toUniqueNormalized(destinationTags));
  const themeSet = new Set(toUniqueNormalized(preferredThemes));

  if (themeSet.size === 0) {
    return 0.5;
  }
  if (destinationSet.size === 0) {
    return 0;
  }

  const overlapCount = Array.from(themeSet).filter((theme) => destinationSet.has(theme)).length;
  return clamp01(overlapCount / themeSet.size);
}

export function scoreSeasonFit(idealVisitMonths: number[], travelMonth?: number): number {
  if (!travelMonth) {
    return 0.5;
  }
  if (idealVisitMonths.length === 0) {
    return 0.5;
  }

  const validMonths = idealVisitMonths.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
  if (validMonths.length === 0) {
    return 0.5;
  }

  const nearestDistance = validMonths.reduce((best, month) => {
    const distance = monthDistance(month, travelMonth);
    return Math.min(best, distance);
  }, Number.POSITIVE_INFINITY);

  return clamp01(1 - nearestDistance / 6);
}

export function normalizeCrowdPressure(popularityScore: number): number {
  return normalizePopularity(popularityScore);
}

export function normalizeCostAgainstBudget(
  destinationCostLevel: Destination["costLevel"],
  budgetLevel: InterestProfile["budget"]
): number {
  const destinationCost = costLevelToOrdinal(destinationCostLevel);
  const budget = costLevelToOrdinal(budgetLevel);

  if (destinationCost <= budget) {
    return clamp01(1 - (budget - destinationCost) * 0.1);
  }

  return clamp01(1 - (destinationCost - budget) * 0.45);
}

export function scoreDiversityGain(
  candidate: Pick<Destination, "region" | "tags">,
  selected: Array<Pick<Destination, "region" | "tags">>
): number {
  if (selected.length === 0) {
    return 1;
  }

  const seenRegions = new Set(selected.map((destination) => destination.region));
  const seenTags = new Set(
    selected.flatMap((destination) => toUniqueNormalized(destination.tags))
  );

  const normalizedCandidateTags = toUniqueNormalized(candidate.tags);
  const newTagCount = normalizedCandidateTags.filter((tag) => !seenTags.has(tag)).length;
  const tagNovelty = normalizedCandidateTags.length === 0 ? 0 : newTagCount / normalizedCandidateTags.length;
  const regionNovelty = seenRegions.has(candidate.region) ? 0 : 1;

  return clamp01(tagNovelty * 0.7 + regionNovelty * 0.3);
}

export function scoreDetourPenalty(
  candidateCoordinates: Destination["coordinates"],
  selected: Array<Pick<Destination, "coordinates">>,
  softLimitKm = 120
): number {
  if (selected.length === 0) {
    return 0;
  }

  const reference = centroid(selected);
  if (!reference) {
    return 0;
  }

  const distanceKm = haversineDistanceKm(reference, candidateCoordinates);
  const overflow = Math.max(0, distanceKm - softLimitKm);

  return clamp01(overflow / (softLimitKm * 2));
}
