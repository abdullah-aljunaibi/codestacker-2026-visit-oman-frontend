/**
 * Deterministic final itinerary assembly with post-generation repair integration.
 */
import type { Destination } from "@/types/domain";

import type {
  PlannerHandoffRouteCandidate,
  PlannerPhase4CHandoff
} from "@/lib/planner/candidate-ranking";
import type { PlannerPhase5BIntraRegionRouting } from "@/lib/planner/intra-region-routing";
import type { WeightedScoreBreakdown } from "@/lib/planner/weighted-scoring-engine";
import { repairGeneratedItinerary } from "@/lib/planner/itinerary-repair";

export interface ItineraryStop {
  slug: string;
  name: Destination["name"];
  region: string;
  description: Destination["description"];
  startTime: string;
  endTime: string;
  travelMinutesFromPrevious: number;
  estimatedVisitHours: number;
  ticketCostOmr: number;
  crowdLevel: Destination["crowd_level"];
  rank: number | null;
  score: number | null;
  reasonCodes: string[];
  scoreBreakdown: WeightedScoreBreakdown | null;
  topContributors: WeightedScoreBreakdown["topContributors"];
}

export interface PlannerPhase5CItineraryDay {
  dayNumber: number;
  region: string;
  regionDayNumber: number;
  stops: ItineraryStop[];
  stopCount: number;
  startTime: string;
  endTime: string;
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  estimatedTravelMinutes: number;
  estimatedTicketCostOmr: number;
  notes: string[];
}

export interface ItineraryRepairAction {
  type: "budget_swap" | "underutilized_fill";
  dayNumber: number;
  region: string;
  removedSlug?: string;
  addedSlug: string;
  deltaCostOmr: number;
  deltaVisitHours: number;
  reason: string;
}

export interface ItineraryRepairSummary {
  budgetTargetOmr: number;
  initialTotalCostOmr: number;
  finalTotalCostOmr: number;
  actions: ItineraryRepairAction[];
}

export interface PlannerPhase5CFinalItinerary {
  itineraryVersion: string;
  planningContextId: string;
  sourceHandoffVersion: string;
  sourceAllocationVersion: string;
  sourceRoutingVersion: string;
  datasetVersion: string;
  tripDays: number;
  totals: {
    dayCount: number;
    stopCount: number;
    unresolvedDayCount: number;
    estimatedVisitHours: number;
    estimatedTravelKm: number;
  };
  days: PlannerPhase5CItineraryDay[];
  itineraryNotes: string[];
  repairSummary: ItineraryRepairSummary;
}

const itineraryVersion = "phase-5c-v2";

