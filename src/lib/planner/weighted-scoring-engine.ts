/**
 * Deterministic normalized multi-objective scoring for planner candidates.
 */
import type { Destination, InterestProfile } from "@/types/domain";

import {
  buildPrimitiveScores,
  type MultiObjectivePrimitiveScores
} from "@/lib/planner/scoring-primitives";
import { clamp01 } from "@/lib/planner/scoring-utils";

export type WeightedScoreMetricKey =
  | "categoryMatch"
  | "seasonMatch"
  | "budgetMatch"
  | "crowdPreference"
  | "durationFit";

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
  normalizedWeights: WeightedScoreWeights;
  contributions: WeightedScoreContribution[];
  signals: WeightedScoreSignals;
}

export interface NormalizationContext {
  configVersion: string;
  ranges: Record<WeightedScoreMetricKey, { min: number; max: number }>;
}

export interface WeightedScoringInput {
  destination: Destination;
  profile: InterestProfile;
  normalizationContext: NormalizationContext;
  config?: Partial<WeightedScoringConfig>;
}

const metricOrder: WeightedScoreMetricKey[] = [
  "categoryMatch",
  "seasonMatch",
  "budgetMatch",
  "crowdPreference",
  "durationFit"
];

export const defaultWeightedScoringConfig: WeightedScoringConfig = {
  version: "phase-4b-v2",
  precisionDigits: 6,
  weights: {
    categoryMatch: 0.32,
    seasonMatch: 0.18,
    budgetMatch: 0.2,
    crowdPreference: 0.12,
    durationFit: 0.18
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
    precisionDigits: config?.precisionDigits ?? defaultWeightedScoringConfig.precisionDigits,
    weights: {
      ...defaultWeightedScoringConfig.weights,
      ...(config?.weights ?? {})
    }
  };
}

function normalizePrimitive(
  rawValue: number,
  range: { min: number; max: number }
): number {
  if (range.max <= range.min) {
    return rawValue >= range.max ? 1 : 0;
  }

  return clamp01((rawValue - range.min) / (range.max - range.min));
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
  if (metric === "categoryMatch") return "category_match";
  if (metric === "seasonMatch") return "season_match";
  if (metric === "budgetMatch") return "budget_match";
  if (metric === "crowdPreference") return "crowd_preference";
  return "duration_fit";
}

export function buildNormalizationContext(input: {
  destinations: Destination[];
  profile: InterestProfile;
  config?: Partial<WeightedScoringConfig>;
}): NormalizationContext {
  const config = mergeConfig(input.config);
  const rawScores = input.destinations.map((destination) => buildPrimitiveScores(destination, input.profile));

  const ranges = metricOrder.reduce((acc, metric) => {
    const values = rawScores.map((score) => score[metric]);
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 1;
    acc[metric] = {
      min: roundDeterministic(min, config.precisionDigits),
      max: roundDeterministic(max, config.precisionDigits)
    };
    return acc;
  }, {} as NormalizationContext["ranges"]);

  return {
    configVersion: config.version,
    ranges
  };
}

export function scoreDestinationWeighted(input: WeightedScoringInput): WeightedScoreBreakdown {
  const config = mergeConfig(input.config);
  const normalizedWeights = normalizeWeights(config.weights);
  const precision = config.precisionDigits;
  const primitives = buildPrimitiveScores(input.destination, input.profile);

  const normalized = metricOrder.reduce((acc, metric) => {
    acc[metric] = roundDeterministic(
      normalizePrimitive(primitives[metric], input.normalizationContext.ranges[metric]),
      precision
    );
    return acc;
  }, {} as MultiObjectivePrimitiveScores);

  const contributions = metricOrder.map((metric) => {
    const rawScore = roundDeterministic(primitives[metric], precision);
    const normalizedScore = normalized[metric];
    const weight = roundDeterministic(normalizedWeights[metric], precision);

    return {
      metric,
      rawScore,
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
    primitives: metricOrder.reduce((acc, metric) => {
      acc[metric] = roundDeterministic(primitives[metric], precision);
      return acc;
    }, {} as MultiObjectivePrimitiveScores),
    normalized,
    normalizedWeights: metricOrder.reduce((acc, metric) => {
      acc[metric] = roundDeterministic(normalizedWeights[metric], precision);
      return acc;
    }, {} as WeightedScoreWeights),
    contributions,
    signals: toSignals(contributions)
  };
}
