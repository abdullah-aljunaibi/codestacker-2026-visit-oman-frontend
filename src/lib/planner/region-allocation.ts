/**
 * Deterministic bounded-search region allocation with contiguous day blocks.
 */
import type {
  PlannerHandoffRouteCandidate,
  PlannerPhase4CHandoff
} from "@/lib/planner/candidate-ranking";

interface RegionAllocationConfig {
  version: string;
  hoursPerDay: number;
  utilityScoreWeight: number;
  densityWeight: number;
  seasonWeight: number;
  diversityWeight: number;
  poorSeasonFitThreshold: number;
  viableRegionUtilityThreshold: number;
  poorSeasonPenaltyWeight: number;
  transitionPenaltyWeight: number;
  coverageBonusWeight: number;
  balanceBonusWeight: number;
}

export interface RegionAllocationDaySlot {
  dayNumber: number;
  region: string;
}

export interface RegionAllocationBlock {
  region: string;
  startDay: number;
  endDay: number;
  allocatedDays: number;
  rationale: string;
}

export interface RegionAllocationClusterBucket {
  clusterKey: string;
  clusterLabel: string;
  candidateSlugs: string[];
  candidateRanks: number[];
  totalRecommendedHours: number;
  averageCandidateScore: number;
  destinationCount: number;
  notes: string[];
}

export interface RegionAllocationRegionBucket {
  region: string;
  allocatedDays: number;
  candidateSlugs: string[];
  candidateRanks: number[];
  totalRecommendedHours: number;
  totalCandidateScore: number;
  averageCandidateScore: number;
  destinationDensity: number;
  regionSeasonFit: number;
  diversityBonus: number;
  regionUtility: number;
  clusters: RegionAllocationClusterBucket[];
  selectionExplanation: string;
  notes: string[];
}

export interface PlannerPhase5ARegionAllocation {
  allocationVersion: string;
  planningContextId: string;
  sourceHandoffVersion: string;
  datasetVersion: string;
  tripDays: number;
  allocationPolicy: {
    hoursPerDay: number;
    baselinePerRegion: number;
    minimumRegions: number;
    maximumDaysPerRegion: number;
    approach: string;
  };
  regionBuckets: RegionAllocationRegionBucket[];
  regionBlocks: RegionAllocationBlock[];
  dayRegionSequence: RegionAllocationDaySlot[];
  unallocatedRegions: Array<{
    region: string;
    reason: string;
    candidateSlugs: string[];
  }>;
  totalAllocatedDays: number;
}

interface RegionStats {
  region: string;
  candidates: PlannerHandoffRouteCandidate[];
  totalRecommendedHours: number;
  totalCandidateScore: number;
  averageCandidateScore: number;
  destinationDensity: number;
  regionSeasonFit: number;
  diversityBonus: number;
  regionUtility: number;
  clusters: RegionAllocationClusterBucket[];
}

interface AllocationCandidate {
  orderedRegions: RegionStats[];
  dayCounts: number[];
  regionBlocks: RegionAllocationBlock[];
  score: number;
}

