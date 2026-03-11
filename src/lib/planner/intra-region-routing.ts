/**
 * Deterministic intra-region routing with bounded beam search, validity-checked
 * 2-opt refinement, and hard-constrained same-region day plans.
 */
import type { TravelIntensity } from "@/types/domain";

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
  maxDailyDrivingKm: number;
  maxDailyVisitMinutes: number;
  longStopThresholdMinutes: number;
  shortStopThresholdMinutes: number;
  maxStopsPerDay: Record<TravelIntensity, number>;
}

interface PlannerDayCandidate extends PlannerHandoffRouteCandidate {
  originalIndex: number;
}

export interface SchedulableStop {
  slug: string;
  region: string;
  categories: string[];
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
  stopCount: number;
  unresolvedReason: string | null;
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
  visitDurationMinutes: number;
  travelMinutesFromPrevious: number;
  travelKmFromPrevious: number;
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
  stopCount: number;
  unresolvedReason: string | null;
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
    maxDailyDrivingKm: number;
    maxDailyVisitHours: number;
    maxStopsPerDay: Record<TravelIntensity, number>;
    categoryRepeatCap: number;
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
  totalScore: number;
}

interface RouteValidationContext {
  travelIntensity: TravelIntensity;
  allowCategoryRepeatByPreference: boolean;
}

interface RouteEvaluation {
  isValid: boolean;
  failureReason: string | null;
  scheduledStops: PlannerTimedStop[];
  startTime: string;
  endTime: string;
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  estimatedTravelMinutes: number;
  totalVisitMinutes: number;
  stopCount: number;
  notes: string[];
}

export interface TimedRouteSummary extends RouteEvaluation {
  unresolvedReason: string | null;
}

