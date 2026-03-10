/**
 * Deterministic itinerary repair for budget control and under-utilized day fill.
 */
import type { Destination } from "@/types/domain";

import type { PlannerPhase4CHandoff } from "@/lib/planner/candidate-ranking";
import { buildTimedRouteSummary, type PlannerPhase5BIntraRegionRouting } from "@/lib/planner/intra-region-routing";
import { haversineDistanceKm } from "@/lib/planner/scoring-utils";
import type { WeightedScoreBreakdown } from "@/lib/planner/weighted-scoring-engine";
import type {
  ItineraryRepairAction,
  ItineraryRepairSummary,
  ItineraryStop,
  PlannerPhase5CItineraryDay
} from "@/lib/planner/final-itinerary";
import { budgetLevelToTargetCost } from "@/lib/planner/scoring-utils";

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
    travelMinutesFromPrevious: 0,
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

function computeDayTravelKm(day: PlannerPhase5CItineraryDay, destinationMap: Map<string, Destination>): number {
  if (day.stops.length <= 1) {
    return 0;
  }

  let total = 0;
  for (let index = 1; index < day.stops.length; index += 1) {
    const previous = destinationMap.get(day.stops[index - 1].slug);
    const current = destinationMap.get(day.stops[index].slug);
    if (!previous || !current) {
      continue;
    }

    total += haversineDistanceKm(previous.coordinates, current.coordinates);
  }

  return deterministicRound(total, 3);
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

function updateDayMetrics(
  day: PlannerPhase5CItineraryDay,
  destinationMap: Map<string, Destination>
): PlannerPhase5CItineraryDay {
  const schedulableStops = day.stops
    .map((stop) => {
      const destination = destinationMap.get(stop.slug);
      if (!destination) {
        return null;
      }

      return {
        slug: stop.slug,
        coordinates: destination.coordinates,
        recommendedDurationHours: stop.estimatedVisitHours
      };
    })
    .filter((stop): stop is NonNullable<typeof stop> => stop !== null);
  const schedule = buildTimedRouteSummary(schedulableStops);
  const scheduledStopsBySlug = new Map(schedule.scheduledStops.map((stop) => [stop.slug, stop]));

  return {
    ...day,
    stops: day.stops.map((stop) => {
      const scheduledStop = scheduledStopsBySlug.get(stop.slug);
      return {
        ...stop,
        startTime: scheduledStop?.startTime ?? stop.startTime,
        endTime: scheduledStop?.endTime ?? stop.endTime,
        travelMinutesFromPrevious: scheduledStop?.travelMinutesFromPrevious ?? stop.travelMinutesFromPrevious,
        estimatedVisitHours: scheduledStop?.estimatedVisitHours ?? stop.estimatedVisitHours
      };
    }),
    stopCount: day.stops.length,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    estimatedVisitHours: schedule.estimatedVisitHours,
    estimatedTravelKm: computeDayTravelKm(day, destinationMap),
    estimatedTravelMinutes: schedule.estimatedTravelMinutes,
    estimatedTicketCostOmr: deterministicRound(
      day.stops.reduce((sum, stop) => sum + stop.ticketCostOmr, 0),
      2
    )
  };
}

function categoryOverlapForReplacement(current: Destination, alternative: Destination): number {
  return overlapCount(current.categories, alternative.categories);
}

function minDistanceToDayStops(
  day: PlannerPhase5CItineraryDay,
  candidate: Destination,
  destinationMap: Map<string, Destination>
): number {
  if (day.stops.length === 0) {
    return 0;
  }

  return day.stops.reduce((best, stop) => {
    const destination = destinationMap.get(stop.slug);
    if (!destination) {
      return best;
    }

    return Math.min(best, haversineDistanceKm(destination.coordinates, candidate.coordinates));
  }, Number.POSITIVE_INFINITY);
}

export function repairGeneratedItinerary(input: ItineraryRepairInput): ItineraryRepairResult {
  const destinationMap = toDestinationMap(input.destinations);
  const candidateSignals = toCandidateSignalMap(input.handoff);
  const tripBudgetTargetOmr = deterministicRound(
    budgetLevelToTargetCost(input.handoff.profile.budget) * input.routing.tripDays,
    2
  );
  const hoursPerDayTarget = input.routing.routingPolicy.hoursPerDayTarget;
  const days = input.days.map((day) => ({
    ...day,
    stops: day.stops.slice(),
    notes: day.notes.slice()
  }));
  const itineraryNotes: string[] = [];
  const actions: ItineraryRepairAction[] = [];
  const scheduledSlugs = new Set(days.flatMap((day) => day.stops.map((stop) => stop.slug)));
  const initialTotalCostOmr = computeTotalTicketCost(days, destinationMap);
  let runningTotalCostOmr = initialTotalCostOmr;

  if (runningTotalCostOmr > tripBudgetTargetOmr) {
    const expensiveStops = days
      .flatMap((day, dayIndex) =>
        day.stops.map((stop, stopIndex) => ({
          dayIndex,
          stopIndex,
          stop,
          cost: destinationMap.get(stop.slug)?.ticket_cost_omr ?? 0
        }))
      )
      .sort((a, b) => {
        if (b.cost !== a.cost) {
          return b.cost - a.cost;
        }
        if (a.dayIndex !== b.dayIndex) {
          return a.dayIndex - b.dayIndex;
        }
        return a.stop.slug.localeCompare(b.stop.slug);
      });

    expensiveStops.forEach((entry) => {
      if (runningTotalCostOmr <= tripBudgetTargetOmr) {
        return;
      }

      const currentDestination = destinationMap.get(entry.stop.slug);
      const day = days[entry.dayIndex];
      if (!currentDestination) {
        return;
      }

      const alternatives = input.destinations
        .filter((destination) => destination.regionKey === day.region)
        .filter((destination) => !scheduledSlugs.has(destination.slug))
        .filter((destination) => destination.ticket_cost_omr < currentDestination.ticket_cost_omr)
        .filter((destination) => categoryOverlapForReplacement(currentDestination, destination) > 0)
        .sort((a, b) => {
          const savingsA = currentDestination.ticket_cost_omr - a.ticket_cost_omr;
          const savingsB = currentDestination.ticket_cost_omr - b.ticket_cost_omr;
          if (savingsB !== savingsA) {
            return savingsB - savingsA;
          }

          const overlapA = categoryOverlapForReplacement(currentDestination, a);
          const overlapB = categoryOverlapForReplacement(currentDestination, b);
          if (overlapB !== overlapA) {
            return overlapB - overlapA;
          }

          const scoreA = candidateSignals.get(a.slug)?.score ?? 0;
          const scoreB = candidateSignals.get(b.slug)?.score ?? 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          return a.slug.localeCompare(b.slug);
        });

      const replacement = alternatives[0];
      if (!replacement) {
        return;
      }

      scheduledSlugs.delete(entry.stop.slug);
      scheduledSlugs.add(replacement.slug);
      day.stops[entry.stopIndex] = buildStop(replacement, day.region, candidateSignals);
      day.notes.push("budget_repair_swap_applied");
      days[entry.dayIndex] = updateDayMetrics(day, destinationMap);

      const deltaCostOmr = deterministicRound(
        replacement.ticket_cost_omr - currentDestination.ticket_cost_omr,
        2
      );
      const deltaVisitHours = deterministicRound(
        day.stops[entry.stopIndex].estimatedVisitHours - entry.stop.estimatedVisitHours
      );
      runningTotalCostOmr = deterministicRound(runningTotalCostOmr + deltaCostOmr, 2);
      actions.push({
        type: "budget_swap",
        dayNumber: day.dayNumber,
        region: day.region,
        removedSlug: entry.stop.slug,
        addedSlug: replacement.slug,
        deltaCostOmr,
        deltaVisitHours,
        reason: "swap_expensive_stop_for_cheaper_same_region_category_option"
      });
    });

    if (actions.some((action) => action.type === "budget_swap")) {
      itineraryNotes.push("budget_repair_applied");
    }
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

      const addedStop = buildStop(addition, day.region, candidateSignals);
      day.stops.push(addedStop);
      day.notes.push("underutilized_day_fill_added");
      scheduledSlugs.add(addition.slug);
      days[dayIndex] = updateDayMetrics(day, destinationMap);
      runningTotalCostOmr = deterministicRound(runningTotalCostOmr + addition.ticket_cost_omr, 2);
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

  return {
    days: days.map((day) => ({
      ...updateDayMetrics(day, destinationMap),
      notes: Array.from(new Set(day.notes))
    })),
    itineraryNotes,
    repairSummary: {
      budgetTargetOmr: tripBudgetTargetOmr,
      initialTotalCostOmr,
      finalTotalCostOmr: runningTotalCostOmr,
      actions
    }
  };
}
