import type { Destination } from "@/types/domain";

import type { PlannerPhase4CHandoff, PlannerHandoffRouteCandidate } from "@/lib/planner/candidate-ranking";
import type { PlannerPhase5BIntraRegionRouting } from "@/lib/planner/intra-region-routing";

interface ItineraryStop {
  slug: string;
  name: Destination["name"];
  region: string;
  estimatedVisitHours: number;
  rank: number | null;
  score: number | null;
  reasonCodes: string[];
}

export interface PlannerPhase5CItineraryDay {
  dayNumber: number;
  region: string;
  regionDayNumber: number;
  stops: ItineraryStop[];
  stopCount: number;
  estimatedVisitHours: number;
  estimatedTravelKm: number;
  notes: string[];
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
}

const itineraryVersion = "phase-5c-v1";

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

export function assembleFinalItinerary(input: {
  handoff: PlannerPhase4CHandoff;
  routing: PlannerPhase5BIntraRegionRouting;
  destinations: Destination[];
}): PlannerPhase5CFinalItinerary {
  const candidateMap = toCandidateMap(input.handoff);
  const destinationMap = toDestinationMap(input.destinations);

  const days: PlannerPhase5CItineraryDay[] = input.routing.dayPlans
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const stops: ItineraryStop[] = day.destinationSlugs.map((slug) => {
        const candidate = candidateMap.get(slug);
        const destination = destinationMap.get(slug);

        return {
          slug,
          name: destination?.name ?? { en: slug, ar: slug },
          region: candidate?.region ?? day.region,
          estimatedVisitHours: candidate?.recommendedDurationHours ?? 0,
          rank: candidate?.rank ?? null,
          score: candidate?.score ?? null,
          reasonCodes: candidate?.reasonCodes ?? []
        };
      });

      return {
        dayNumber: day.dayNumber,
        region: day.region,
        regionDayNumber: day.regionDayNumber,
        stops,
        stopCount: stops.length,
        estimatedVisitHours: day.estimatedVisitHours,
        estimatedTravelKm: day.estimatedTravelKm,
        notes: day.notes
      };
    });

  const unresolvedDayCount = days.filter((day) => day.notes.includes("unresolved_region_day_slot")).length;
  const stopCount = days.reduce((sum, day) => sum + day.stopCount, 0);

  const itineraryNotes: string[] = [];
  if (unresolvedDayCount > 0) {
    itineraryNotes.push("contains_unresolved_day_slots");
  }
  if (stopCount === 0) {
    itineraryNotes.push("no_planned_stops");
  } else {
    itineraryNotes.push("deterministic_itinerary_assembled_from_phase_5b");
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
      dayCount: days.length,
      stopCount,
      unresolvedDayCount,
      estimatedVisitHours: deterministicRound(input.routing.totalPlannedVisitHours),
      estimatedTravelKm: deterministicRound(input.routing.totalEstimatedTravelKm)
    },
    days,
    itineraryNotes
  };
}