const defaultIntraRegionRoutingConfig: IntraRegionRoutingConfig = {
  version: "phase-5b-v3",
  distancePrecisionKm: 3,
  beamWidth: 4,
  averageTravelSpeedKmh: 55,
  dayStartMinutes: 8 * 60,
  dayEndMinutes: 20 * 60,
  maxDailyDrivingKm: 250,
  maxDailyVisitMinutes: 8 * 60,
  longStopThresholdMinutes: 90,
  shortStopThresholdMinutes: 45,
  maxStopsPerDay: {
    relaxed: 3,
    balanced: 4,
    packed: 5
  }
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

function durationMinutes(
  stop: Pick<SchedulableStop, "recommendedDurationHours">,
  _config: IntraRegionRoutingConfig
): number {
  return Math.max(30, Math.round(stop.recommendedDurationHours * 60));
}

function travelMinutesFromKm(distanceKm: number, averageTravelSpeedKmh: number): number {
  if (distanceKm <= 0) {
    return 0;
  }

  return Math.max(5, Math.round((distanceKm / averageTravelSpeedKmh) * 60));
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

function maxStopsForIntensity(
  travelIntensity: TravelIntensity,
  config: IntraRegionRoutingConfig
): number {
  return config.maxStopsPerDay[travelIntensity];
}

function evaluateRoute(
  stops: SchedulableStop[],
  context: RouteValidationContext,
  config: IntraRegionRoutingConfig = defaultIntraRegionRoutingConfig
): RouteEvaluation {
  const baseSummary = {
    scheduledStops: [] as PlannerTimedStop[],
    startTime: minutesToTimeLabel(config.dayStartMinutes),
    endTime: minutesToTimeLabel(config.dayStartMinutes),
    estimatedVisitHours: 0,
    estimatedTravelKm: 0,
    estimatedTravelMinutes: 0,
    totalVisitMinutes: 0,
    stopCount: stops.length
  };

  if (stops.length === 0) {
    return {
      isValid: true,
      failureReason: null,
      ...baseSummary,
      notes: ["buffer_day_no_remaining_candidates"]
    };
  }

  if (stops.length > maxStopsForIntensity(context.travelIntensity, config)) {
    return {
      isValid: false,
      failureReason: "stop_cap_exceeded",
      ...baseSummary,
      notes: ["daily_stop_cap_exceeded"]
    };
  }

  const region = stops[0].region;
  if (stops.some((stop) => stop.region !== region)) {
    return {
      isValid: false,
      failureReason: "cross_region_day_not_allowed",
      ...baseSummary,
      notes: ["same_region_day_required"]
    };
  }

  const categoryCounts = new Map<string, number>();
  const operatingWindowMinutes = config.dayEndMinutes - config.dayStartMinutes;
  const distanceMatrix = buildDistanceMatrix(stops);
  let currentMinutes = config.dayStartMinutes;
  let totalVisitMinutes = 0;
  let totalTravelMinutes = 0;
  let totalTravelKm = 0;
  let previousWasLongStop = false;
  const scheduledStops: PlannerTimedStop[] = [];

  for (let index = 0; index < stops.length; index += 1) {
    const stop = stops[index];
    const visitMinutes = durationMinutes(stop, config);

    if (visitMinutes > config.maxDailyVisitMinutes) {
      return {
        isValid: false,
        failureReason: "single_stop_visit_limit_exceeded",
        ...baseSummary,
        notes: ["daily_visit_limit_exceeded"]
      };
    }

    if (!context.allowCategoryRepeatByPreference) {
      const wouldExceed = stop.categories.some((category) => {
        const nextCount = (categoryCounts.get(category) ?? 0) + 1;
        return nextCount > 2;
      });
      if (wouldExceed) {
        return {
          isValid: false,
          failureReason: "category_repeat_cap_exceeded",
          ...baseSummary,
          notes: ["daily_category_repeat_cap_exceeded"]
        };
      }
    }

    const currentIsLongStop = visitMinutes > config.longStopThresholdMinutes;
    if (previousWasLongStop && currentIsLongStop) {
      return {
        isValid: false,
        failureReason: "rest_gap_rule_violated",
        ...baseSummary,
        notes: ["rest_gap_rule_violated"]
      };
    }

    const travelKm = index === 0 ? 0 : distanceMatrix[index - 1][index];
    const travelMinutes = index === 0 ? 0 : travelMinutesFromKm(travelKm, config.averageTravelSpeedKmh);

    totalTravelKm += travelKm;
    if (totalTravelKm - config.maxDailyDrivingKm > 1e-9) {
      return {
        isValid: false,
        failureReason: "daily_driving_distance_exceeded",
        ...baseSummary,
        notes: ["daily_driving_distance_exceeded"]
      };
    }

    currentMinutes += travelMinutes;
    totalTravelMinutes += travelMinutes;
    totalVisitMinutes += visitMinutes;

    if (totalVisitMinutes > config.maxDailyVisitMinutes) {
      return {
        isValid: false,
        failureReason: "daily_visit_limit_exceeded",
        ...baseSummary,
        notes: ["daily_visit_limit_exceeded"]
      };
    }

    if (currentMinutes + visitMinutes > config.dayEndMinutes) {
      return {
        isValid: false,
        failureReason: "operating_window_exceeded",
        ...baseSummary,
        notes: ["operating_window_exceeded"]
      };
    }

    const startTime = minutesToTimeLabel(currentMinutes);
    currentMinutes += visitMinutes;
    scheduledStops.push({
      slug: stop.slug,
      startTime,
      endTime: minutesToTimeLabel(currentMinutes),
      visitDurationMinutes: visitMinutes,
      travelMinutesFromPrevious: travelMinutes,
      travelKmFromPrevious: roundKm(travelKm, config.distancePrecisionKm),
      estimatedVisitHours: deterministicRound(visitMinutes / 60, 2)
    });

    stop.categories.forEach((category) => {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    });

    previousWasLongStop = currentIsLongStop;
  }

  if (currentMinutes - config.dayStartMinutes > operatingWindowMinutes) {
    return {
      isValid: false,
      failureReason: "operating_window_exceeded",
      ...baseSummary,
      notes: ["operating_window_exceeded"]
    };
  }

  return {
    isValid: true,
    failureReason: null,
    scheduledStops,
    startTime: scheduledStops[0]?.startTime ?? minutesToTimeLabel(config.dayStartMinutes),
    endTime: scheduledStops[scheduledStops.length - 1]?.endTime ?? minutesToTimeLabel(config.dayStartMinutes),
    estimatedVisitHours: deterministicRound(totalVisitMinutes / 60, 2),
    estimatedTravelKm: roundKm(totalTravelKm, config.distancePrecisionKm),
    estimatedTravelMinutes: totalTravelMinutes,
    totalVisitMinutes,
    stopCount: stops.length,
    notes: ["region_day_planned"]
  };
}

function compareBeamStates(
  a: BeamState,
  b: BeamState,
  candidates: PlannerDayCandidate[]
): number {
  if (b.route.length !== a.route.length) {
    return b.route.length - a.route.length;
  }
  if (b.totalScore !== a.totalScore) {
    return b.totalScore - a.totalScore;
  }
  if (a.distanceKm !== b.distanceKm) {
    return a.distanceKm - b.distanceKm;
  }

  return routeSignature(a.route, candidates).localeCompare(routeSignature(b.route, candidates));
}

function runConstrainedBeamSearch(input: {
  candidates: PlannerDayCandidate[];
  beamWidth: number;
  maxSelectableStops: number;
  context: RouteValidationContext;
  config: IntraRegionRoutingConfig;
}): number[] {
  const { candidates, beamWidth, maxSelectableStops, context, config } = input;
  const prioritizedIndices = candidates
    .map((_, index) => index)
    .sort((left, right) => compareCandidatesByPriority(candidates[left], candidates[right]));

  let beam: BeamState[] = [{
    route: [],
    visitedMask: 0,
    distanceKm: 0,
    totalScore: 0
  }];
  let bestState = beam[0];

  for (let depth = 0; depth < maxSelectableStops; depth += 1) {
    const expansions: BeamState[] = [];

    beam.forEach((state) => {
      const last = state.route[state.route.length - 1];
      prioritizedIndices.forEach((candidateIndex) => {
        if ((state.visitedMask & (1 << candidateIndex)) !== 0) {
          return;
        }

        const candidateRoute = [...state.route, candidateIndex];
        const stopEvaluation = evaluateRoute(
          candidateRoute.map((index) => candidates[index]),
          context,
          config
        );
        if (!stopEvaluation.isValid) {
          return;
        }

        const nextDistance = state.route.length === 0
          ? 0
          : deterministicRound(
            state.distanceKm
            + buildDistanceMatrix(
              [candidates[last], candidates[candidateIndex]]
            )[0][1]
          );

        expansions.push({
          route: candidateRoute,
          visitedMask: state.visitedMask | (1 << candidateIndex),
          distanceKm: nextDistance,
          totalScore: deterministicRound(state.totalScore + candidates[candidateIndex].score)
        });
      });
    });

    if (expansions.length === 0) {
      break;
    }

    const deduped = new Map<string, BeamState>();
    expansions
      .sort((left, right) => compareBeamStates(left, right, candidates))
      .forEach((state) => {
        const signature = state.route.join("|");
        if (!deduped.has(signature)) {
          deduped.set(signature, state);
        }
      });

    beam = [...deduped.values()].slice(0, beamWidth);
    if (compareBeamStates(beam[0], bestState, candidates) < 0) {
      bestState = beam[0];
    }
  }

  return bestState.route;
}

function runTwoOpt(
  route: number[],
  candidates: PlannerDayCandidate[],
  distanceMatrix: number[][],
  context: RouteValidationContext,
  config: IntraRegionRoutingConfig
): number[] {
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
        const evaluation = evaluateRoute(
          candidateRoute.map((index) => candidates[index]),
          context,
          config
        );
        if (!evaluation.isValid) {
          continue;
        }

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

export function buildTimedRouteSummary(
  stops: SchedulableStop[],
  options: Partial<RouteValidationContext> = {},
  config: IntraRegionRoutingConfig = defaultIntraRegionRoutingConfig
): TimedRouteSummary {
  const evaluation = evaluateRoute(stops, {
    travelIntensity: options.travelIntensity ?? "packed",
    allowCategoryRepeatByPreference: options.allowCategoryRepeatByPreference ?? false
  }, config);

  return {
    ...evaluation,
    unresolvedReason: evaluation.failureReason
  };
}

function planRegionDays(input: {
  orderedCandidates: PlannerDayCandidate[];
  allocatedDays: number;
  travelIntensity: TravelIntensity;
  allowCategoryRepeatByPreference: boolean;
  config: IntraRegionRoutingConfig;
}): RegionDailyPlan[] {
  const {
    orderedCandidates,
    allocatedDays,
    travelIntensity,
    allowCategoryRepeatByPreference,
    config
  } = input;
  const plans: RegionDailyPlan[] = [];
  let remainingCandidates = orderedCandidates.slice();

  for (let dayIndex = 0; dayIndex < allocatedDays; dayIndex += 1) {
    const regionDayNumber = dayIndex + 1;
    const remainingDaysAfterCurrent = allocatedDays - regionDayNumber;
    const reserveForFutureDays = Math.min(
      Math.max(remainingCandidates.length - 1, 0),
      remainingDaysAfterCurrent
    );
    const maxSelectableStops = Math.min(
      maxStopsForIntensity(travelIntensity, config),
      Math.max(0, remainingCandidates.length - reserveForFutureDays)
    );

    if (remainingCandidates.length === 0 || maxSelectableStops === 0) {
      plans.push({
        regionDayNumber,
        destinationSlugs: [],
        scheduledStops: [],
        startTime: minutesToTimeLabel(config.dayStartMinutes),
        endTime: minutesToTimeLabel(config.dayStartMinutes),
        estimatedVisitHours: 0,
        estimatedTravelKm: 0,
        estimatedTravelMinutes: 0,
        stopCount: 0,
        unresolvedReason: null,
        notes: ["buffer_day_no_remaining_candidates"]
      });
      continue;
    }

    const distanceMatrix = buildDistanceMatrix(remainingCandidates);
    const beamRoute = runConstrainedBeamSearch({
      candidates: remainingCandidates,
      beamWidth: config.beamWidth,
      maxSelectableStops,
      context: {
        travelIntensity,
        allowCategoryRepeatByPreference
      },
      config
    });
    const optimizedRoute = runTwoOpt(
      beamRoute,
      remainingCandidates,
      distanceMatrix,
      {
        travelIntensity,
        allowCategoryRepeatByPreference
      },
      config
    );
    const dayStops = optimizedRoute.map((index) => remainingCandidates[index]);
    const summary = buildTimedRouteSummary(dayStops, {
      travelIntensity,
      allowCategoryRepeatByPreference
    }, config);

    if (!summary.isValid || dayStops.length === 0) {
      plans.push({
        regionDayNumber,
        destinationSlugs: [],
        scheduledStops: [],
        startTime: minutesToTimeLabel(config.dayStartMinutes),
        endTime: minutesToTimeLabel(config.dayStartMinutes),
        estimatedVisitHours: 0,
        estimatedTravelKm: 0,
        estimatedTravelMinutes: 0,
        stopCount: 0,
        unresolvedReason: remainingCandidates.length > 0
          ? (summary.failureReason ?? "no_valid_same_region_day_plan")
          : null,
        notes: remainingCandidates.length > 0
          ? ["unresolved_region_day_slot"]
          : ["buffer_day_no_remaining_candidates"]
      });
      continue;
    }

    const selectedSlugs = new Set(dayStops.map((candidate) => candidate.slug));
    remainingCandidates = remainingCandidates.filter((candidate) => !selectedSlugs.has(candidate.slug));

    plans.push({
      regionDayNumber,
      destinationSlugs: dayStops.map((item) => item.slug),
      scheduledStops: summary.scheduledStops,
      startTime: summary.startTime,
      endTime: summary.endTime,
      estimatedVisitHours: summary.estimatedVisitHours,
      estimatedTravelKm: summary.estimatedTravelKm,
      estimatedTravelMinutes: summary.estimatedTravelMinutes,
      stopCount: summary.stopCount,
      unresolvedReason: null,
      notes: summary.notes
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
  const travelIntensity = input.handoff.profile.travelIntensity;
  const allowCategoryRepeatByPreference = input.handoff.profile.preferredCategories.length <= 1;

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

    const dailyPlans = planRegionDays({
      orderedCandidates: usableCandidates,
      allocatedDays: bucket.allocatedDays,
      travelIntensity,
      allowCategoryRepeatByPreference,
      config
    });

    const assignedSlugs = new Set(dailyPlans.flatMap((plan) => plan.destinationSlugs));
    const droppedCandidateSlugs = usableCandidates
      .map((candidate) => candidate.slug)
      .filter((slug) => !assignedSlugs.has(slug));

    return {
      region: bucket.region,
      allocatedDays: bucket.allocatedDays,
      orderedCandidateSlugs: dailyPlans.flatMap((plan) => plan.destinationSlugs),
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
        stopCount: 0,
        unresolvedReason: "missing_region_day_plan",
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
      stopCount: regionDayPlan.stopCount,
      unresolvedReason: regionDayPlan.unresolvedReason,
      notes: regionDayPlan.notes
    };
  });

  const unresolvedDaySlots = dayPlans
    .filter((plan) => plan.unresolvedReason !== null)
    .map((plan) => ({
      dayNumber: plan.dayNumber,
      region: plan.region,
      reason: plan.unresolvedReason ?? "missing_region_day_plan"
    }));

  return {
    routingVersion: config.version,
    planningContextId: input.allocation.planningContextId,
    sourceHandoffVersion: input.handoff.handoffVersion,
    sourceAllocationVersion: input.allocation.allocationVersion,
    datasetVersion: input.allocation.datasetVersion,
    tripDays: input.allocation.tripDays,
    routingPolicy: {
      approach: "deterministic_same_region_daily_beam_search_then_validity_checked_two_opt",
      dayFillPolicy: "reject_invalid_candidates_before_expansion_spill_unfitting_stops_to_next_same_region_day",
      distanceMetric: "haversine_km_distance_matrix",
      beamWidth: config.beamWidth,
      averageTravelSpeedKmh: config.averageTravelSpeedKmh,
      dayStartTime: minutesToTimeLabel(config.dayStartMinutes),
      dayEndTime: minutesToTimeLabel(config.dayEndMinutes),
      hoursPerDayTarget: input.allocation.allocationPolicy.hoursPerDay,
      maxDailyDrivingKm: config.maxDailyDrivingKm,
      maxDailyVisitHours: deterministicRound(config.maxDailyVisitMinutes / 60, 2),
      maxStopsPerDay: config.maxStopsPerDay,
      categoryRepeatCap: 2
    },
    regionRoutes,
    dayPlans,
    unresolvedDaySlots,
    totalPlannedVisitHours: deterministicRound(dayPlans.reduce((sum, day) => sum + day.estimatedVisitHours, 0)),
    totalEstimatedTravelKm: deterministicRound(dayPlans.reduce((sum, day) => sum + day.estimatedTravelKm, 0))
  };
}
