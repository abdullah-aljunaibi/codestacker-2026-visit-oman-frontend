/**
 * Deterministic intra-region routing with bounded beam search, 2-opt refinement,
 * and timed day-by-day plans.
 */
import type { PlannerPhase4CHandoff, PlannerHandoffRouteCandidate } from "@/lib/planner/candidate-ranking";
import { buildDistanceMatrix } from "@/lib/geo/distance-matrix";
import type { PlannerPhase5ARegionAllocation } from "@/lib/planner/region-allocation";

interface IntraRegionRoutingConfig {
  version: string;
  distancePrecisionKm: number;
  beamWidth: number;
  averageTravelSpeedKmh: number;
  dayStartMinutes: number;
  dayEndMinutes: number;
}

interface PlannerDayCandidate extends PlannerHandoffRouteCandidate {
  originalIndex: number;
}

interface SchedulableStop {
  slug: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  recommendedDurationHours: number;
}

interface RegionDailyPlan {
  regionDayNumber: number;
  destinationSlugs: string[];
  scheduledStops: PlannerTimedStop[];
  startTime: string;
  endTime: string;
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  estimatedTravelMinutes: number;
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

export interface PlannerTimedStop {
  slug: string;
  startTime: string;
  endTime: string;
  travelMinutesFromPrevious: number;
  estimatedVisitHours: number;
}

export interface PlannerPhase5BDayPlan {
  dayNumber: number;
  region: string;
  regionDayNumber: number;
  destinationSlugs: string[];
  scheduledStops: PlannerTimedStop[];
  startTime: string;
  endTime: string;
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  estimatedTravelMinutes: number;
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
    beamWidth: number;
    averageTravelSpeedKmh: number;
    dayStartTime: string;
    dayEndTime: string;
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

interface BeamState {
  route: number[];
  visitedMask: number;
  distanceKm: number;
}

export interface TimedRouteSummary {
  scheduledStops: PlannerTimedStop[];
  startTime: string;
  endTime: string;
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  estimatedTravelMinutes: number;
  notes: string[];
}

const defaultIntraRegionRoutingConfig: IntraRegionRoutingConfig = {
  version: "phase-5b-v2",
  distancePrecisionKm: 3,
  beamWidth: 4,
  averageTravelSpeedKmh: 55,
  dayStartMinutes: 8 * 60,
  dayEndMinutes: 20 * 60
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
  if (a.originalIndex !== b.originalIndex) {
    return a.originalIndex - b.originalIndex;
  }
  return a.slug.localeCompare(b.slug);
}

function minutesToTimeLabel(totalMinutes: number): string {
  const clampedMinutes = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function durationMinutes(stop: Pick<SchedulableStop, "recommendedDurationHours">, config: IntraRegionRoutingConfig): number {
  const operatingWindowMinutes = config.dayEndMinutes - config.dayStartMinutes;
  return Math.max(
    30,
    Math.min(operatingWindowMinutes, Math.round(stop.recommendedDurationHours * 60))
  );
}

function travelMinutesFromKm(distanceKm: number, averageTravelSpeedKmh: number): number {
  if (distanceKm <= 0) {
    return 0;
  }

  return Math.max(5, Math.round((distanceKm / averageTravelSpeedKmh) * 60));
}

function computeRawScheduledMinutes(
  stops: Pick<SchedulableStop, "coordinates" | "recommendedDurationHours">[],
  config: IntraRegionRoutingConfig
): number {
  if (stops.length === 0) {
    return 0;
  }

  const distanceMatrix = buildDistanceMatrix(
    stops.map((stop) => ({
      coordinates: stop.coordinates
    }))
  );

  let totalMinutes = 0;
  for (let index = 0; index < stops.length; index += 1) {
    totalMinutes += durationMinutes(stops[index], config);
    if (index > 0) {
      totalMinutes += travelMinutesFromKm(
        distanceMatrix[index - 1][index],
        config.averageTravelSpeedKmh
      );
    }
  }

  return totalMinutes;
}

function routeSignature(indices: number[], candidates: PlannerDayCandidate[]): string {
  return indices.map((index) => candidates[index].slug).join("|");
}

function computeRouteDistance(indices: number[], distanceMatrix: number[][]): number {
  let total = 0;
  for (let index = 1; index < indices.length; index += 1) {
    total += distanceMatrix[indices[index - 1]][indices[index]];
  }
  return total;
}

function compareBeamStates(
  a: BeamState,
  b: BeamState,
  candidates: PlannerDayCandidate[]
): number {
  if (a.distanceKm !== b.distanceKm) {
    return a.distanceKm - b.distanceKm;
  }

  return routeSignature(a.route, candidates).localeCompare(routeSignature(b.route, candidates));
}

function runBeamSearch(
  candidates: PlannerDayCandidate[],
  distanceMatrix: number[][],
  beamWidth: number
): number[] {
  const prioritizedIndices = candidates
    .map((_, index) => index)
    .sort((left, right) => compareCandidatesByPriority(candidates[left], candidates[right]));
  const seedWidth = Math.min(beamWidth, candidates.length);
  let beam: BeamState[] = prioritizedIndices.slice(0, seedWidth).map((index) => ({
    route: [index],
    visitedMask: 1 << index,
    distanceKm: 0
  }));

  while (beam[0]?.route.length < candidates.length) {
    const expansions: BeamState[] = [];

    beam.forEach((state) => {
      const last = state.route[state.route.length - 1];
      prioritizedIndices.forEach((candidateIndex) => {
        if ((state.visitedMask & (1 << candidateIndex)) !== 0) {
          return;
        }

        expansions.push({
          route: [...state.route, candidateIndex],
          visitedMask: state.visitedMask | (1 << candidateIndex),
          distanceKm: deterministicRound(state.distanceKm + distanceMatrix[last][candidateIndex])
        });
      });
    });

    beam = expansions
      .sort((left, right) => compareBeamStates(left, right, candidates))
      .slice(0, beamWidth);
  }

  return beam[0]?.route ?? prioritizedIndices;
}

function runTwoOpt(route: number[], distanceMatrix: number[][]): number[] {
  if (route.length <= 3) {
    return route.slice();
  }

  let bestRoute = route.slice();
  let bestDistance = computeRouteDistance(bestRoute, distanceMatrix);
  let improved = true;

  while (improved) {
    improved = false;

    for (let start = 1; start < bestRoute.length - 1; start += 1) {
      for (let end = start + 1; end < bestRoute.length; end += 1) {
        const candidateRoute = [
          ...bestRoute.slice(0, start),
          ...bestRoute.slice(start, end + 1).reverse(),
          ...bestRoute.slice(end + 1)
        ];
        const candidateDistance = computeRouteDistance(candidateRoute, distanceMatrix);

        if (candidateDistance + 1e-9 < bestDistance) {
          bestRoute = candidateRoute;
          bestDistance = candidateDistance;
          improved = true;
        }
      }
    }
  }

  return bestRoute;
}

function orderCandidatesWithinRegion(
  candidates: PlannerDayCandidate[],
  beamWidth: number
): PlannerDayCandidate[] {
  if (candidates.length <= 2) {
    return candidates.slice().sort(compareCandidatesByPriority);
  }

  const prioritizedCandidates = candidates.slice().sort(compareCandidatesByPriority);
  const distanceMatrix = buildDistanceMatrix(prioritizedCandidates);
  const beamRoute = runBeamSearch(prioritizedCandidates, distanceMatrix, beamWidth);
  const optimizedRoute = runTwoOpt(beamRoute, distanceMatrix);
  return optimizedRoute.map((index) => prioritizedCandidates[index]);
}

export function buildTimedRouteSummary(
  stops: SchedulableStop[],
  config: IntraRegionRoutingConfig = defaultIntraRegionRoutingConfig
): TimedRouteSummary {
  if (stops.length === 0) {
    return {
      scheduledStops: [],
      startTime: minutesToTimeLabel(config.dayStartMinutes),
      endTime: minutesToTimeLabel(config.dayStartMinutes),
      estimatedVisitHours: 0,
      estimatedTravelKm: 0,
      estimatedTravelMinutes: 0,
      notes: ["buffer_day_no_remaining_candidates"]
    };
  }

  const distanceMatrix = buildDistanceMatrix(stops);
  let currentMinutes = config.dayStartMinutes;
  let totalVisitMinutes = 0;
  let totalTravelMinutes = 0;
  let totalTravelKm = 0;
  let hasTrimmedStopDuration = false;

  const scheduledStops = stops.map((stop, index) => {
    const travelKm = index === 0 ? 0 : distanceMatrix[index - 1][index];
    const travelMinutes = index === 0 ? 0 : travelMinutesFromKm(travelKm, config.averageTravelSpeedKmh);
    currentMinutes += travelMinutes;
    totalTravelMinutes += travelMinutes;
    totalTravelKm += travelKm;

    const rawVisitMinutes = durationMinutes(stop, config);
    const remainingMinutes = Math.max(0, config.dayEndMinutes - currentMinutes);
    const visitMinutes = Math.min(rawVisitMinutes, remainingMinutes);
    if (visitMinutes < rawVisitMinutes) {
      hasTrimmedStopDuration = true;
    }

    const startTime = minutesToTimeLabel(currentMinutes);
    currentMinutes += visitMinutes;
    totalVisitMinutes += visitMinutes;

    return {
      slug: stop.slug,
      startTime,
      endTime: minutesToTimeLabel(currentMinutes),
      travelMinutesFromPrevious: travelMinutes,
      estimatedVisitHours: deterministicRound(visitMinutes / 60, 2)
    };
  });

  const notes = ["region_day_planned"];
  if (hasTrimmedStopDuration) {
    notes.push("stop_duration_trimmed_to_fit_day_window");
  }

  return {
    scheduledStops,
    startTime: scheduledStops[0]?.startTime ?? minutesToTimeLabel(config.dayStartMinutes),
    endTime: scheduledStops[scheduledStops.length - 1]?.endTime ?? minutesToTimeLabel(config.dayStartMinutes),
    estimatedVisitHours: deterministicRound(totalVisitMinutes / 60),
    estimatedTravelKm: roundKm(totalTravelKm, config.distancePrecisionKm),
    estimatedTravelMinutes: totalTravelMinutes,
    notes
  };
}

function planWouldExceedOperatingWindow(
  dayStops: PlannerDayCandidate[],
  candidate: PlannerDayCandidate,
  config: IntraRegionRoutingConfig
): boolean {
  return (
    computeRawScheduledMinutes([...dayStops, candidate], config)
    > config.dayEndMinutes - config.dayStartMinutes
  );
}

function shouldStopDayFill(
  dayStops: PlannerDayCandidate[],
  candidate: PlannerDayCandidate,
  hoursPerDayTarget: number,
  config: IntraRegionRoutingConfig
): boolean {
  return computeRawScheduledMinutes([...dayStops, candidate], config) > hoursPerDayTarget * 60;
}

function allocateStopsToDays(
  orderedCandidates: PlannerDayCandidate[],
  allocatedDays: number,
  hoursPerDayTarget: number,
  config: IntraRegionRoutingConfig
): RegionDailyPlan[] {
  const plans: RegionDailyPlan[] = [];
  let cursor = 0;

  for (let dayIndex = 0; dayIndex < allocatedDays; dayIndex += 1) {
    const regionDayNumber = dayIndex + 1;
    const daysRemainingAfterCurrent = allocatedDays - regionDayNumber;
    const dayStops: PlannerDayCandidate[] = [];

    while (cursor < orderedCandidates.length) {
      const next = orderedCandidates[cursor];
      const stopsRemainingIncludingCandidate = orderedCandidates.length - cursor;
      const minimumStopsNeededToday = stopsRemainingIncludingCandidate > daysRemainingAfterCurrent ? 1 : 0;
      const mustTakeCandidate = dayStops.length < minimumStopsNeededToday;

      if (!mustTakeCandidate && planWouldExceedOperatingWindow(dayStops, next, config)) {
        break;
      }

      if (!mustTakeCandidate && shouldStopDayFill(dayStops, next, hoursPerDayTarget, config)) {
        break;
      }

      dayStops.push(next);
      cursor += 1;
    }

    const summary = buildTimedRouteSummary(dayStops, config);
    const notes = summary.notes.slice();
    const totalScheduledMinutes = Math.round(summary.estimatedVisitHours * 60) + summary.estimatedTravelMinutes;
    if (dayStops.length === 0) {
      notes.splice(0, notes.length, "buffer_day_no_remaining_candidates");
    } else if (totalScheduledMinutes > hoursPerDayTarget * 60) {
      notes.push("soft_hours_target_exceeded_to_preserve_feasible_distribution");
    }

    plans.push({
      regionDayNumber,
      destinationSlugs: dayStops.map((item) => item.slug),
      scheduledStops: summary.scheduledStops,
      startTime: summary.startTime,
      endTime: summary.endTime,
      estimatedVisitHours: summary.estimatedVisitHours,
      estimatedTravelKm: summary.estimatedTravelKm,
      estimatedTravelMinutes: summary.estimatedTravelMinutes,
      notes: Array.from(new Set(notes))
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

    const orderedRoute = orderCandidatesWithinRegion(usableCandidates, config.beamWidth);
    const dailyPlans = allocateStopsToDays(
      orderedRoute,
      bucket.allocatedDays,
      hoursPerDayTarget,
      config
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
        scheduledStops: [],
        startTime: minutesToTimeLabel(config.dayStartMinutes),
        endTime: minutesToTimeLabel(config.dayStartMinutes),
        estimatedVisitHours: 0,
        estimatedTravelKm: 0,
        estimatedTravelMinutes: 0,
        notes: ["unresolved_region_day_slot"]
      };
    }

    return {
      dayNumber: slot.dayNumber,
      region,
      regionDayNumber: currentRegionDay,
      destinationSlugs: regionDayPlan.destinationSlugs,
      scheduledStops: regionDayPlan.scheduledStops,
      startTime: regionDayPlan.startTime,
      endTime: regionDayPlan.endTime,
      estimatedVisitHours: regionDayPlan.estimatedVisitHours,
      estimatedTravelKm: regionDayPlan.estimatedTravelKm,
      estimatedTravelMinutes: regionDayPlan.estimatedTravelMinutes,
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
      approach: "deterministic_beam_search_then_two_opt_intra_region_routing",
      dayFillPolicy: "preserve_one_stop_per_remaining_day_when_feasible_then_fill_to_hours_target_without_exceeding_day_window",
      distanceMetric: "haversine_km_distance_matrix",
      beamWidth: config.beamWidth,
      averageTravelSpeedKmh: config.averageTravelSpeedKmh,
      dayStartTime: minutesToTimeLabel(config.dayStartMinutes),
      dayEndTime: minutesToTimeLabel(config.dayEndMinutes),
      hoursPerDayTarget
    },
    regionRoutes,
    dayPlans,
    unresolvedDaySlots,
    totalPlannedVisitHours: deterministicRound(dayPlans.reduce((sum, day) => sum + day.estimatedVisitHours, 0)),
    totalEstimatedTravelKm: deterministicRound(dayPlans.reduce((sum, day) => sum + day.estimatedTravelKm, 0))
  };
}
