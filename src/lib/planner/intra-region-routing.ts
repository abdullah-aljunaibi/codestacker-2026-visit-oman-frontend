import type { PlannerPhase4CHandoff, PlannerHandoffRouteCandidate } from "@/lib/planner/candidate-ranking";
import { haversineDistance } from "@/lib/geo/haversine";
import { totalRouteDistance } from "@/lib/geo/route-distance";
import type { PlannerPhase5ARegionAllocation } from "@/lib/planner/region-allocation";

interface IntraRegionRoutingConfig {
  version: string;
  distancePrecisionKm: number;
}

interface PlannerDayCandidate extends PlannerHandoffRouteCandidate {
  originalIndex: number;
}

interface RegionDailyPlan {
  regionDayNumber: number;
  destinationSlugs: string[];
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  notes: string[];
}

interface PlannedRegionRoute {
  region: string;
  allocatedDays: number;
  orderedCandidateSlugs: string[];
  droppedCandidateSlugs: string[];
  dailyPlans: RegionDailyPlan[];
  totalPlannedVisitHours: number;
  totalEstimatedTravelKm: number;
  notes: string[];
}

export interface PlannerPhase5BDayPlan {
  dayNumber: number;
  region: string;
  regionDayNumber: number;
  destinationSlugs: string[];
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  notes: string[];
}

export interface PlannerPhase5BIntraRegionRouting {
  routingVersion: string;
  planningContextId: string;
  sourceHandoffVersion: string;
  sourceAllocationVersion: string;
  datasetVersion: string;
  tripDays: number;
  routingPolicy: {
    approach: string;
    dayFillPolicy: string;
    distanceMetric: string;
    hoursPerDayTarget: number;
  };
  regionRoutes: PlannedRegionRoute[];
  dayPlans: PlannerPhase5BDayPlan[];
  unresolvedDaySlots: Array<{
    dayNumber: number;
    region: string;
    reason: string;
  }>;
  totalPlannedVisitHours: number;
  totalEstimatedTravelKm: number;
}

const defaultIntraRegionRoutingConfig: IntraRegionRoutingConfig = {
  version: "phase-5b-v1",
  distancePrecisionKm: 3
};

function deterministicRound(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roundKm(value: number, precision: number): number {
  return deterministicRound(value, precision);
}

function compareCandidatesByPriority(a: PlannerDayCandidate, b: PlannerDayCandidate): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  if (b.score !== a.score) {
    return b.score - a.score;
  }
  if (a.recommendedDurationHours !== b.recommendedDurationHours) {
    return a.recommendedDurationHours - b.recommendedDurationHours;
  }
  return a.slug.localeCompare(b.slug);
}

function compareByDistanceFromCurrent(
  current: PlannerDayCandidate,
  a: PlannerDayCandidate,
  b: PlannerDayCandidate
): number {
  const distanceA = deterministicRound(
    haversineDistance(current.coordinates.lat, current.coordinates.lng, a.coordinates.lat, a.coordinates.lng)
  );
  const distanceB = deterministicRound(
    haversineDistance(current.coordinates.lat, current.coordinates.lng, b.coordinates.lat, b.coordinates.lng)
  );
  if (distanceA !== distanceB) {
    return distanceA - distanceB;
  }
  return compareCandidatesByPriority(a, b);
}

function computeRouteTravelKm(candidates: PlannerDayCandidate[], precision: number): number {
  return roundKm(totalRouteDistance(candidates.map((candidate) => candidate.coordinates)), precision);
}

function orderCandidatesWithinRegion(candidates: PlannerDayCandidate[]): PlannerDayCandidate[] {
  if (candidates.length <= 2) {
    return candidates.slice().sort(compareCandidatesByPriority);
  }

  const remaining = candidates.slice().sort(compareCandidatesByPriority);
  const ordered: PlannerDayCandidate[] = [];

  const first = remaining.shift();
  if (!first) {
    return ordered;
  }
  ordered.push(first);

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    const next = remaining.slice().sort((a, b) => compareByDistanceFromCurrent(current, a, b))[0];
    ordered.push(next);

    const removeIndex = remaining.findIndex((item) => item.slug === next.slug && item.originalIndex === next.originalIndex);
    remaining.splice(removeIndex, 1);
  }

  return ordered;
}

