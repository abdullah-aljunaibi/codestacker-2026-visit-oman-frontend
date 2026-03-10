import type { DatasetDestination } from "@/types/dataset";
import type { InterestProfile } from "@/types/planner";

import { getRegionKey, minutesToHours } from "@/lib/data/normalize-destinations";

import {
  defaultWeightedScoringConfig,
  scoreDestinationWeighted,
  type WeightedScoreBreakdown
} from "@/lib/planner/weighted-scoring-engine";

export type CandidateDecision = "selected" | "waitlist" | "excluded";

export interface RankedCandidate {
  rank: number;
  destination: DatasetDestination;
  totalScore: number;
  scoreBreakdown: WeightedScoreBreakdown;
  decision: CandidateDecision;
  selectionReasons: string[];
  exclusionReasons: string[];
}

export interface PlannerHandoffRouteCandidate {
  slug: string;
  rank: number;
  score: number;
  region: string;
  coordinates: DatasetDestination["coordinates"];
  recommendedDurationHours: number;
  strengths: string[];
  tradeoffs: string[];
  reasonCodes: string[];
}

export interface PlannerPhase4CHandoff {
  handoffVersion: string;
  planningContextId: string;
  datasetVersion: string;
  scoringConfigVersion: string;
  profile: InterestProfile;
  selectionPolicy: {
    targetCandidateCount: number;
    minViableScore: number;
    paceMultiplier: number;
  };
  selectedCandidateSlugs: string[];
  waitlistCandidateSlugs: string[];
  rankedCandidates: Array<{
    slug: string;
    rank: number;
    score: number;
    decision: CandidateDecision;
    selectionReasons: string[];
    exclusionReasons: string[];
    scoreBreakdown: WeightedScoreBreakdown;
  }>;
  routeGenerationInput: {
    selectedCandidates: PlannerHandoffRouteCandidate[];
    waitlistCandidates: PlannerHandoffRouteCandidate[];
  };
}

export interface CandidateRankingResult {
  rankedCandidates: RankedCandidate[];
  selectedCandidates: RankedCandidate[];
  waitlistCandidates: RankedCandidate[];
  excludedCandidates: RankedCandidate[];
  handoff: PlannerPhase4CHandoff;
}

export interface CandidateRankingInput {
  profile: InterestProfile;
  destinations: DatasetDestination[];
  seedDestinationSlugs?: string[];
  datasetVersion: string;
}

interface CandidateSelectionConfig {
  version: string;
  minCandidateCount: number;
  maxCandidateCount: number;
  minViableScore: number;
  paceMultipliers: Record<InterestProfile["pace"], number>;
}

const defaultSelectionConfig: CandidateSelectionConfig = {
  version: "phase-4c-v1",
  minCandidateCount: 3,
  maxCandidateCount: 10,
  minViableScore: 0.4,
  paceMultipliers: {
    relaxed: 1,
    balanced: 1.25,
    packed: 1.5
  }
};

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function uniqueStableSlugs(slugs: string[]): string[] {
  const seen = new Set<string>();
  return slugs.filter((slug) => {
    if (seen.has(slug)) {
      return false;
    }
    seen.add(slug);
    return true;
  });
}

function reasonCodesFromBreakdown(scoreBreakdown: WeightedScoreBreakdown): string[] {
  return scoreBreakdown.contributions
    .slice()
    .sort((a, b) => {
      if (b.weightedScore !== a.weightedScore) {
        return b.weightedScore - a.weightedScore;
      }
      return a.metric.localeCompare(b.metric);
    })
    .slice(0, 3)
    .map((contribution) => contribution.reasonCode);
}

function buildRouteCandidate(candidate: RankedCandidate): PlannerHandoffRouteCandidate {
  return {
    slug: candidate.destination.slug,
    rank: candidate.rank,
    score: candidate.totalScore,
    region: getRegionKey(candidate.destination),
    coordinates: candidate.destination.coordinates,
    recommendedDurationHours: minutesToHours(candidate.destination.avg_visit_duration_minutes),
    strengths: candidate.scoreBreakdown.signals.strengths,
    tradeoffs: candidate.scoreBreakdown.signals.tradeoffs,
    reasonCodes: reasonCodesFromBreakdown(candidate.scoreBreakdown)
  };
}

function hashDeterministic(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return `ctx_${(hash >>> 0).toString(16)}`;
}

