/**
 * Deterministic primitive scoring functions for normalized planner objectives.
 */
import type { Destination, InterestProfile } from "@/types/domain";

import {
  budgetLevelToTargetCost,
  clamp01,
  monthDistance,
  normalizeCrowdLevel,
  toUniqueNormalized
} from "@/lib/planner/scoring-utils";

export interface MultiObjectivePrimitiveScores {
  categoryMatch: number;
  seasonMatch: number;
  budgetMatch: number;
  crowdPreference: number;
  durationFit: number;
}

const intensityCrowdTargets: Record<InterestProfile["travelIntensity"], number> = {
  relaxed: 0.2,
  balanced: 0.45,
  packed: 0.7
};

const intensityStopTargets: Record<InterestProfile["travelIntensity"], number> = {
  relaxed: 1.5,
  balanced: 2,
  packed: 2.5
};

export function scoreCategoryMatch(
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

export function scoreSeasonMatch(recommendedMonths: number[], travelMonth?: number): number {
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

export function scoreBudgetMatch(
  destinationTicketCostOmr: number,
  budgetLevel: InterestProfile["budget"]
): number {
  const budgetTargetCost = budgetLevelToTargetCost(budgetLevel);
  const maxDeviation = Math.max(budgetTargetCost, 1);
  const deviation = Math.abs(destinationTicketCostOmr - budgetTargetCost);

  return clamp01(1 - deviation / maxDeviation);
}

export function scoreCrowdPreference(
  crowdLevel: number,
  travelIntensity: InterestProfile["travelIntensity"]
): number {
  const normalizedCrowd = normalizeCrowdLevel(crowdLevel);
  const targetCrowd = intensityCrowdTargets[travelIntensity];

  return clamp01(1 - Math.abs(normalizedCrowd - targetCrowd));
}

export function scoreDurationFit(
  recommendedDurationHours: number,
  tripDurationDays: number,
  travelIntensity: InterestProfile["travelIntensity"]
): number {
  const stopTarget = intensityStopTargets[travelIntensity];
  const effectiveTripDays = Math.max(1, tripDurationDays);
  const targetHoursPerStop = 8 / stopTarget;
  const tripCompression = Math.max(0.75, Math.min(1.15, 4 / effectiveTripDays));
  const adjustedTargetHours = targetHoursPerStop * tripCompression;
  const tolerance = Math.max(1.5, adjustedTargetHours);
  const deviation = Math.abs(recommendedDurationHours - adjustedTargetHours);

  return clamp01(1 - deviation / tolerance);
}

export function buildPrimitiveScores(
  destination: Destination,
  profile: InterestProfile
): MultiObjectivePrimitiveScores {
  return {
    categoryMatch: scoreCategoryMatch(destination.categories, profile.preferredCategories),
    seasonMatch: scoreSeasonMatch(destination.idealVisitMonths, profile.travelMonth),
    budgetMatch: scoreBudgetMatch(destination.ticket_cost_omr, profile.budget),
    crowdPreference: scoreCrowdPreference(destination.crowd_level, profile.travelIntensity),
    durationFit: scoreDurationFit(
      destination.recommendedDurationHours,
      profile.tripDurationDays,
      profile.travelIntensity
    )
  };
}