function allocateStopsToDays(
  orderedCandidates: PlannerDayCandidate[],
  allocatedDays: number,
  hoursPerDayTarget: number,
  distancePrecisionKm: number
): RegionDailyPlan[] {
  const plans: RegionDailyPlan[] = [];
  let cursor = 0;

  for (let dayIndex = 0; dayIndex < allocatedDays; dayIndex += 1) {
    const regionDayNumber = dayIndex + 1;
    const daysRemainingAfterCurrent = allocatedDays - regionDayNumber;
    const stopsRemaining = orderedCandidates.length - cursor;

    let minStopsForThisDay = 0;
    if (stopsRemaining > daysRemainingAfterCurrent) {
      minStopsForThisDay = 1;
    }

    const dayStops: PlannerDayCandidate[] = [];
    let dayVisitHours = 0;

    while (minStopsForThisDay > 0 && cursor < orderedCandidates.length) {
      const next = orderedCandidates[cursor];
      dayStops.push(next);
      dayVisitHours += next.recommendedDurationHours;
      cursor += 1;
      minStopsForThisDay -= 1;
    }

    let extrasAvailable = orderedCandidates.length - cursor - daysRemainingAfterCurrent;
    while (extrasAvailable > 0 && cursor < orderedCandidates.length) {
      const next = orderedCandidates[cursor];
      if (dayVisitHours >= hoursPerDayTarget) {
        break;
      }
      dayStops.push(next);
      dayVisitHours += next.recommendedDurationHours;
      cursor += 1;
      extrasAvailable -= 1;
    }

    const notes =
      dayStops.length === 0
        ? ["buffer_day_no_remaining_candidates"]
        : dayVisitHours > hoursPerDayTarget
          ? ["over_target_hours_due_to_minimum_stop_distribution"]
          : ["region_day_planned"];

    plans.push({
      regionDayNumber,
      destinationSlugs: dayStops.map((item) => item.slug),
      estimatedVisitHours: deterministicRound(dayVisitHours),
      estimatedTravelKm: computeRouteTravelKm(dayStops, distancePrecisionKm),
      notes
    });
  }

  return plans;
}

function toCandidateMap(handoff: PlannerPhase4CHandoff): Map<string, PlannerHandoffRouteCandidate> {
  const map = new Map<string, PlannerHandoffRouteCandidate>();
  handoff.routeGenerationInput.selectedCandidates.forEach((candidate) => {
    map.set(candidate.slug, candidate);
  });
  return map;
}

