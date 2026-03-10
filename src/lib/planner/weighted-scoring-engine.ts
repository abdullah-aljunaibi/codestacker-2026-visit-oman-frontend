/**
 * Deterministic VO-P3 multi-objective scoring for planner candidates.
 */
import type { Destination, InterestProfile } from "@/types/domain";

import {
  buildPrimitiveScores,
  type MultiObjectivePrimitiveScores
} from "@/lib/planner/scoring-primitives";
import { haversineDistanceKm } from "@/lib/planner/scoring-utils";

export type WeightedScoreMetricKey =
  | "interestMatch"
  | "seasonFit"
  | "normCrowd"
  | "normCost"
  | "detourPenalty"
  | "diversityGain";

export type WeightedScoreWeights = Record<WeightedScoreMetricKey, number>;

export interface WeightedScoringConfig {
  version: string;
  precisionDigits: number;
  weights: WeightedScoreWeights;
}

export interface WeightedScoreContribution {
  metric: WeightedScoreMetricKey;
  rawScore: number;
  normalizedScore: number;
  weight: number;
  weightedScore: number;
  reasonCode: string;
  direction: "benefit" | "penalty";
}

export interface WeightedScoreSignals {
  strengths: string[];
  tradeoffs: string[];
}

export interface WeightedScoreBreakdown {
  destinationSlug: string;
  configVersion: string;
  totalScore: number;
  primitives: MultiObjectivePrimitiveScores;
  normalized: MultiObjectivePrimitiveScores;
  weights: WeightedScoreWeights;
  contributions: WeightedScoreContribution[];
  topContributors: WeightedScoreContribution[];
  signals: WeightedScoreSignals;
}

export interface NormalizationContext {
  configVersion: string;
  costRange: {
    min: number;
    max: number;
  };
  maxPairwiseDistanceKm: number;
}

export interface WeightedScoringInput {
  destination: Destination;
  profile: InterestProfile;
  normalizationContext: NormalizationContext;
  selectedDestinations: Destination[];
  config?: Partial<WeightedScoringConfig>;
}

const metricOrder: WeightedScoreMetricKey[] = [
  "interestMatch",
  "seasonFit",
  "normCrowd",
  "normCost",
  "detourPenalty",
  "diversityGain"
];

const penaltyMetrics = new Set<WeightedScoreMetricKey>([
  "normCrowd",
  "normCost",
  "detourPenalty"
]);

export const defaultWeightedScoringConfig: WeightedScoringConfig = {
  version: "vo-p3-v1",
  precisionDigits: 6,
  weights: {
    interestMatch: 0.34,
    seasonFit: 0.18,
    normCrowd: 0.1,
    normCost: 0.14,
    detourPenalty: 0.12,
    diversityGain: 0.12
  }
};

