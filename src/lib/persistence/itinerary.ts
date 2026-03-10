/**
 * Browser persistence helpers for final itinerary and derived cost totals.
 */
import type { BudgetLevel } from "@/types/domain";
import type { Locale } from "@/types/dataset";

import type { PlannerPhase5CFinalItinerary } from "@/lib/planner/final-itinerary";
import { calculateTripCostBreakdown } from "@/lib/planner/cost-model";
import { readJsonStorage, removeStorageKey, writeJsonStorage } from "@/lib/persistence/browser-storage";
import { storageKeys } from "@/lib/persistence/keys";

interface PersistedCostBreakdownV1 {
  totalTicketCostOmr: number;
  averageTicketCostPerDayOmr: number;
  paidStopCount: number;
  freeStopCount: number;
  totalStopCount: number;
}

export interface PersistedCostBreakdownV2 {
  schemaVersion: 2;
  fuelCostOmr: number;
  ticketsCostOmr: number;
  foodCostOmr: number;
  hotelCostOmr: number;
  totalCostOmr: number;
  averageCostPerDayOmr: number;
  paidStopCount: number;
  freeStopCount: number;
  totalStopCount: number;
  budgetTier: BudgetLevel;
  budgetThresholdOmr: number;
  withinBudget: boolean;
}

export interface PersistedItineraryEnvelope {
  locale: Locale;
  datasetVersion: string;
  savedAt: string;
  itinerary: PlannerPhase5CFinalItinerary;
}

export function deriveCostBreakdown(
  itinerary: PlannerPhase5CFinalItinerary,
  budgetTier: BudgetLevel
): PersistedCostBreakdownV2 {
  return {
    schemaVersion: 2,
    ...calculateTripCostBreakdown({
      itinerary,
      budgetTier
    })
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

function isBudgetLevel(value: unknown): value is BudgetLevel {
  return value === "low" || value === "medium" || value === "luxury";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function migrateLegacyCostBreakdown(
  persisted: PersistedCostBreakdownV1
): PersistedCostBreakdownV2 {
  return {
    schemaVersion: 2,
    fuelCostOmr: 0,
    ticketsCostOmr: persisted.totalTicketCostOmr,
    foodCostOmr: 0,
    hotelCostOmr: 0,
    totalCostOmr: persisted.totalTicketCostOmr,
    averageCostPerDayOmr: persisted.averageTicketCostPerDayOmr,
    paidStopCount: persisted.paidStopCount,
    freeStopCount: persisted.freeStopCount,
    totalStopCount: persisted.totalStopCount,
    budgetTier: "medium",
    budgetThresholdOmr: 0,
    withinBudget: false
  };
}

export function readPersistedCostBreakdown(): PersistedCostBreakdownV2 | null {
  const persisted = readJsonStorage<unknown>(storageKeys.costBreakdown, null);
  if (!persisted || typeof persisted !== "object") {
    return null;
  }

  const record = persisted as Record<string, unknown>;

  if (
    record.schemaVersion === 2 &&
    isFiniteNumber(record.fuelCostOmr) &&
    isFiniteNumber(record.ticketsCostOmr) &&
    isFiniteNumber(record.foodCostOmr) &&
    isFiniteNumber(record.hotelCostOmr) &&
    isFiniteNumber(record.totalCostOmr) &&
    isFiniteNumber(record.averageCostPerDayOmr) &&
    isFiniteNumber(record.paidStopCount) &&
    isFiniteNumber(record.freeStopCount) &&
    isFiniteNumber(record.totalStopCount) &&
    isBudgetLevel(record.budgetTier) &&
    isFiniteNumber(record.budgetThresholdOmr) &&
    typeof record.withinBudget === "boolean"
  ) {
    return record as unknown as PersistedCostBreakdownV2;
  }

  if (
    isFiniteNumber(record.totalTicketCostOmr) &&
    isFiniteNumber(record.averageTicketCostPerDayOmr) &&
    isFiniteNumber(record.paidStopCount) &&
    isFiniteNumber(record.freeStopCount) &&
    isFiniteNumber(record.totalStopCount)
  ) {
    return migrateLegacyCostBreakdown(record as unknown as PersistedCostBreakdownV1);
  }

  return null;
}

export function writePersistedCostBreakdown(value: PersistedCostBreakdownV2): void {
  writeJsonStorage(storageKeys.costBreakdown, value);
}

export function clearPersistedItinerary(): void {
  removeStorageKey(storageKeys.itinerary);
  removeStorageKey(storageKeys.costBreakdown);
}
