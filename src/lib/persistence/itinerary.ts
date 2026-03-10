/**
 * Browser persistence helpers for final itinerary and derived cost totals.
 */
import type { Destination } from "@/types/domain";
import type { Locale } from "@/types/dataset";

import type { PlannerPhase5CFinalItinerary } from "@/lib/planner/final-itinerary";
import { readJsonStorage, removeStorageKey, writeJsonStorage } from "@/lib/persistence/browser-storage";
import { storageKeys } from "@/lib/persistence/keys";

export interface PersistedCostBreakdown {
  totalTicketCostOmr: number;
  averageTicketCostPerDayOmr: number;
  paidStopCount: number;
  freeStopCount: number;
  totalStopCount: number;
}

export interface PersistedItineraryEnvelope {
  locale: Locale;
  datasetVersion: string;
  savedAt: string;
  itinerary: PlannerPhase5CFinalItinerary;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function deriveCostBreakdown(
  itinerary: PlannerPhase5CFinalItinerary,
  destinations: Destination[]
): PersistedCostBreakdown {
  const destinationMap = new Map(destinations.map((destination) => [destination.slug, destination]));
  let totalTicketCostOmr = 0;
  let paidStopCount = 0;
  let freeStopCount = 0;

  itinerary.days.forEach((day) => {
    day.stops.forEach((stop) => {
      const ticketCost = destinationMap.get(stop.slug)?.ticket_cost_omr ?? 0;
      totalTicketCostOmr += ticketCost;
      if (ticketCost > 0) {
        paidStopCount += 1;
      } else {
        freeStopCount += 1;
      }
    });
  });

  return {
    totalTicketCostOmr: roundCurrency(totalTicketCostOmr),
    averageTicketCostPerDayOmr:
      itinerary.tripDays > 0 ? roundCurrency(totalTicketCostOmr / itinerary.tripDays) : 0,
    paidStopCount,
    freeStopCount,
    totalStopCount: itinerary.totals.stopCount
  };
}

export function readPersistedItinerary(): PersistedItineraryEnvelope | null {
  const persisted = readJsonStorage<PersistedItineraryEnvelope | null>(storageKeys.itinerary, null);
  if (!persisted || typeof persisted !== "object") {
    return null;
  }

  if (
    persisted.locale !== "en" &&
    persisted.locale !== "ar"
  ) {
    return null;
  }

  if (
    typeof persisted.datasetVersion !== "string" ||
    typeof persisted.savedAt !== "string" ||
    !persisted.itinerary
  ) {
    return null;
  }

  return persisted;
}

export function writePersistedItinerary(value: PersistedItineraryEnvelope): void {
  writeJsonStorage(storageKeys.itinerary, value);
}

export function readPersistedCostBreakdown(): PersistedCostBreakdown | null {
  const persisted = readJsonStorage<PersistedCostBreakdown | null>(storageKeys.costBreakdown, null);
  if (!persisted || typeof persisted !== "object") {
    return null;
  }

  if (
    typeof persisted.totalTicketCostOmr !== "number" ||
    typeof persisted.averageTicketCostPerDayOmr !== "number" ||
    typeof persisted.paidStopCount !== "number" ||
    typeof persisted.freeStopCount !== "number" ||
    typeof persisted.totalStopCount !== "number"
  ) {
    return null;
  }

  return persisted;
}

export function writePersistedCostBreakdown(value: PersistedCostBreakdown): void {
  writeJsonStorage(storageKeys.costBreakdown, value);
}

export function clearPersistedItinerary(): void {
  removeStorageKey(storageKeys.itinerary);
  removeStorageKey(storageKeys.costBreakdown);
}
