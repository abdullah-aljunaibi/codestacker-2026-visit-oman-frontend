/**
 * Deterministic itinerary repair for budget control and under-utilized day fill.
 */
import type { Destination } from "@/types/domain";

import type { PlannerPhase4CHandoff } from "@/lib/planner/candidate-ranking";
import { buildTimedRouteSummary, type PlannerPhase5BIntraRegionRouting } from "@/lib/planner/intra-region-routing";
import { tripCostConfig } from "@/lib/planner/cost-model";
import { haversineDistanceKm } from "@/lib/planner/scoring-utils";
import type { WeightedScoreBreakdown } from "@/lib/planner/weighted-scoring-engine";
import type {
  ItineraryRepairAction,
  ItineraryRepairSummary,
  ItineraryStop,
  PlannerPhase5CItineraryDay
} from "@/lib/planner/final-itinerary";

interface ItineraryRepairInput {
  handoff: PlannerPhase4CHandoff;
  routing: PlannerPhase5BIntraRegionRouting;
  destinations: Destination[];
  days: PlannerPhase5CItineraryDay[];
}

interface ItineraryRepairResult {
  days: PlannerPhase5CItineraryDay[];
  itineraryNotes: string[];
  repairSummary: ItineraryRepairSummary;
}

interface RankedCandidateSignal {
  rank: number;
  score: number;
  reasonCodes: string[];
  recommendedDurationHours: number;
  scoreBreakdown: WeightedScoreBreakdown;
  topContributors: WeightedScoreBreakdown["topContributors"];
}

interface ReplacementMove {
  dayIndex: number;
  stopIndex: number;
  currentStop: ItineraryStop;
  currentDestination: Destination;
  replacement: Destination;
  detourKm: number;
}

interface TripCostState {
  ticketCostOmr: number;
  totalCostOmr: number;
  budgetThresholdOmr: number;
}

