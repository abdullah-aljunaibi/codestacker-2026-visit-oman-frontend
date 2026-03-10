import type { Destination, InterestProfile } from "@/types/domain";

import {
  normalizeCostAgainstBudget,
  normalizeCrowdPressure,
  scoreCategoryInterestMatch,
  scoreDetourPenalty,
  scoreDiversityGain,
  scoreSeasonFit
} from "@/lib/planner/scoring-primitives";
import { clamp01 } from "@/lib/planner/scoring-utils";

export type WeightedScoreMetricKey =
  | "interestMatch"
  | "seasonFit"
  | "crowdComfort"
  | "budgetFit"
  | "diversityGain"
  | "detourEfficiency";

export type WeightedScoreWeights = Record<WeightedScoreMetricKey, number>;

export interface WeightedScoringConfig {
  version: string;
  detourSoftLimitKm: number;
  precisionDigits: number;
  weights: WeightedScoreWeights;
}

export interface WeightedScorePrimitives {
  interestMatch: number;
  seasonFit: number;
  crowdPressure: number;
  budgetFit: number;
  diversityGain: number;
  detourPenalty: number;
}

export interface WeightedScoreNormalized {
  interestMatch: number;
  seasonFit: number;
  crowdComfort: number;
  budgetFit: number;
  diversityGain: number;
  detourEfficiency: number;
}

export interface WeightedScoreContribution {
  metric: WeightedScoreMetricKey;
  rawScore: number;
  normalizedScore: number;
  weight: number;
  weightedScore: number;
  reasonCode: string;
}

export interface WeightedScoreSignals {
  strengths: string[];
  tradeoffs: string[];
}

export interface WeightedScoreBreakdown {
  destinationSlug: string;
  configVersion: string;
  totalScore: number;
  primitives: WeightedScorePrimitives;
  normalized: WeightedScoreNormalized;
  normalizedWeights: WeightedScoreWeights;
  contributions: WeightedScoreContribution[];
  signals: WeightedScoreSignals;
}

export interface WeightedScoringInput {
  destination: Destination;
  profile: InterestProfile;
  selectedDestinations?: Array<Pick<Destination, "region" | "categories" | "coordinates">>;
  config?: Partial<WeightedScoringConfig>;
}

const metricOrder: WeightedScoreMetricKey[] = [
  "interestMatch",
  "seasonFit",
  "crowdComfort",
  "budgetFit",
  "diversityGain",
  "detourEfficiency"
];

// Baseline deterministic weight configuration for Phase 4B.
export const defaultWeightedScoringConfig: WeightedScoringConfig = {
  version: "phase-4b-v1",
  detourSoftLimitKm: 120,
  precisionDigits: 6,
  weights: {
    interestMatch: 0.3,
    seasonFit: 0.15,
    crowdComfort: 0.1,
    budgetFit: 0.2,
    diversityGain: 0.15,
    detourEfficiency: 0.1
  }
};