const defaultRegionAllocationConfig: RegionAllocationConfig = {
  version: "phase-5a-v3",
  hoursPerDay: 8,
  utilityScoreWeight: 0.5,
  densityWeight: 0.2,
  seasonWeight: 0.2,
  diversityWeight: 0.1,
  poorSeasonFitThreshold: 0.45,
  viableRegionUtilityThreshold: 0.35,
  poorSeasonPenaltyWeight: 0.18,
  transitionPenaltyWeight: 0.04,
  coverageBonusWeight: 0.04,
  balanceBonusWeight: 0.03
};

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function deterministicRound(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function compareRegionStats(a: RegionStats, b: RegionStats): number {
  if (b.regionUtility !== a.regionUtility) {
    return b.regionUtility - a.regionUtility;
  }
  if (b.regionSeasonFit !== a.regionSeasonFit) {
    return b.regionSeasonFit - a.regionSeasonFit;
  }
  if (b.averageCandidateScore !== a.averageCandidateScore) {
    return b.averageCandidateScore - a.averageCandidateScore;
  }
  if (b.destinationDensity !== a.destinationDensity) {
    return b.destinationDensity - a.destinationDensity;
  }
  return a.region.localeCompare(b.region);
}

function compareClusterBuckets(a: RegionAllocationClusterBucket, b: RegionAllocationClusterBucket): number {
  if (b.averageCandidateScore !== a.averageCandidateScore) {
    return b.averageCandidateScore - a.averageCandidateScore;
  }
  if (b.destinationCount !== a.destinationCount) {
    return b.destinationCount - a.destinationCount;
  }
  return a.clusterKey.localeCompare(b.clusterKey);
}

function primaryClusterLabel(candidate: PlannerHandoffRouteCandidate): string {
  const categoryReason = candidate.reasonCodes.find((reason) => reason === "interest_match")
    ? "aligned"
    : "general";

  const strengthLabel = candidate.strengths
    .filter(Boolean)
    .slice()
    .sort((a, b) => a.localeCompare(b))[0];

  return strengthLabel ?? categoryReason;
}

function buildClusters(candidates: PlannerHandoffRouteCandidate[]): RegionAllocationClusterBucket[] {
  const grouped = new Map<string, PlannerHandoffRouteCandidate[]>();

  candidates
    .slice()
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.slug.localeCompare(b.slug);
    })
    .forEach((candidate) => {
      const clusterLabel = primaryClusterLabel(candidate);
      const bucket = grouped.get(clusterLabel) ?? [];
      bucket.push(candidate);
      grouped.set(clusterLabel, bucket);
    });

  return [...grouped.entries()]
    .map(([clusterLabel, clusterCandidates]) => ({
      clusterKey: clusterLabel,
      clusterLabel,
      candidateSlugs: clusterCandidates.map((candidate) => candidate.slug),
      candidateRanks: clusterCandidates.map((candidate) => candidate.rank),
      totalRecommendedHours: deterministicRound(
        clusterCandidates.reduce((sum, candidate) => sum + candidate.recommendedDurationHours, 0)
      ),
      averageCandidateScore: deterministicRound(
        clusterCandidates.reduce((sum, candidate) => sum + candidate.score, 0) / clusterCandidates.length
      ),
      destinationCount: clusterCandidates.length,
      notes: ["clustered_by_ranked_match_signature"]
    }))
    .sort(compareClusterBuckets);
}

function buildRegionStats(
  candidates: PlannerHandoffRouteCandidate[],
  config: RegionAllocationConfig
): RegionStats[] {
  const grouped = new Map<string, PlannerHandoffRouteCandidate[]>();

  candidates
    .slice()
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.slug.localeCompare(b.slug);
    })
    .forEach((candidate) => {
      const list = grouped.get(candidate.region) ?? [];
      list.push(candidate);
      grouped.set(candidate.region, list);
    });

  const groupedRegions = [...grouped.entries()].map(([region, regionCandidates]) => ({
    region,
    candidates: regionCandidates,
    clusters: buildClusters(regionCandidates)
  }));

  const maxCandidateCount = Math.max(...groupedRegions.map((item) => item.candidates.length), 1);
  const maxClusterCount = Math.max(...groupedRegions.map((item) => item.clusters.length), 1);

  return groupedRegions
    .map((item) => {
      const totalRecommendedHours = deterministicRound(
        item.candidates.reduce((sum, candidate) => sum + candidate.recommendedDurationHours, 0)
      );
      const totalCandidateScore = deterministicRound(
        item.candidates.reduce((sum, candidate) => sum + candidate.score, 0)
      );
      const averageCandidateScore = deterministicRound(totalCandidateScore / item.candidates.length);
      const destinationDensity = deterministicRound(item.candidates.length / maxCandidateCount);
      const regionSeasonFit = deterministicRound(
        item.candidates.reduce(
          (sum, candidate) => sum + candidate.scoreBreakdown.primitives.seasonFit,
          0
        ) / item.candidates.length
      );
      const diversityBonus = deterministicRound(item.clusters.length / maxClusterCount);
      const regionUtility = deterministicRound(
        (averageCandidateScore * config.utilityScoreWeight)
        + (destinationDensity * config.densityWeight)
        + (regionSeasonFit * config.seasonWeight)
        + (diversityBonus * config.diversityWeight)
      );

      return {
        region: item.region,
        candidates: item.candidates,
        totalRecommendedHours,
        totalCandidateScore,
        averageCandidateScore,
        destinationDensity,
        regionSeasonFit,
        diversityBonus,
        regionUtility,
        clusters: item.clusters
      };
    })
    .sort(compareRegionStats);
}