function buildPlanningContextId(input: {
  datasetVersion: string;
  profile: InterestProfile;
  seedDestinationSlugs: string[];
}): string {
  return hashDeterministic(
    JSON.stringify({
      datasetVersion: input.datasetVersion,
      profile: {
        themes: [...input.profile.themes].sort(),
        tripDays: input.profile.tripDays,
        pace: input.profile.pace,
        budget: input.profile.budget,
        travelMonth: input.profile.travelMonth ?? null
      },
      seedDestinationSlugs: [...input.seedDestinationSlugs].sort()
    })
  );
}

export function rankCandidatesForPlanner(input: CandidateRankingInput): CandidateRankingResult {
  const seedSlugs = uniqueStableSlugs(input.seedDestinationSlugs ?? []);
  const seedSlugSet = new Set(seedSlugs);

  const seedDestinations = input.destinations
    .filter((destination) => seedSlugSet.has(destination.slug))
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const scored = input.destinations
    .map((destination) => {
      const selectedContext = seedDestinations.filter((item) => item.slug !== destination.slug);
      const scoreBreakdown = scoreDestinationWeighted({
        destination,
        profile: input.profile,
        selectedDestinations: selectedContext,
        config: {
          version: defaultWeightedScoringConfig.version
        }
      });

      return {
        destination,
        totalScore: scoreBreakdown.totalScore,
        scoreBreakdown
      };
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.destination.slug.localeCompare(b.destination.slug);
    });

  const paceMultiplier = defaultSelectionConfig.paceMultipliers[input.profile.pace];
  const targetCandidateCount = clampInteger(
    input.profile.tripDays * paceMultiplier,
    defaultSelectionConfig.minCandidateCount,
    Math.min(defaultSelectionConfig.maxCandidateCount, scored.length)
  );

  const rankedCandidates: RankedCandidate[] = scored.map((item, index) => {
    const rank = index + 1;
    const selectedByRank = rank <= targetCandidateCount;
    const isViable = item.totalScore >= defaultSelectionConfig.minViableScore;

    let decision: CandidateDecision = "excluded";
    if (selectedByRank && isViable) {
      decision = "selected";
    } else if (isViable) {
      decision = "waitlist";
    }

    const selectionReasons = [...item.scoreBreakdown.signals.strengths];
    if (seedSlugSet.has(item.destination.slug)) {
      selectionReasons.push("user_saved_interest");
    }
    if (decision === "selected") {
      selectionReasons.push("top_ranked_candidate");
    }

    const exclusionReasons = [...item.scoreBreakdown.signals.tradeoffs];
    if (!isViable) {
      exclusionReasons.push("below_selection_threshold");
    }
    if (!selectedByRank && decision !== "selected") {
      exclusionReasons.push("rank_outside_target_window");
    }

    return {
      rank,
      destination: item.destination,
      totalScore: item.totalScore,
      scoreBreakdown: item.scoreBreakdown,
      decision,
      selectionReasons: uniqueStableSlugs(selectionReasons),
      exclusionReasons: uniqueStableSlugs(exclusionReasons)
    };
  });

  const selectedCandidates = rankedCandidates.filter((candidate) => candidate.decision === "selected");
  const waitlistCandidates = rankedCandidates.filter((candidate) => candidate.decision === "waitlist");
  const excludedCandidates = rankedCandidates.filter((candidate) => candidate.decision === "excluded");

  const planningContextId = buildPlanningContextId({
    datasetVersion: input.datasetVersion,
    profile: input.profile,
    seedDestinationSlugs: seedSlugs
  });

  return {
    rankedCandidates,
    selectedCandidates,
    waitlistCandidates,
    excludedCandidates,
    handoff: {
      handoffVersion: defaultSelectionConfig.version,
      planningContextId,
      datasetVersion: input.datasetVersion,
      scoringConfigVersion: defaultWeightedScoringConfig.version,
      profile: input.profile,
      selectionPolicy: {
        targetCandidateCount,
        minViableScore: defaultSelectionConfig.minViableScore,
        paceMultiplier
      },
      selectedCandidateSlugs: selectedCandidates.map((candidate) => candidate.destination.slug),
      waitlistCandidateSlugs: waitlistCandidates.map((candidate) => candidate.destination.slug),
      rankedCandidates: rankedCandidates.map((candidate) => ({
        slug: candidate.destination.slug,
        rank: candidate.rank,
        score: candidate.totalScore,
        decision: candidate.decision,
        selectionReasons: candidate.selectionReasons,
        exclusionReasons: candidate.exclusionReasons,
        scoreBreakdown: candidate.scoreBreakdown
      })),
      routeGenerationInput: {
        selectedCandidates: selectedCandidates.map(buildRouteCandidate),
        waitlistCandidates: waitlistCandidates.map(buildRouteCandidate)
      }
    }
  };
}