function deterministicRound(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toCandidateMap(handoff: PlannerPhase4CHandoff): Map<string, PlannerHandoffRouteCandidate> {
  const map = new Map<string, PlannerHandoffRouteCandidate>();
  handoff.routeGenerationInput.selectedCandidates.forEach((candidate) => {
    map.set(candidate.slug, candidate);
  });
  handoff.routeGenerationInput.waitlistCandidates.forEach((candidate) => {
    if (!map.has(candidate.slug)) {
      map.set(candidate.slug, candidate);
    }
  });
  return map;
}

function toDestinationMap(destinations: Destination[]): Map<string, Destination> {
  const map = new Map<string, Destination>();
  destinations.forEach((destination) => {
    map.set(destination.slug, destination);
  });
  return map;
}

function buildStop(
  slug: string,
  region: string,
  scheduledStop: PlannerPhase5BIntraRegionRouting["dayPlans"][number]["scheduledStops"][number] | undefined,
  candidateMap: Map<string, PlannerHandoffRouteCandidate>,
  destinationMap: Map<string, Destination>
): ItineraryStop {
  const candidate = candidateMap.get(slug);
  const destination = destinationMap.get(slug);

  return {
    slug,
    name: destination?.name ?? { en: slug, ar: slug },
    description: destination?.description ?? { en: slug, ar: slug },
    region: destination?.regionKey ?? candidate?.region ?? region,
    startTime: scheduledStop?.startTime ?? "",
    endTime: scheduledStop?.endTime ?? "",
    travelMinutesFromPrevious: scheduledStop?.travelMinutesFromPrevious ?? 0,
    estimatedVisitHours:
      scheduledStop?.estimatedVisitHours
      ?? candidate?.recommendedDurationHours
      ?? destination?.recommendedDurationHours
      ?? 0,
    ticketCostOmr: destination?.ticket_cost_omr ?? 0,
    crowdLevel: destination?.crowd_level ?? 3,
    rank: candidate?.rank ?? null,
    score: candidate?.score ?? null,
    reasonCodes: candidate?.reasonCodes ?? [],
    scoreBreakdown: candidate?.scoreBreakdown ?? null,
    topContributors: candidate?.topContributors ?? []
  };
}

export function assembleFinalItinerary(input: {
  handoff: PlannerPhase4CHandoff;
  routing: PlannerPhase5BIntraRegionRouting;
  destinations: Destination[];
}): PlannerPhase5CFinalItinerary {
  const candidateMap = toCandidateMap(input.handoff);
  const destinationMap = toDestinationMap(input.destinations);

  const initialDays: PlannerPhase5CItineraryDay[] = input.routing.dayPlans
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const timedStops = new Map(day.scheduledStops.map((stop) => [stop.slug, stop]));
      const stops: ItineraryStop[] = day.destinationSlugs.map((slug) =>
        buildStop(slug, day.region, timedStops.get(slug), candidateMap, destinationMap)
      );
      const estimatedTicketCostOmr = deterministicRound(
        stops.reduce((sum, stop) => sum + stop.ticketCostOmr, 0),
        2
      );

      return {
        dayNumber: day.dayNumber,
        region: day.region,
        regionDayNumber: day.regionDayNumber,
        stops,
        stopCount: stops.length,
        startTime: day.startTime,
        endTime: day.endTime,
        estimatedVisitHours: day.estimatedVisitHours,
        estimatedTravelKm: day.estimatedTravelKm,
        estimatedTravelMinutes: day.estimatedTravelMinutes,
        estimatedTicketCostOmr,
        notes: day.notes.slice()
      };
    });

  const repaired = repairGeneratedItinerary({
    handoff: input.handoff,
    routing: input.routing,
    destinations: input.destinations,
    days: initialDays
  });

  const unresolvedDayCount = repaired.days.filter((day) =>
    day.notes.includes("unresolved_region_day_slot")
  ).length;
  const stopCount = repaired.days.reduce((sum, day) => sum + day.stopCount, 0);

  const itineraryNotes = repaired.itineraryNotes.slice();
  if (unresolvedDayCount > 0) {
    itineraryNotes.push("contains_unresolved_day_slots");
  }
  if (stopCount === 0) {
    itineraryNotes.push("no_planned_stops");
  } else {
    itineraryNotes.push("deterministic_itinerary_assembled_with_repair");
  }

  return {
    itineraryVersion,
    planningContextId: input.routing.planningContextId,
    sourceHandoffVersion: input.handoff.handoffVersion,
    sourceAllocationVersion: input.routing.sourceAllocationVersion,
    sourceRoutingVersion: input.routing.routingVersion,
    datasetVersion: input.routing.datasetVersion,
    tripDays: input.routing.tripDays,
    totals: {
      dayCount: repaired.days.length,
      stopCount,
      unresolvedDayCount,
      estimatedVisitHours: deterministicRound(
        repaired.days.reduce((sum, day) => sum + day.estimatedVisitHours, 0)
      ),
      estimatedTravelKm: deterministicRound(
        repaired.days.reduce((sum, day) => sum + day.estimatedTravelKm, 0)
      )
    },
    days: repaired.days,
    itineraryNotes: Array.from(new Set(itineraryNotes)),
    repairSummary: repaired.repairSummary
  };
}