function chooseCombinations<T>(items: T[], count: number): T[][] {
  if (count === 0) {
    return [[]];
  }

  if (count > items.length) {
    return [];
  }

  const results: T[][] = [];

  function walk(startIndex: number, current: T[]) {
    if (current.length === count) {
      results.push([...current]);
      return;
    }

    for (let index = startIndex; index < items.length; index += 1) {
      current.push(items[index]);
      walk(index + 1, current);
      current.pop();
    }
  }

  walk(0, []);
  return results;
}

function buildCompositions(total: number, count: number, maxPerRegion: number): number[][] {
  const results: number[][] = [];

  function walk(remaining: number, slotsLeft: number, current: number[]) {
    if (slotsLeft === 0) {
      if (remaining === 0) {
        results.push([...current]);
      }
      return;
    }

    const minRequired = slotsLeft - 1;
    const upperBound = Math.min(maxPerRegion, remaining - minRequired);

    for (let days = 1; days <= upperBound; days += 1) {
      current.push(days);
      walk(remaining - days, slotsLeft - 1, current);
      current.pop();
    }
  }

  walk(total, count, []);
  return results;
}

function permuteRegions(regions: RegionStats[]): RegionStats[][] {
  if (regions.length <= 1) {
    return [regions];
  }

  const results: RegionStats[][] = [];
  const used = new Array<boolean>(regions.length).fill(false);
  const current: RegionStats[] = [];

  function walk() {
    if (current.length === regions.length) {
      results.push([...current]);
      return;
    }

    for (let index = 0; index < regions.length; index += 1) {
      if (used[index]) {
        continue;
      }

      used[index] = true;
      current.push(regions[index]);
      walk();
      current.pop();
      used[index] = false;
    }
  }

  walk();
  return results;
}

function buildRegionBlocks(
  orderedRegions: RegionStats[],
  dayCounts: number[],
  config: RegionAllocationConfig
): RegionAllocationBlock[] {
  const blocks: RegionAllocationBlock[] = [];
  let dayCursor = 1;

  orderedRegions.forEach((region, index) => {
    const allocatedDays = dayCounts[index];
    const startDay = dayCursor;
    const endDay = dayCursor + allocatedDays - 1;
    const seasonTag = region.regionSeasonFit < config.poorSeasonFitThreshold
      ? "season fit is weaker, so the block stays short"
      : "season fit supports a longer stay";

    blocks.push({
      region: region.region,
      startDay,
      endDay,
      allocatedDays,
      rationale: `Utility ${region.regionUtility.toFixed(3)} from score ${region.averageCandidateScore.toFixed(3)}, density ${region.destinationDensity.toFixed(3)}, season ${region.regionSeasonFit.toFixed(3)}, and diversity ${region.diversityBonus.toFixed(3)}; ${seasonTag}.`
    });

    dayCursor = endDay + 1;
  });

  return blocks;
}

function calculateAllocationScore(
  orderedRegions: RegionStats[],
  dayCounts: number[],
  tripDays: number,
  availableRegionCount: number,
  config: RegionAllocationConfig
): number {
  const weightedUtility = orderedRegions.reduce(
    (sum, region, index) => sum + (region.regionUtility * dayCounts[index]),
    0
  ) / tripDays;

  const poorSeasonExposure = orderedRegions.reduce((sum, region, index) => {
    const deficit = Math.max(0, config.poorSeasonFitThreshold - region.regionSeasonFit);
    return sum + (deficit * dayCounts[index]);
  }, 0) / tripDays;

  let transitionPenalty = 0;
  for (let index = 1; index < orderedRegions.length; index += 1) {
    transitionPenalty += Math.abs(
      orderedRegions[index - 1].regionUtility - orderedRegions[index].regionUtility
    );
  }
  transitionPenalty = orderedRegions.length > 1
    ? transitionPenalty / (orderedRegions.length - 1)
    : 0;

  const coverageDenominator = Math.max(1, Math.min(tripDays, availableRegionCount) - 1);
  const coverageBonus = deterministicRound((orderedRegions.length - 1) / coverageDenominator);
  const maxAllocatedDays = Math.max(...dayCounts);
  const balanceBonus = deterministicRound(1 - ((maxAllocatedDays - 1) / Math.max(1, tripDays - 1)));

  return deterministicRound(
    weightedUtility
      + (coverageBonus * config.coverageBonusWeight)
      + (balanceBonus * config.balanceBonusWeight)
      - (poorSeasonExposure * config.poorSeasonPenaltyWeight)
      - (transitionPenalty * config.transitionPenaltyWeight)
  );
}

