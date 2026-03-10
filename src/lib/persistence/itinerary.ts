/**
 * Browser persistence helpers for final itinerary and derived cost totals.
 */
import type { BudgetLevel } from "@/types/domain";
import type { Locale } from "@/types/dataset";

import type { PlannerPhase5CFinalItinerary } from "@/lib/planner/final-itinerary";
import { calculateTripCostBreakdown } from "@/lib/planner/cost-model";
import {
  readJsonStorageFromKeys,
  removeStorageKeys,
  writeJsonStorage
} from "@/lib/persistence/browser-storage";
import { legacyStorageKeys, storageKeys } from "@/lib/persistence/keys";

interface PersistedCostBreakdownV1 {
  totalTicketCostOmr: number;
  averageTicketCostPerDayOmr: number;
  paidStopCount: number;
  freeStopCount: number;
  totalStopCount: number;
}

export interface PersistedCostBreakdownV2 {
  schemaVersion: 2;
  datasetVersion: string;
  savedAt: string;
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
  schemaVersion: 2;
  locale: Locale;
  datasetVersion: string;
  savedAt: string;
  selectedDayNumber: number;
  costBreakdown: PersistedCostBreakdownV2;
  itinerary: PlannerPhase5CFinalItinerary;
}

export function deriveCostBreakdown(
  itinerary: PlannerPhase5CFinalItinerary,
  budgetTier: BudgetLevel
): PersistedCostBreakdownV2 {
  return {
    schemaVersion: 2,
    datasetVersion: itinerary.datasetVersion,
    savedAt: new Date().toISOString(),
    ...calculateTripCostBreakdown({
      itinerary,
      budgetTier
    })
  };
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
  persisted: PersistedCostBreakdownV1,
  datasetVersion: string
): PersistedCostBreakdownV2 {
  return {
    schemaVersion: 2,
    datasetVersion,
    savedAt: "",
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

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

function isValidCostBreakdownV2(
  value: unknown,
  options?: { datasetVersion?: string }
): value is PersistedCostBreakdownV2 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    record.schemaVersion === 2 &&
    typeof record.datasetVersion === "string" &&
    typeof record.savedAt === "string" &&
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
    if (
      options?.datasetVersion &&
      record.datasetVersion !== options.datasetVersion
    ) {
      return false;
    }

    return true;
  }

  return false;
}

function isLegacyCostBreakdownV1(value: unknown): value is PersistedCostBreakdownV1 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    isFiniteNumber(record.totalTicketCostOmr) &&
    isFiniteNumber(record.averageTicketCostPerDayOmr) &&
    isFiniteNumber(record.paidStopCount) &&
    isFiniteNumber(record.freeStopCount) &&
    isFiniteNumber(record.totalStopCount)
  ) {
    return true;
  }

  return false;
}

function isValidItineraryEnvelope(
  value: unknown,
  options?: { datasetVersion?: string; locale?: Locale }
): value is PersistedItineraryEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    record.schemaVersion !== 2 ||
    !isLocale(record.locale) ||
    typeof record.datasetVersion !== "string" ||
    typeof record.savedAt !== "string" ||
    !isFiniteNumber(record.selectedDayNumber) ||
    !record.itinerary ||
    !isValidCostBreakdownV2(record.costBreakdown)
  ) {
    return false;
  }

  if (options?.locale && record.locale !== options.locale) {
    return false;
  }

  if (options?.datasetVersion && record.datasetVersion !== options.datasetVersion) {
    return false;
  }

  if (
    (record.costBreakdown as PersistedCostBreakdownV2).datasetVersion !== record.datasetVersion
  ) {
    return false;
  }

  return true;
}

export function readPersistedItinerary(options?: {
  datasetVersion?: string;
  locale?: Locale;
}): PersistedItineraryEnvelope | null {
  const persisted = readJsonStorageFromKeys<unknown>(
    [storageKeys.itinerary, ...legacyStorageKeys.itinerary],
    null
  );

  if (isValidItineraryEnvelope(persisted, options)) {
    return persisted;
  }

  return null;
}

export function readPersistedCostBreakdown(options?: {
  datasetVersion?: string;
}): PersistedCostBreakdownV2 | null {
  const persisted = readJsonStorageFromKeys<unknown>(
    [storageKeys.costBreakdown, ...legacyStorageKeys.costBreakdown],
    null
  );

  if (isValidCostBreakdownV2(persisted, options)) {
    return persisted;
  }

  if (isLegacyCostBreakdownV1(persisted) && options?.datasetVersion) {
    const migrated = migrateLegacyCostBreakdown(persisted, options.datasetVersion);
    writePersistedCostBreakdown(migrated);
    return migrated;
  }

  return null;
}

export function writePersistedCostBreakdown(value: PersistedCostBreakdownV2): void {
  writeJsonStorage(storageKeys.costBreakdown, value);
}

export function clearPersistedItinerary(): void {
  removeStorageKeys([
    storageKeys.itinerary,
    ...legacyStorageKeys.itinerary,
    storageKeys.costBreakdown,
    ...legacyStorageKeys.costBreakdown
  ]);
}