export function generateIntraRegionDayPlans(input: {
  handoff: PlannerPhase4CHandoff;
  allocation: PlannerPhase5ARegionAllocation;
}): PlannerPhase5BIntraRegionRouting {
  const config = defaultIntraRegionRoutingConfig;
  const candidateMap = toCandidateMap(input.handoff);
  const hoursPerDayTarget = input.allocation.allocationPolicy.hoursPerDay;

  const regionRoutes: PlannedRegionRoute[] = input.allocation.regionBuckets.map((bucket) => {
    const usableCandidates: PlannerDayCandidate[] = bucket.candidateSlugs
      .map((slug, index) => {
        const candidate = candidateMap.get(slug);
        if (!candidate) {
          return null;
        }
        return {
          ...candidate,
          originalIndex: index
        };
      })
      .filter((candidate): candidate is PlannerDayCandidate => candidate !== null)
      .sort(compareCandidatesByPriority);

    if (bucket.allocatedDays <= 0) {
      return {
        region: bucket.region,
        allocatedDays: 0,
        orderedCandidateSlugs: usableCandidates.map((item) => item.slug),
        droppedCandidateSlugs: [],
        dailyPlans: [],
        totalPlannedVisitHours: 0,
        totalEstimatedTravelKm: 0,
        notes: ["region_not_allocated_in_phase_5a"]
      };
    }

    const orderedRoute = orderCandidatesWithinRegion(usableCandidates);
    const dailyPlans = allocateStopsToDays(
      orderedRoute,
      bucket.allocatedDays,
      hoursPerDayTarget,
      config.distancePrecisionKm
    );

    const assignedSlugs = new Set(dailyPlans.flatMap((plan) => plan.destinationSlugs));
    const droppedCandidateSlugs = orderedRoute
      .map((candidate) => candidate.slug)
      .filter((slug) => !assignedSlugs.has(slug));

    return {
      region: bucket.region,
      allocatedDays: bucket.allocatedDays,
      orderedCandidateSlugs: orderedRoute.map((item) => item.slug),
      droppedCandidateSlugs,
      dailyPlans,
      totalPlannedVisitHours: deterministicRound(dailyPlans.reduce((sum, plan) => sum + plan.estimatedVisitHours, 0)),
      totalEstimatedTravelKm: deterministicRound(dailyPlans.reduce((sum, plan) => sum + plan.estimatedTravelKm, 0)),
      notes:
        usableCandidates.length === 0
          ? ["no_selected_candidates_available_for_allocated_region"]
          : droppedCandidateSlugs.length > 0
            ? ["capacity_limited_unassigned_candidates"]
            : ["region_route_planned"]
    };
  });

  const regionDayCursor = new Map<string, number>();
  const dayPlans: PlannerPhase5BDayPlan[] = input.allocation.dayRegionSequence.map((slot) => {
    const region = slot.region;
    const regionRoute = regionRoutes.find((route) => route.region === region);
    const currentRegionDay = (regionDayCursor.get(region) ?? 0) + 1;
    regionDayCursor.set(region, currentRegionDay);

    const regionDayPlan = regionRoute?.dailyPlans.find((plan) => plan.regionDayNumber === currentRegionDay);
    if (!regionDayPlan) {
      return {
        dayNumber: slot.dayNumber,
        region,
        regionDayNumber: currentRegionDay,
        destinationSlugs: [],
        estimatedVisitHours: 0,
        estimatedTravelKm: 0,
        notes: ["unresolved_region_day_slot"]
      };
    }

    return {
      dayNumber: slot.dayNumber,
      region,
      regionDayNumber: currentRegionDay,
      destinationSlugs: regionDayPlan.destinationSlugs,
      estimatedVisitHours: regionDayPlan.estimatedVisitHours,
      estimatedTravelKm: regionDayPlan.estimatedTravelKm,
      notes: regionDayPlan.notes
    };
  });

  const unresolvedDaySlots = dayPlans
    .filter((plan) => plan.notes.includes("unresolved_region_day_slot"))
    .map((plan) => ({
      dayNumber: plan.dayNumber,
      region: plan.region,
      reason: "missing_region_day_plan"
    }));

  return {
    routingVersion: config.version,
    planningContextId: input.allocation.planningContextId,
    sourceHandoffVersion: input.handoff.handoffVersion,
    sourceAllocationVersion: input.allocation.allocationVersion,
    datasetVersion: input.allocation.datasetVersion,
    tripDays: input.allocation.tripDays,
    routingPolicy: {
      approach: "deterministic_priority_seeded_nearest_neighbor_then_stable_day_fill",
      dayFillPolicy: "minimum_one_stop_per_remaining_day_when_feasible_then_hours_target_fill",
      distanceMetric: "haversine_km",
      hoursPerDayTarget
    },
    regionRoutes,
    dayPlans,
    unresolvedDaySlots,
    totalPlannedVisitHours: deterministicRound(dayPlans.reduce((sum, day) => sum + day.estimatedVisitHours, 0)),
    totalEstimatedTravelKm: deterministicRound(dayPlans.reduce((sum, day) => sum + day.estimatedTravelKm, 0))
  };
}
