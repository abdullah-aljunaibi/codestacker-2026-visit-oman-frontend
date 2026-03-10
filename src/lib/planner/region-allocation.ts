/**
 * Deterministic hierarchical region allocation across governorates and clusters.
 */
import type {
  PlannerHandoffRouteCandidate,
  PlannerPhase4CHandoff
} from "@/lib/planner/candidate-ranking";

interface RegionAllocationConfig {
  version: string;
  hoursPerDay: number;
  densityWeight: number;
  matchWeight: number;
  diversityWeight: number;
}

export interface RegionAllocationDaySlot {
  dayNumber: number;
  region: string;
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
  diversityBonus: number;
  allocationWeight: number;
  clusters: RegionAllocationClusterBucket[];
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
    approach: string;
  };
  regionBuckets: RegionAllocationRegionBucket[];
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
  diversityBonus: number;
  allocationWeight: number;
  clusters: RegionAllocationClusterBucket[];
}

const defaultRegionAllocationConfig: RegionAllocationConfig = {
  version: "phase-5a-v2",
  hoursPerDay: 8,
  densityWeight: 0.35,
  matchWeight: 0.5,
  diversityWeight: 0.15
};

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function deterministicRound(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function compareRegionStats(a: RegionStats, b: RegionStats): number {
  if (b.allocationWeight !== a.allocationWeight) {
    return b.allocationWeight - a.allocationWeight;
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
  const categoryReason = candidate.reasonCodes
    .find((reason) => reason === "interest_match")
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

  const maxCandidateCount = Math.max(...[...grouped.values()].map((regionCandidates) => regionCandidates.length), 1);

  return [...grouped.entries()]
    .map(([region, regionCandidates]) => {
      const totalRecommendedHours = deterministicRound(
        regionCandidates.reduce((sum, candidate) => sum + candidate.recommendedDurationHours, 0)
      );
      const totalCandidateScore = deterministicRound(
        regionCandidates.reduce((sum, candidate) => sum + candidate.score, 0)
      );
      const averageCandidateScore = deterministicRound(totalCandidateScore / regionCandidates.length);
      const destinationDensity = deterministicRound(regionCandidates.length / maxCandidateCount);
      const clusters = buildClusters(regionCandidates);
      const diversityBonus = deterministicRound(1 / clusters.length);
      const allocationWeight = deterministicRound(
        (averageCandidateScore * config.matchWeight)
        + (destinationDensity * config.densityWeight)
        + (diversityBonus * config.diversityWeight)
      );

      return {
        region,
        candidates: regionCandidates,
        totalRecommendedHours,
        totalCandidateScore,
        averageCandidateScore,
        destinationDensity,
        diversityBonus,
        allocationWeight,
        clusters
      };
    })
    .sort(compareRegionStats);
}

function buildDayRegionSequence(regionBuckets: RegionAllocationRegionBucket[]): RegionAllocationDaySlot[] {
  const remaining = regionBuckets
    .map((bucket) => ({
      region: bucket.region,
      days: bucket.allocatedDays,
      weight: bucket.allocationWeight
    }))
    .filter((bucket) => bucket.days > 0);

  const sequence: RegionAllocationDaySlot[] = [];
  let dayNumber = 1;

  while (remaining.some((item) => item.days > 0)) {
    remaining
      .slice()
      .sort((a, b) => {
        if (b.days !== a.days) {
          return b.days - a.days;
        }
        if (b.weight !== a.weight) {
          return b.weight - a.weight;
        }
        return a.region.localeCompare(b.region);
      })
      .forEach((item) => {
        if (item.days <= 0) {
          return;
        }

        sequence.push({
          dayNumber,
          region: item.region
        });
        dayNumber += 1;
        item.days -= 1;
      });
  }

  return sequence;
}

export function allocateTripDaysAcrossRegions(
  handoff: PlannerPhase4CHandoff
): PlannerPhase5ARegionAllocation {
  const config = defaultRegionAllocationConfig;
  const tripDays = clampInteger(handoff.profile.tripDurationDays, 1, 7);
  const selected = handoff.routeGenerationInput.selectedCandidates;
  const regionStats = buildRegionStats(selected, config);

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
        approach: "no_selected_candidates"
      },
      regionBuckets: [],
      dayRegionSequence: [],
      unallocatedRegions: [],
      totalAllocatedDays: 0
    };
  }

  const selectedRegions = regionStats.slice(0, Math.min(tripDays, regionStats.length));
  const selectedRegionSet = new Set(selectedRegions.map((region) => region.region));
  const allocations = new Map(selectedRegions.map((region) => [region.region, 1]));
  let remainingDays = tripDays - selectedRegions.length;

  while (remainingDays > 0) {
    const nextRegion = selectedRegions
      .slice()
      .sort((a, b) => {
        const currentAllocationA = allocations.get(a.region) ?? 0;
        const currentAllocationB = allocations.get(b.region) ?? 0;
        const marginalA = deterministicRound(a.allocationWeight / (currentAllocationA + 1));
        const marginalB = deterministicRound(b.allocationWeight / (currentAllocationB + 1));

        if (marginalB !== marginalA) {
          return marginalB - marginalA;
        }
        if (b.averageCandidateScore !== a.averageCandidateScore) {
          return b.averageCandidateScore - a.averageCandidateScore;
        }
        return a.region.localeCompare(b.region);
      })[0];

    allocations.set(nextRegion.region, (allocations.get(nextRegion.region) ?? 0) + 1);
    remainingDays -= 1;
  }

  const regionBuckets: RegionAllocationRegionBucket[] = regionStats.map((item) => {
    const allocatedDays = allocations.get(item.region) ?? 0;

    return {
      region: item.region,
      allocatedDays,
      candidateSlugs: item.candidates.map((candidate) => candidate.slug),
      candidateRanks: item.candidates.map((candidate) => candidate.rank),
      totalRecommendedHours: item.totalRecommendedHours,
      totalCandidateScore: item.totalCandidateScore,
      averageCandidateScore: item.averageCandidateScore,
      destinationDensity: item.destinationDensity,
      diversityBonus: item.diversityBonus,
      allocationWeight: item.allocationWeight,
      clusters: item.clusters,
      notes:
        allocatedDays > 0
          ? ["region_allocated_with_hierarchical_clusters"]
          : ["insufficient_trip_days_for_all_regions"]
    };
  });

  const unallocatedRegions = regionBuckets
    .filter((bucket) => !selectedRegionSet.has(bucket.region))
    .map((bucket) => ({
      region: bucket.region,
      reason: "insufficient_trip_days_for_all_regions",
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
      baselinePerRegion: selectedRegions.length > 0 ? 1 : 0,
      approach: "hierarchical_density_match_allocation_with_diminishing_returns"
    },
    regionBuckets,
    dayRegionSequence: buildDayRegionSequence(regionBuckets),
    unallocatedRegions,
    totalAllocatedDays: regionBuckets.reduce((sum, bucket) => sum + bucket.allocatedDays, 0)
  };
}