function roundDeterministic(value: number, digits: number): number {
  const safeDigits = Math.max(0, Math.min(10, Math.floor(digits)));
  const factor = 10 ** safeDigits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeWeights(weights: WeightedScoreWeights): WeightedScoreWeights {
  const sanitized = metricOrder.reduce((acc, key) => {
    const weight = Number.isFinite(weights[key]) ? Math.max(0, weights[key]) : 0;
    acc[key] = weight;
    return acc;
  }, {} as WeightedScoreWeights);

  const total = metricOrder.reduce((sum, key) => sum + sanitized[key], 0);
  if (total <= 0) {
    const uniform = 1 / metricOrder.length;
    return metricOrder.reduce((acc, key) => {
      acc[key] = uniform;
      return acc;
    }, {} as WeightedScoreWeights);
  }

  return metricOrder.reduce((acc, key) => {
    acc[key] = sanitized[key] / total;
    return acc;
  }, {} as WeightedScoreWeights);
}

function mergeConfig(config?: Partial<WeightedScoringConfig>): WeightedScoringConfig {
  return {
    version: config?.version ?? defaultWeightedScoringConfig.version,
    detourSoftLimitKm: config?.detourSoftLimitKm ?? defaultWeightedScoringConfig.detourSoftLimitKm,
    precisionDigits: config?.precisionDigits ?? defaultWeightedScoringConfig.precisionDigits,
    weights: {
      ...defaultWeightedScoringConfig.weights,
      ...(config?.weights ?? {})
    }
  };
}

function toSignals(contributions: WeightedScoreContribution[]): WeightedScoreSignals {
  const strengths = contributions
    .filter((item) => item.normalizedScore >= 0.67)
    .map((item) => item.reasonCode);

  const tradeoffs = contributions
    .filter((item) => item.normalizedScore <= 0.4)
    .map((item) => item.reasonCode);

  return {
    strengths,
    tradeoffs
  };
}

function buildReasonCode(metric: WeightedScoreMetricKey): string {
  if (metric === "interestMatch") return "theme_alignment";
  if (metric === "seasonFit") return "season_match";
  if (metric === "crowdComfort") return "crowd_comfort";
  if (metric === "budgetFit") return "budget_fit";
  if (metric === "diversityGain") return "diversity_gain";
  return "detour_efficiency";
}

export function scoreDestinationWeighted(input: WeightedScoringInput): WeightedScoreBreakdown {
  const config = mergeConfig(input.config);
  const normalizedWeights = normalizeWeights(config.weights);
  const precision = config.precisionDigits;
  const selected = input.selectedDestinations ?? [];

  const primitives: WeightedScorePrimitives = {
    interestMatch: clamp01(
      scoreCategoryInterestMatch(input.destination.categories, input.profile.themes)
    ),
    seasonFit: clamp01(scoreSeasonFit(input.destination.idealVisitMonths, input.profile.travelMonth)),
    crowdPressure: clamp01(normalizeCrowdPressure(input.destination.crowd_level)),
    budgetFit: clamp01(normalizeCostAgainstBudget(input.destination.ticket_cost_omr, input.profile.budget)),
    diversityGain: clamp01(scoreDiversityGain(input.destination, selected)),
    detourPenalty: clamp01(
      scoreDetourPenalty(input.destination.coordinates, selected, config.detourSoftLimitKm)
    )
  };

  const normalized: WeightedScoreNormalized = {
    interestMatch: primitives.interestMatch,
    seasonFit: primitives.seasonFit,
    crowdComfort: clamp01(1 - primitives.crowdPressure),
    budgetFit: primitives.budgetFit,
    diversityGain: primitives.diversityGain,
    detourEfficiency: clamp01(1 - primitives.detourPenalty)
  };

  const contributions = metricOrder.map((metric) => {
    const normalizedScore = roundDeterministic(normalized[metric], precision);
    const weight = roundDeterministic(normalizedWeights[metric], precision);
    return {
      metric,
      rawScore: normalizedScore,
      normalizedScore,
      weight,
      weightedScore: roundDeterministic(normalizedScore * weight, precision),
      reasonCode: buildReasonCode(metric)
    };
  });

  const totalScore = roundDeterministic(
    contributions.reduce((sum, contribution) => sum + contribution.weightedScore, 0),
    precision
  );

  return {
    destinationSlug: input.destination.slug,
    configVersion: config.version,
    totalScore,
    primitives: {
      interestMatch: roundDeterministic(primitives.interestMatch, precision),
      seasonFit: roundDeterministic(primitives.seasonFit, precision),
      crowdPressure: roundDeterministic(primitives.crowdPressure, precision),
      budgetFit: roundDeterministic(primitives.budgetFit, precision),
      diversityGain: roundDeterministic(primitives.diversityGain, precision),
      detourPenalty: roundDeterministic(primitives.detourPenalty, precision)
    },
    normalized: {
      interestMatch: roundDeterministic(normalized.interestMatch, precision),
      seasonFit: roundDeterministic(normalized.seasonFit, precision),
      crowdComfort: roundDeterministic(normalized.crowdComfort, precision),
      budgetFit: roundDeterministic(normalized.budgetFit, precision),
      diversityGain: roundDeterministic(normalized.diversityGain, precision),
      detourEfficiency: roundDeterministic(normalized.detourEfficiency, precision)
    },
    normalizedWeights: {
      interestMatch: roundDeterministic(normalizedWeights.interestMatch, precision),
      seasonFit: roundDeterministic(normalizedWeights.seasonFit, precision),
      crowdComfort: roundDeterministic(normalizedWeights.crowdComfort, precision),
      budgetFit: roundDeterministic(normalizedWeights.budgetFit, precision),
      diversityGain: roundDeterministic(normalizedWeights.diversityGain, precision),
      detourEfficiency: roundDeterministic(normalizedWeights.detourEfficiency, precision)
    },
    contributions,
    signals: toSignals(contributions)
  };
}
