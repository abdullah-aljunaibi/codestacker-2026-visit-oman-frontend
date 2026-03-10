import type { PlannerPhase4CHandoff, PlannerHandoffRouteCandidate } from "@/lib/planner/candidate-ranking";

interface RegionAllocationConfig {
  version: string;
  hoursPerDay: number;
}

export interface RegionAllocationDaySlot {
  dayNumber: number;
  region: string;
}

export interface RegionAllocationRegionBucket {
  region: string;
  allocatedDays: number;
  candidateSlugs: string[];
  candidateRanks: number[];
  totalRecommendedHours: number;
  totalCandidateScore: number;
  allocationWeight: number;
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
  allocationWeight: number;
}

const defaultRegionAllocationConfig: RegionAllocationConfig = {
  version: "phase-5a-v1",
  hoursPerDay: 8
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
  if (b.totalCandidateScore !== a.totalCandidateScore) {
    return b.totalCandidateScore - a.totalCandidateScore;
  }
  if (b.totalRecommendedHours !== a.totalRecommendedHours) {
    return b.totalRecommendedHours - a.totalRecommendedHours;
  }
  return a.region.localeCompare(b.region);
}

function compareFractionalRemainder(
  a: { index: number; remainder: number; weight: number; region: string },
  b: { index: number; remainder: number; weight: number; region: string }
): number {
  if (b.remainder !== a.remainder) {
    return b.remainder - a.remainder;
  }
  if (b.weight !== a.weight) {
    return b.weight - a.weight;
  }
  return a.region.localeCompare(b.region);
}

function buildRegionStats(candidates: PlannerHandoffRouteCandidate[], hoursPerDay: number): RegionStats[] {
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

  return [...grouped.entries()]
    .map(([region, regionCandidates]) => {
      const totalRecommendedHours = deterministicRound(
        regionCandidates.reduce((sum, candidate) => sum + candidate.recommendedDurationHours, 0)
      );
      const totalCandidateScore = deterministicRound(
        regionCandidates.reduce((sum, candidate) => sum + candidate.score, 0)
      );
      const baseDays = totalRecommendedHours / hoursPerDay;
      const weightedDays = baseDays * 0.7 + totalCandidateScore * 0.3;
      return {
        region,
        candidates: regionCandidates,
        totalRecommendedHours,
        totalCandidateScore,
        allocationWeight: deterministicRound(weightedDays)
      };
    })
    .sort(compareRegionStats);
}

function buildDayRegionSequence(regionBuckets: RegionAllocationRegionBucket[]): RegionAllocationDaySlot[] {
  const remaining = regionBuckets.map((bucket) => ({
    region: bucket.region,
    days: bucket.allocatedDays
  }));

  const sequence: RegionAllocationDaySlot[] = [];
  let dayNumber = 1;
  while (remaining.some((item) => item.days > 0)) {
    remaining
      .slice()
      .sort((a, b) => {
        if (b.days !== a.days) {
          return b.days - a.days;
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

  return sequence.slice().sort((a, b) => a.dayNumber - b.dayNumber);
}

export function allocateTripDaysAcrossRegions(
  handoff: PlannerPhase4CHandoff
): PlannerPhase5ARegionAllocation {
  const config = defaultRegionAllocationConfig;
  const tripDays = clampInteger(handoff.profile.tripDurationDays, 1, 7);
  const selected = handoff.routeGenerationInput.selectedCandidates;
  const regionStats = buildRegionStats(selected, config.hoursPerDay);

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

  const baselinePerRegion = tripDays >= regionStats.length ? 1 : 0;
  const allocations = new Array<number>(regionStats.length).fill(baselinePerRegion);

  let remainingDays = tripDays - allocations.reduce((sum, days) => sum + days, 0);
  const totalWeight = regionStats.reduce((sum, item) => sum + item.allocationWeight, 0);

  if (remainingDays > 0 && tripDays < regionStats.length) {
    allocations.fill(0);
    regionStats
      .slice()
      .sort(compareRegionStats)
      .slice(0, remainingDays)
      .forEach((item) => {
        const index = regionStats.findIndex((region) => region.region === item.region);
        allocations[index] = 1;
      });
    remainingDays = 0;
  }

  if (remainingDays > 0) {
    const shares = regionStats.map((item, index) => {
      const raw = totalWeight > 0 ? (item.allocationWeight / totalWeight) * remainingDays : 0;
      const base = Math.floor(raw);
      allocations[index] += base;
      return {
        index,
        remainder: deterministicRound(raw - base),
        weight: item.allocationWeight,
        region: item.region
      };
    });

    let remainderDays = tripDays - allocations.reduce((sum, days) => sum + days, 0);
    shares
      .slice()
      .sort(compareFractionalRemainder)
      .forEach((item) => {
        if (remainderDays <= 0) {
          return;
        }
        allocations[item.index] += 1;
        remainderDays -= 1;
      });
  }

  const regionBuckets: RegionAllocationRegionBucket[] = regionStats.map((item, index) => ({
    region: item.region,
    allocatedDays: allocations[index],
    candidateSlugs: item.candidates.map((candidate) => candidate.slug),
    candidateRanks: item.candidates.map((candidate) => candidate.rank),
    totalRecommendedHours: item.totalRecommendedHours,
    totalCandidateScore: item.totalCandidateScore,
    allocationWeight: item.allocationWeight,
    notes: allocations[index] > 0 ? ["region_allocated"] : ["insufficient_trip_days_for_all_regions"]
  }));

  const unallocatedRegions = regionBuckets
    .filter((bucket) => bucket.allocatedDays === 0)
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
      baselinePerRegion,
      approach:
        tripDays < regionStats.length
          ? "priority_fill_when_trip_days_below_region_count"
          : "baseline_plus_largest_remainder_weighted_distribution"
    },
    regionBuckets,
    dayRegionSequence: buildDayRegionSequence(regionBuckets),
    unallocatedRegions,
    totalAllocatedDays: regionBuckets.reduce((sum, bucket) => sum + bucket.allocatedDays, 0)
  };
}