function roundDeterministic(value: number, digits: number): number {
  const safeDigits = Math.max(0, Math.min(10, Math.floor(digits)));
  const factor = 10 ** safeDigits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function mergeConfig(config?: Partial<WeightedScoringConfig>): WeightedScoringConfig {
  return {
    version: config?.version ?? defaultWeightedScoringConfig.version,
    precisionDigits: config?.precisionDigits ?? defaultWeightedScoringConfig.precisionDigits,
    weights: {
      ...defaultWeightedScoringConfig.weights,
      ...(config?.weights ?? {})
    }
  };
}

function buildReasonCode(metric: WeightedScoreMetricKey): string {
  if (metric === "interestMatch") return "interest_match";
  if (metric === "seasonFit") return "season_fit";
  if (metric === "normCrowd") return "crowd_penalty";
  if (metric === "normCost") return "cost_penalty";
  if (metric === "detourPenalty") return "detour_penalty";
  return "diversity_gain";
}

function buildTopContributors(
  contributions: WeightedScoreContribution[]
): WeightedScoreContribution[] {
  return contributions
    .slice()
    .sort((a, b) => {
      const impactDelta = Math.abs(b.weightedScore) - Math.abs(a.weightedScore);
      if (impactDelta !== 0) {
        return impactDelta;
      }
      if (b.weightedScore !== a.weightedScore) {
        return b.weightedScore - a.weightedScore;
      }
      return a.metric.localeCompare(b.metric);
    })
    .slice(0, 3);
}

function toSignals(
  contributions: WeightedScoreContribution[],
  topContributors: WeightedScoreContribution[]
): WeightedScoreSignals {
  const strengths = topContributors
    .filter((item) => item.direction === "benefit" && item.normalizedScore > 0)
    .map((item) => item.reasonCode);

  const tradeoffs = contributions
    .filter((item) => item.direction === "penalty" && item.normalizedScore >= 0.35)
    .sort((a, b) => {
      if (b.normalizedScore !== a.normalizedScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      return a.metric.localeCompare(b.metric);
    })
    .map((item) => item.reasonCode)
    .slice(0, 3);

  return {
    strengths,
    tradeoffs
  };
}

function computeMaxPairwiseDistanceKm(destinations: Destination[]): number {
  if (destinations.length <= 1) {
    return 0;
  }

  let maxDistanceKm = 0;
  for (let left = 0; left < destinations.length; left += 1) {
    for (let right = left + 1; right < destinations.length; right += 1) {
      const pairDistanceKm = haversineDistanceKm(
        destinations[left].coordinates,
        destinations[right].coordinates
      );
      if (pairDistanceKm > maxDistanceKm) {
        maxDistanceKm = pairDistanceKm;
      }
    }
  }

  return maxDistanceKm;
}

export function buildNormalizationContext(input: {
  destinations: Destination[];
  config?: Partial<WeightedScoringConfig>;
}): NormalizationContext {
  const config = mergeConfig(input.config);
  const costs = input.destinations.map((destination) => destination.ticket_cost_omr);
  const minCost = costs.length > 0 ? Math.min(...costs) : 0;
  const maxCost = costs.length > 0 ? Math.max(...costs) : 0;

  return {
    configVersion: config.version,
    costRange: {
      min: roundDeterministic(minCost, config.precisionDigits),
      max: roundDeterministic(maxCost, config.precisionDigits)
    },
    maxPairwiseDistanceKm: roundDeterministic(
      computeMaxPairwiseDistanceKm(input.destinations),
      config.precisionDigits
    )
  };
}

export function scoreDestinationWeighted(input: WeightedScoringInput): WeightedScoreBreakdown {
  const config = mergeConfig(input.config);
  const precision = config.precisionDigits;
  const primitives = buildPrimitiveScores(input.destination, input.profile, {
    costRange: input.normalizationContext.costRange,
    maxPairwiseDistanceKm: input.normalizationContext.maxPairwiseDistanceKm,
    selectedDestinations: input.selectedDestinations
  });

  const normalized = metricOrder.reduce((acc, metric) => {
    acc[metric] = roundDeterministic(primitives[metric], precision);
    return acc;
  }, {} as MultiObjectivePrimitiveScores);

  const contributions: WeightedScoreContribution[] = metricOrder.map((metric) => {
    const rawScore = roundDeterministic(primitives[metric], precision);
    const normalizedScore = normalized[metric];
    const weight = roundDeterministic(config.weights[metric], precision);
    const direction: WeightedScoreContribution["direction"] = penaltyMetrics.has(metric)
      ? "penalty"
      : "benefit";
    const weightedScore = roundDeterministic(
      normalizedScore * weight * (direction === "penalty" ? -1 : 1),
      precision
    );

    return {
      metric,
      rawScore,
      normalizedScore,
      weight,
      weightedScore,
      reasonCode: buildReasonCode(metric),
      direction
    };
  });

  const totalScore = roundDeterministic(
    contributions.reduce((sum, contribution) => sum + contribution.weightedScore, 0),
    precision
  );
  const topContributors = buildTopContributors(contributions);

  return {
    destinationSlug: input.destination.slug,
    configVersion: config.version,
    totalScore,
    primitives: normalized,
    normalized,
    weights: metricOrder.reduce((acc, metric) => {
      acc[metric] = roundDeterministic(config.weights[metric], precision);
      return acc;
    }, {} as WeightedScoreWeights),
    contributions,
    topContributors,
    signals: toSignals(contributions, topContributors)
  };
}