function compareAllocationCandidates(a: AllocationCandidate, b: AllocationCandidate): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  const aSignature = a.regionBlocks
    .map((block) => `${block.region}:${block.startDay}-${block.endDay}`)
    .join("|");
  const bSignature = b.regionBlocks
    .map((block) => `${block.region}:${block.startDay}-${block.endDay}`)
    .join("|");

  return aSignature.localeCompare(bSignature);
}

function findBestAllocation(
  regionStats: RegionStats[],
  tripDays: number,
  minimumRegions: number,
  maxPerRegion: number,
  config: RegionAllocationConfig
): AllocationCandidate | null {
  const feasibleRegionCounts: number[] = [];
  const maxRegions = Math.min(regionStats.length, tripDays);

  for (let regionCount = minimumRegions; regionCount <= maxRegions; regionCount += 1) {
    if (tripDays <= regionCount * maxPerRegion) {
      feasibleRegionCounts.push(regionCount);
    }
  }

  const candidates: AllocationCandidate[] = [];

  feasibleRegionCounts.forEach((regionCount) => {
    const regionGroups = chooseCombinations(regionStats, regionCount);
    const compositions = buildCompositions(tripDays, regionCount, maxPerRegion);

    regionGroups.forEach((group) => {
      permuteRegions(group).forEach((orderedRegions) => {
        compositions.forEach((dayCounts) => {
          const regionBlocks = buildRegionBlocks(orderedRegions, dayCounts, config);
          const score = calculateAllocationScore(
            orderedRegions,
            dayCounts,
            tripDays,
            regionStats.length,
            config
          );

          candidates.push({
            orderedRegions,
            dayCounts,
            regionBlocks,
            score
          });
        });
      });
    });
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort(compareAllocationCandidates)[0];
}

function buildDayRegionSequence(regionBlocks: RegionAllocationBlock[]): RegionAllocationDaySlot[] {
  return regionBlocks.flatMap((block) => {
    const slots: RegionAllocationDaySlot[] = [];
    for (let dayNumber = block.startDay; dayNumber <= block.endDay; dayNumber += 1) {
      slots.push({
        dayNumber,
        region: block.region
      });
    }
    return slots;
  });
}

function explainSelectedRegion(
  stats: RegionStats,
  allocatedDays: number,
  tripDays: number,
  maxPerRegion: number,
  config: RegionAllocationConfig
): string {
  const seasonClause = stats.regionSeasonFit < config.poorSeasonFitThreshold
    ? "Season fit is below the preferred threshold, so the allocation stays conservative."
    : "Season fit is strong enough to support inclusion.";
  const capClause = allocatedDays === maxPerRegion && tripDays > 1
    ? "The region reached the per-region day cap."
    : "The allocation remained under the per-region day cap.";

  return `Selected with utility ${stats.regionUtility.toFixed(3)} across ${allocatedDays} day(s). ${seasonClause} ${capClause}`;
}

function explainUnallocatedRegion(
  stats: RegionStats,
  selectedRegions: Set<string>,
  config: RegionAllocationConfig
): string {
  if (selectedRegions.has(stats.region)) {
    return "";
  }

  if (stats.regionSeasonFit < config.poorSeasonFitThreshold) {
    return `Skipped because season fit ${stats.regionSeasonFit.toFixed(3)} fell below the preferred threshold and stronger regions covered the trip first.`;
  }

  return `Skipped because utility ${stats.regionUtility.toFixed(3)} ranked behind the selected regions once day caps and contiguous blocks were enforced.`;
}

export function allocateTripDaysAcrossRegions(
  handoff: PlannerPhase4CHandoff
): PlannerPhase5ARegionAllocation {
  const config = defaultRegionAllocationConfig;
  const tripDays = clampInteger(handoff.profile.tripDurationDays, 1, 7);
  const selected = handoff.routeGenerationInput.selectedCandidates;
  const regionStats = buildRegionStats(selected, config);
  const maxPerRegion = Math.ceil(tripDays / 2);
  const viableRegionCount = regionStats.filter(
    (region) => region.regionUtility >= config.viableRegionUtilityThreshold
  ).length;
  const minimumRegions = tripDays >= 3 && viableRegionCount >= 2 ? 2 : 1;

  if (regionStats.length === 0) {
    return {
      allocationVersion: config.version,
      planningContextId: handoff.planningContextId,
      sourceHandoffVersion: handoff.handoffVersion,
      datasetVersion: handoff.datasetVersion,
      tripDays,
      allocationPolicy: {
        hoursPerDay: config.hoursPerDay,
        baselinePerRegion: 0,
        minimumRegions,
        maximumDaysPerRegion: maxPerRegion,
        approach: "no_selected_candidates"
      },
      regionBuckets: [],
      regionBlocks: [],
      dayRegionSequence: [],
      unallocatedRegions: [],
      totalAllocatedDays: 0
    };
  }

  const bestAllocation = findBestAllocation(
    regionStats,
    tripDays,
    Math.min(minimumRegions, regionStats.length),
    maxPerRegion,
    config
  );

  const fallbackAllocation: AllocationCandidate = bestAllocation ?? {
    orderedRegions: [regionStats[0]],
    dayCounts: [tripDays],
    regionBlocks: buildRegionBlocks([regionStats[0]], [tripDays], config),
    score: regionStats[0].regionUtility
  };

  const selectedRegionSet = new Set(
    fallbackAllocation.orderedRegions.map((region) => region.region)
  );
  const allocatedDaysByRegion = new Map(
    fallbackAllocation.orderedRegions.map((region, index) => [region.region, fallbackAllocation.dayCounts[index]])
  );

  const regionBuckets: RegionAllocationRegionBucket[] = regionStats.map((item) => {
    const allocatedDays = allocatedDaysByRegion.get(item.region) ?? 0;
    const selectionExplanation = allocatedDays > 0
      ? explainSelectedRegion(item, allocatedDays, tripDays, maxPerRegion, config)
      : explainUnallocatedRegion(item, selectedRegionSet, config);

    return {
      region: item.region,
      allocatedDays,
      candidateSlugs: item.candidates.map((candidate) => candidate.slug),
      candidateRanks: item.candidates.map((candidate) => candidate.rank),
      totalRecommendedHours: item.totalRecommendedHours,
      totalCandidateScore: item.totalCandidateScore,
      averageCandidateScore: item.averageCandidateScore,
      destinationDensity: item.destinationDensity,
      regionSeasonFit: item.regionSeasonFit,
      diversityBonus: item.diversityBonus,
      regionUtility: item.regionUtility,
      clusters: item.clusters,
      selectionExplanation,
      notes:
        allocatedDays > 0
          ? ["region_selected_via_bounded_search"]
          : ["region_unallocated_after_constraint_search"]
    };
  });

  const unallocatedRegions = regionBuckets
    .filter((bucket) => bucket.allocatedDays === 0)
    .map((bucket) => ({
      region: bucket.region,
      reason: bucket.selectionExplanation,
      candidateSlugs: bucket.candidateSlugs
    }));

  return {
    allocationVersion: config.version,
    planningContextId: handoff.planningContextId,
    sourceHandoffVersion: handoff.handoffVersion,
    datasetVersion: handoff.datasetVersion,
    tripDays,
    allocationPolicy: {
      hoursPerDay: config.hoursPerDay,
      baselinePerRegion: fallbackAllocation.orderedRegions.length > 0 ? 1 : 0,
      minimumRegions,
      maximumDaysPerRegion: maxPerRegion,
      approach: "bounded_search_contiguous_region_blocks"
    },
    regionBuckets,
    regionBlocks: fallbackAllocation.regionBlocks,
    dayRegionSequence: buildDayRegionSequence(fallbackAllocation.regionBlocks),
    unallocatedRegions,
    totalAllocatedDays: regionBuckets.reduce((sum, bucket) => sum + bucket.allocatedDays, 0)
  };
}