function deterministicRound(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function overlapCount(a: string[], b: string[]): number {
  const reference = new Set(b);
  return a.filter((value) => reference.has(value)).length;
}

function toDestinationMap(destinations: Destination[]): Map<string, Destination> {
  return new Map(destinations.map((destination) => [destination.slug, destination]));
}

function toCandidateSignalMap(handoff: PlannerPhase4CHandoff): Map<string, RankedCandidateSignal> {
  const candidates = [
    ...handoff.routeGenerationInput.selectedCandidates,
    ...handoff.routeGenerationInput.waitlistCandidates
  ];

  return new Map(
    candidates.map((candidate) => [
      candidate.slug,
      {
        rank: candidate.rank,
        score: candidate.score,
        reasonCodes: candidate.reasonCodes,
        recommendedDurationHours: candidate.recommendedDurationHours,
        scoreBreakdown: candidate.scoreBreakdown,
        topContributors: candidate.topContributors
      }
    ])
  );
}

function buildStop(
  destination: Destination,
  region: string,
  candidateSignals: Map<string, RankedCandidateSignal>
): ItineraryStop {
  const rankedCandidate = candidateSignals.get(destination.slug);

  return {
    slug: destination.slug,
    name: destination.name,
    description: destination.description,
    region,
    startTime: "",
    endTime: "",
    visitDurationMinutes: 0,
    travelMinutesFromPrevious: 0,
    travelKmFromPrevious: 0,
    estimatedVisitHours: rankedCandidate?.recommendedDurationHours ?? destination.recommendedDurationHours,
    ticketCostOmr: destination.ticket_cost_omr,
    crowdLevel: destination.crowd_level,
    rank: rankedCandidate?.rank ?? null,
    score: rankedCandidate?.score ?? null,
    reasonCodes: rankedCandidate?.reasonCodes ?? [],
    scoreBreakdown: rankedCandidate?.scoreBreakdown ?? null,
    topContributors: rankedCandidate?.topContributors ?? []
  };
}

function computeTotalTicketCost(
  days: PlannerPhase5CItineraryDay[],
  destinationMap: Map<string, Destination>
): number {
  return deterministicRound(
    days.reduce(
      (total, day) =>
        total
        + day.stops.reduce(
          (dayTotal, stop) => dayTotal + (destinationMap.get(stop.slug)?.ticket_cost_omr ?? 0),
          0
        ),
      0
    ),
    2
  );
}

function computeTripCostState(input: {
  days: PlannerPhase5CItineraryDay[];
  destinationMap: Map<string, Destination>;
  budgetLevel: PlannerPhase4CHandoff["profile"]["budget"];
  tripDays: number;
}): TripCostState {
  const ticketCostOmr = computeTotalTicketCost(input.days, input.destinationMap);
  const totalKm = deterministicRound(
    input.days.reduce((sum, day) => sum + day.estimatedTravelKm, 0),
    2
  );
  const fuelCostOmr = deterministicRound(
    (totalKm / tripCostConfig.vehicleKmPerLiter) * tripCostConfig.fuelPriceOmrPerLiter,
    2
  );
  const foodCostOmr = deterministicRound(tripCostConfig.foodCostOmrPerDay[input.budgetLevel] * input.tripDays, 2);
  const hotelCostOmr = deterministicRound(
    tripCostConfig.hotelNightlyRateOmr[input.budgetLevel] * Math.max(input.tripDays - 1, 0),
    2
  );

  return {
    ticketCostOmr,
    totalCostOmr: deterministicRound(ticketCostOmr + fuelCostOmr + foodCostOmr + hotelCostOmr, 2),
    budgetThresholdOmr: deterministicRound(
      tripCostConfig.budgetThresholdOmrPerDay[input.budgetLevel] * input.tripDays,
      2
    )
  };
}

function updateDayMetrics(
  day: PlannerPhase5CItineraryDay,
  destinationMap: Map<string, Destination>,
  options: {
    travelIntensity: PlannerPhase4CHandoff["profile"]["travelIntensity"];
    allowCategoryRepeatByPreference: boolean;
  }
): PlannerPhase5CItineraryDay {
  const schedulableStops = day.stops
    .map((stop) => {
      const destination = destinationMap.get(stop.slug);
      if (!destination) {
        return null;
      }

      return {
        slug: stop.slug,
        region: destination.regionKey,
        categories: destination.categories,
        coordinates: destination.coordinates,
        recommendedDurationHours: stop.estimatedVisitHours
      };
    })
    .filter((stop): stop is NonNullable<typeof stop> => stop !== null);
  const schedule = buildTimedRouteSummary(schedulableStops, options);
  const scheduledStopsBySlug = new Map(schedule.scheduledStops.map((stop) => [stop.slug, stop]));

  return {
    ...day,
    stops: day.stops.map((stop) => {
      const scheduledStop = scheduledStopsBySlug.get(stop.slug);
      return {
        ...stop,
        startTime: scheduledStop?.startTime ?? stop.startTime,
        endTime: scheduledStop?.endTime ?? stop.endTime,
        visitDurationMinutes: scheduledStop?.visitDurationMinutes ?? stop.visitDurationMinutes,
        travelMinutesFromPrevious: scheduledStop?.travelMinutesFromPrevious ?? stop.travelMinutesFromPrevious,
        travelKmFromPrevious: scheduledStop?.travelKmFromPrevious ?? stop.travelKmFromPrevious,
        estimatedVisitHours: scheduledStop?.estimatedVisitHours ?? stop.estimatedVisitHours
      };
    }),
    stopCount: day.stops.length,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    estimatedVisitHours: schedule.estimatedVisitHours,
    estimatedTravelKm: schedule.estimatedTravelKm,
    estimatedTravelMinutes: schedule.estimatedTravelMinutes,
    unresolvedReason: schedule.unresolvedReason,
    estimatedTicketCostOmr: deterministicRound(
      day.stops.reduce((sum, stop) => sum + stop.ticketCostOmr, 0),
      2
    )
  };
}

function categoryOverlapForReplacement(current: Destination, alternative: Destination): number {
  return overlapCount(current.categories, alternative.categories);
}

function buildCategoryCoverageCounts(
  days: PlannerPhase5CItineraryDay[],
  destinationMap: Map<string, Destination>
): Map<string, number> {
  const counts = new Map<string, number>();

  days.forEach((day) => {
    day.stops.forEach((stop) => {
      const destination = destinationMap.get(stop.slug);
      destination?.categories.forEach((category) => {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      });
    });
  });

  return counts;
}

function preservesCategoryCoverage(
  currentDestination: Destination,
  replacement: Destination,
  categoryCoverageCounts: Map<string, number>
): boolean {
  const replacementCategories = new Set(replacement.categories);

  return currentDestination.categories.every((category) => {
    const currentCount = categoryCoverageCounts.get(category) ?? 0;
    return currentCount > 1 || replacementCategories.has(category);
  });
}

function minDistanceToDayStops(
  day: PlannerPhase5CItineraryDay,
  candidate: Destination,
  destinationMap: Map<string, Destination>,
  options?: {
    excludeStopSlug?: string;
  }
): number {
  if (day.stops.length === 0) {
    return 0;
  }

  const bestDistance = day.stops.reduce((best, stop) => {
    if (options?.excludeStopSlug && stop.slug === options.excludeStopSlug) {
      return best;
    }

    const destination = destinationMap.get(stop.slug);
    if (!destination) {
      return best;
    }

    return Math.min(best, haversineDistanceKm(destination.coordinates, candidate.coordinates));
  }, Number.POSITIVE_INFINITY);

  return Number.isFinite(bestDistance) ? bestDistance : 0;
}

function stopValueForCost(stop: ItineraryStop, destinationMap: Map<string, Destination>): number {
  const cost = destinationMap.get(stop.slug)?.ticket_cost_omr ?? stop.ticketCostOmr;
  if (cost <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const score = stop.score ?? 0;
  return deterministicRound(score / cost);
}

function sortStopsByRepairPriority(
  a: { stop: ItineraryStop; dayIndex: number; stopIndex: number },
  b: { stop: ItineraryStop; dayIndex: number; stopIndex: number },
  destinationMap: Map<string, Destination>
): number {
  const valueDelta =
    stopValueForCost(a.stop, destinationMap) - stopValueForCost(b.stop, destinationMap);
  if (valueDelta !== 0) {
    return valueDelta;
  }

  if (b.stop.ticketCostOmr !== a.stop.ticketCostOmr) {
    return b.stop.ticketCostOmr - a.stop.ticketCostOmr;
  }

  if (b.stop.travelKmFromPrevious !== a.stop.travelKmFromPrevious) {
    return b.stop.travelKmFromPrevious - a.stop.travelKmFromPrevious;
  }

  if (a.dayIndex !== b.dayIndex) {
    return a.dayIndex - b.dayIndex;
  }

  if (a.stopIndex !== b.stopIndex) {
    return a.stopIndex - b.stopIndex;
  }

  return a.stop.slug.localeCompare(b.stop.slug);
}

function findBestBudgetReplacement(input: {
  days: PlannerPhase5CItineraryDay[];
  destinations: Destination[];
  destinationMap: Map<string, Destination>;
  candidateSignals: Map<string, RankedCandidateSignal>;
  scheduledSlugs: Set<string>;
}): ReplacementMove | null {
  const categoryCoverageCounts = buildCategoryCoverageCounts(input.days, input.destinationMap);
  const rankedStops = input.days
    .flatMap((day, dayIndex) =>
      day.stops.map((stop, stopIndex) => ({
        dayIndex,
        stopIndex,
        stop
      }))
    )
    .filter((entry) => entry.stop.ticketCostOmr > 0)
    .sort((a, b) => sortStopsByRepairPriority(a, b, input.destinationMap));

  for (const entry of rankedStops) {
    const day = input.days[entry.dayIndex];
    const currentDestination = input.destinationMap.get(entry.stop.slug);
    if (!currentDestination) {
      continue;
    }

    const alternatives = input.destinations
      .filter((destination) => destination.regionKey === day.region)
      .filter((destination) => !input.scheduledSlugs.has(destination.slug))
      .filter((destination) => destination.ticket_cost_omr < currentDestination.ticket_cost_omr)
      .filter((destination) =>
        preservesCategoryCoverage(currentDestination, destination, categoryCoverageCounts)
      )
      .map((destination) => ({
        destination,
        detourKm: minDistanceToDayStops(day, destination, input.destinationMap, {
          excludeStopSlug: entry.stop.slug
        }),
        overlap: categoryOverlapForReplacement(currentDestination, destination),
        score: input.candidateSignals.get(destination.slug)?.score ?? 0
      }))
      .sort((a, b) => {
        const freeA = a.destination.ticket_cost_omr === 0 ? 1 : 0;
        const freeB = b.destination.ticket_cost_omr === 0 ? 1 : 0;
        if (freeB !== freeA) {
          return freeB - freeA;
        }

        if (a.destination.ticket_cost_omr !== b.destination.ticket_cost_omr) {
          return a.destination.ticket_cost_omr - b.destination.ticket_cost_omr;
        }

        if (b.overlap !== a.overlap) {
          return b.overlap - a.overlap;
        }

        if (a.detourKm !== b.detourKm) {
          return a.detourKm - b.detourKm;
        }

        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.destination.slug.localeCompare(b.destination.slug);
      });

    const replacement = alternatives[0];
    if (!replacement) {
      continue;
    }

    return {
      dayIndex: entry.dayIndex,
      stopIndex: entry.stopIndex,
      currentStop: entry.stop,
      currentDestination,
      replacement: replacement.destination,
      detourKm: replacement.detourKm
    };
  }

  return null;
}

export function repairGeneratedItinerary(input: ItineraryRepairInput): ItineraryRepairResult {
  const destinationMap = toDestinationMap(input.destinations);
  const candidateSignals = toCandidateSignalMap(input.handoff);
  const schedulingOptions = {
    travelIntensity: input.handoff.profile.travelIntensity,
    allowCategoryRepeatByPreference: input.handoff.profile.preferredCategories.length <= 1
  };
  const hoursPerDayTarget = input.routing.routingPolicy.hoursPerDayTarget;
  const days = input.days.map((day) => ({
    ...day,
    stops: day.stops.slice(),
    notes: day.notes.slice()
  }));
  const itineraryNotes: string[] = [];
  const repairNotes: string[] = [];
  const actions: ItineraryRepairAction[] = [];
  const scheduledSlugs = new Set(days.flatMap((day) => day.stops.map((stop) => stop.slug)));
  const initialCostState = computeTripCostState({
    days,
    destinationMap,
    budgetLevel: input.handoff.profile.budget,
    tripDays: input.routing.tripDays
  });
  let runningCostState = initialCostState;
  let repairTriggered = false;

  if (runningCostState.totalCostOmr > runningCostState.budgetThresholdOmr) {
    repairTriggered = true;
    repairNotes.push("budget_repair_triggered");

    while (runningCostState.totalCostOmr > runningCostState.budgetThresholdOmr) {
      const move = findBestBudgetReplacement({
        days,
        destinations: input.destinations,
        destinationMap,
        candidateSignals,
        scheduledSlugs
      });

      if (!move) {
        repairNotes.push("budget_repair_no_better_replacement");
        break;
      }

      const day = days[move.dayIndex];
      scheduledSlugs.delete(move.currentStop.slug);
      scheduledSlugs.add(move.replacement.slug);
      day.stops[move.stopIndex] = buildStop(move.replacement, day.region, candidateSignals);
      day.notes.push("budget_repair_swap_applied");

      const updatedDay = updateDayMetrics(day, destinationMap, schedulingOptions);
      if (updatedDay.unresolvedReason) {
        scheduledSlugs.delete(move.replacement.slug);
        scheduledSlugs.add(move.currentStop.slug);
        day.stops[move.stopIndex] = move.currentStop;
        repairNotes.push("budget_repair_route_preserved");
        continue;
      }

      days[move.dayIndex] = updatedDay;
      const previousCostState = runningCostState;
      runningCostState = computeTripCostState({
        days,
        destinationMap,
        budgetLevel: input.handoff.profile.budget,
        tripDays: input.routing.tripDays
      });

      actions.push({
        type: "budget_swap",
        dayNumber: day.dayNumber,
        region: day.region,
        removedSlug: move.currentStop.slug,
        addedSlug: move.replacement.slug,
        deltaCostOmr: deterministicRound(
          runningCostState.totalCostOmr - previousCostState.totalCostOmr,
          2
        ),
        deltaVisitHours: deterministicRound(
          updatedDay.stops[move.stopIndex].estimatedVisitHours - move.currentStop.estimatedVisitHours
        ),
        reason: "swap_worst_value_stop_for_lower_cost_same_region_option"
      });
    }

    if (actions.some((action) => action.type === "budget_swap")) {
      itineraryNotes.push("budget_repair_applied");
      repairNotes.push("budget_repair_preserved_category_coverage");
    }
  } else {
    repairNotes.push("budget_repair_not_needed");
  }

  days.forEach((day, dayIndex) => {
    while (day.estimatedVisitHours < hoursPerDayTarget * 0.6) {
      const candidates = input.destinations
        .filter((destination) => destination.regionKey === day.region)
        .filter((destination) => !scheduledSlugs.has(destination.slug))
        .sort((a, b) => {
          const distanceA = minDistanceToDayStops(day, a, destinationMap);
          const distanceB = minDistanceToDayStops(day, b, destinationMap);
          if (distanceA !== distanceB) {
            return distanceA - distanceB;
          }

          const scoreA = candidateSignals.get(a.slug)?.score ?? 0;
          const scoreB = candidateSignals.get(b.slug)?.score ?? 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }

          if (a.ticket_cost_omr !== b.ticket_cost_omr) {
            return a.ticket_cost_omr - b.ticket_cost_omr;
          }
          return a.slug.localeCompare(b.slug);
        });

      const addition = candidates[0];
      if (!addition) {
        break;
      }

      const projectedDay = updateDayMetrics({
        ...day,
        stops: [...day.stops, buildStop(addition, day.region, candidateSignals)]
      }, destinationMap, schedulingOptions);
      const projectedDays = days.map((existingDay, index) =>
        index === dayIndex ? projectedDay : existingDay
      );
      const projectedCostState = computeTripCostState({
        days: projectedDays,
        destinationMap,
        budgetLevel: input.handoff.profile.budget,
        tripDays: input.routing.tripDays
      });
      if (projectedCostState.totalCostOmr > projectedCostState.budgetThresholdOmr) {
        break;
      }

      const addedStop = buildStop(addition, day.region, candidateSignals);
      day.stops.push(addedStop);
      day.notes.push("underutilized_day_fill_added");
      scheduledSlugs.add(addition.slug);
      const updatedDay = updateDayMetrics(day, destinationMap, schedulingOptions);
      if (updatedDay.unresolvedReason) {
        day.stops.pop();
        scheduledSlugs.delete(addition.slug);
        break;
      }
      days[dayIndex] = updatedDay;
      runningCostState = computeTripCostState({
        days,
        destinationMap,
        budgetLevel: input.handoff.profile.budget,
        tripDays: input.routing.tripDays
      });
      actions.push({
        type: "underutilized_fill",
        dayNumber: day.dayNumber,
        region: day.region,
        addedSlug: addition.slug,
        deltaCostOmr: deterministicRound(addition.ticket_cost_omr, 2),
        deltaVisitHours: deterministicRound(addedStop.estimatedVisitHours),
        reason: "add_nearby_same_region_attraction_to_fill_underutilized_day"
      });
    }
  });

  if (actions.some((action) => action.type === "underutilized_fill")) {
    itineraryNotes.push("underutilized_day_fill_applied");
  }

  if (repairTriggered) {
    if (runningCostState.totalCostOmr <= runningCostState.budgetThresholdOmr) {
      repairNotes.push("budget_repair_completed_within_budget");
    } else {
      repairNotes.push("budget_repair_budget_gap_remaining");
    }
  }

  return {
    days: days.map((day) => ({
      ...updateDayMetrics(day, destinationMap, schedulingOptions),
      notes: Array.from(new Set(day.notes))
    })),
    itineraryNotes,
    repairSummary: {
      repairTriggered,
      repairNotes: Array.from(new Set(repairNotes)),
      budgetTargetOmr: runningCostState.budgetThresholdOmr,
      initialTotalCostOmr: initialCostState.totalCostOmr,
      finalTotalCostOmr: runningCostState.totalCostOmr,
      actions
    }
  };
}
