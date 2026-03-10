import type { Destination, InterestProfile } from "@/types/domain";

import {
  budgetLevelToTargetCost,
  centroid,
  clamp01,
  haversineDistanceKm,
  monthDistance,
  normalizeCrowdLevel,
  toUniqueNormalized
} from "@/lib/planner/scoring-utils";

export function scoreCategoryInterestMatch(
  destinationCategories: string[],
  preferredThemes: string[]
): number {
  const destinationSet = new Set(toUniqueNormalized(destinationCategories));
  const preferredThemeSet = new Set(toUniqueNormalized(preferredThemes));

  if (preferredThemeSet.size === 0) {
    return 0.5;
  }
  if (destinationSet.size === 0) {
    return 0;
  }

  const overlapCount = Array.from(preferredThemeSet).filter((theme) =>
    destinationSet.has(theme)
  ).length;
  return clamp01(overlapCount / preferredThemeSet.size);
}

export function scoreSeasonFit(recommendedMonths: number[], travelMonth?: number): number {
  if (!travelMonth) {
    return 0.5;
  }
  if (recommendedMonths.length === 0) {
    return 0.5;
  }

  const validMonths = recommendedMonths.filter(
    (month) => Number.isInteger(month) && month >= 1 && month <= 12
  );
  if (validMonths.length === 0) {
    return 0.5;
  }

  const nearestDistance = validMonths.reduce((best, month) => {
    const distance = monthDistance(month, travelMonth);
    return Math.min(best, distance);
  }, Number.POSITIVE_INFINITY);

  return clamp01(1 - nearestDistance / 6);
}

export function normalizeCrowdPressure(crowdLevel: number): number {
  return normalizeCrowdLevel(crowdLevel);
}

export function normalizeCostAgainstBudget(
  destinationTicketCostOmr: number,
  budgetLevel: InterestProfile["budget"]
): number {
  const budgetTargetCost = budgetLevelToTargetCost(budgetLevel);

  if (destinationTicketCostOmr <= budgetTargetCost) {
    return clamp01(1 - (budgetTargetCost - destinationTicketCostOmr) / Math.max(budgetTargetCost, 1) * 0.1);
  }

  return clamp01(1 - (destinationTicketCostOmr - budgetTargetCost) / Math.max(budgetTargetCost, 1));
}

export function scoreDiversityGain(
  candidate: Pick<Destination, "region" | "categories">,
  selected: Array<Pick<Destination, "region" | "categories">>
): number {
  if (selected.length === 0) {
    return 1;
  }

  const seenRegions = new Set(selected.map((destination) => destination.region.en));
  const seenTags = new Set(
    selected.flatMap((destination) => toUniqueNormalized(destination.categories))
  );

  const normalizedCandidateTags = toUniqueNormalized(candidate.categories);
  const newTagCount = normalizedCandidateTags.filter((tag) => !seenTags.has(tag)).length;
  const tagNovelty = normalizedCandidateTags.length === 0 ? 0 : newTagCount / normalizedCandidateTags.length;
  const regionNovelty = seenRegions.has(candidate.region.en) ? 0 : 1;

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
