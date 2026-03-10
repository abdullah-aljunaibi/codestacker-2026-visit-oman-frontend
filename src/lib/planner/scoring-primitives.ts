/**
 * Deterministic primitive scoring functions for the VO-P3 normalized model.
 */
import type { Destination, InterestProfile } from "@/types/domain";

import {
  clamp01,
  haversineDistanceKm,
  monthDistance,
  normalizeCrowdLevel,
  normalizeTicketCost,
  toUniqueNormalized
} from "@/lib/planner/scoring-utils";

export interface MultiObjectivePrimitiveScores {
  interestMatch: number;
  seasonFit: number;
  normCrowd: number;
  normCost: number;
  detourPenalty: number;
  diversityGain: number;
}

export interface PrimitiveScoringContext {
  costRange: {
    min: number;
    max: number;
  };
  maxPairwiseDistanceKm: number;
  selectedDestinations: Destination[];
}

function roundMonth(month: number | undefined): number | null {
  if (!Number.isFinite(month)) {
    return null;
  }

  const safeMonth = month as number;
  return Math.max(1, Math.min(12, Math.round(safeMonth)));
}

export function scoreInterestMatch(
  destinationCategories: string[],
  preferredThemes: string[]
): number {
  const destinationSet = new Set(toUniqueNormalized(destinationCategories));
  const preferredThemeSet = new Set(toUniqueNormalized(preferredThemes));
  const union = new Set([...destinationSet, ...preferredThemeSet]);

  if (union.size === 0) {
    return 0;
  }

  let overlapCount = 0;
  preferredThemeSet.forEach((theme) => {
    if (destinationSet.has(theme)) {
      overlapCount += 1;
    }
  });

  return clamp01(overlapCount / union.size);
}

export function scoreSeasonFit(recommendedMonths: number[], travelMonth?: number): number {
  const normalizedTravelMonth = roundMonth(travelMonth);
  const validMonths = recommendedMonths.filter(
    (month) => Number.isInteger(month) && month >= 1 && month <= 12
  );

  if (normalizedTravelMonth === null || validMonths.length === 0) {
    return 0;
  }

  if (validMonths.includes(normalizedTravelMonth)) {
    return 1;
  }

  const circularDistance = validMonths.reduce((best, month) => {
    const distance = monthDistance(month, normalizedTravelMonth);
    return Math.min(best, distance);
  }, Number.POSITIVE_INFINITY);

  return clamp01(1 - circularDistance / 6);
}

export function scoreNormCrowd(crowdLevel: number): number {
  return normalizeCrowdLevel(crowdLevel);
}

export function scoreNormCost(
  destinationTicketCostOmr: number,
  costRange: PrimitiveScoringContext["costRange"]
): number {
  return normalizeTicketCost(destinationTicketCostOmr, costRange.min, costRange.max);
}

function incrementalInsertionCostKm(
  destination: Destination,
  selectedDestinations: Destination[]
): number {
  if (selectedDestinations.length === 0) {
    return 0;
  }

  if (selectedDestinations.length === 1) {
    return haversineDistanceKm(selectedDestinations[0].coordinates, destination.coordinates);
  }

  let bestInsertionCost = Math.min(
    haversineDistanceKm(destination.coordinates, selectedDestinations[0].coordinates),
    haversineDistanceKm(
      selectedDestinations[selectedDestinations.length - 1].coordinates,
      destination.coordinates
    )
  );

  for (let index = 1; index < selectedDestinations.length; index += 1) {
    const previous = selectedDestinations[index - 1];
    const next = selectedDestinations[index];
    const insertionCost = haversineDistanceKm(previous.coordinates, destination.coordinates)
      + haversineDistanceKm(destination.coordinates, next.coordinates)
      - haversineDistanceKm(previous.coordinates, next.coordinates);

    bestInsertionCost = Math.min(bestInsertionCost, insertionCost);
  }

  return Math.max(0, bestInsertionCost);
}

export function scoreDetourPenalty(
  destination: Destination,
  selectedDestinations: Destination[],
  maxPairwiseDistanceKm: number
): number {
  if (selectedDestinations.length === 0 || maxPairwiseDistanceKm <= 0) {
    return 0;
  }

  const insertionCost = incrementalInsertionCostKm(destination, selectedDestinations);
  return clamp01(insertionCost / (maxPairwiseDistanceKm * 2));
}

export function scoreDiversityGain(
  destinationCategories: string[],
  selectedCategories: string[]
): number {
  const destinationSet = new Set(toUniqueNormalized(destinationCategories));
  if (destinationSet.size === 0) {
    return 0;
  }

  const selectedSet = new Set(toUniqueNormalized(selectedCategories));
  let newCategoryCount = 0;
  destinationSet.forEach((category) => {
    if (!selectedSet.has(category)) {
      newCategoryCount += 1;
    }
  });

  return clamp01(newCategoryCount / destinationSet.size);
}

export function buildPrimitiveScores(
  destination: Destination,
  profile: InterestProfile,
  context: PrimitiveScoringContext
): MultiObjectivePrimitiveScores {
  return {
    interestMatch: scoreInterestMatch(destination.categories, profile.preferredCategories),
    seasonFit: scoreSeasonFit(destination.recommended_months, profile.travelMonth),
    normCrowd: scoreNormCrowd(destination.crowd_level),
    normCost: scoreNormCost(destination.ticket_cost_omr, context.costRange),
    detourPenalty: scoreDetourPenalty(
      destination,
      context.selectedDestinations,
      context.maxPairwiseDistanceKm
    ),
    diversityGain: scoreDiversityGain(
      destination.categories,
      context.selectedDestinations.flatMap((selectedDestination) => selectedDestination.categories)
    )
  };
}
