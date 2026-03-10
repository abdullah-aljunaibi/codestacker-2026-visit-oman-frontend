import type { InterestProfile } from "@/types/domain";
import {
  readJsonStorageFromKeys,
  removeStorageKeys,
  writeJsonStorage
} from "@/lib/persistence/browser-storage";
import { legacyStorageKeys, storageKeys } from "@/lib/persistence/keys";

type LegacyPlannerDraft = Partial<InterestProfile> & {
  preferredCategories?: unknown;
  tripDurationDays?: unknown;
  travelIntensity?: unknown;
  themes?: unknown;
  tripDays?: unknown;
  pace?: unknown;
  selectedDestinationSlugs?: unknown;
  updatedAt?: unknown;
};

interface PersistedPlannerDraftEnvelope {
  schemaVersion: 2;
  draft: LegacyPlannerDraft;
}

export interface PlannerDraft extends InterestProfile {
  updatedAt: string;
}

function clampTripDays(value: number): PlannerDraft["tripDurationDays"] {
  return Math.max(1, Math.min(7, Math.floor(value))) as PlannerDraft["tripDurationDays"];
}

function getDefaultTravelMonth(): number {
  return new Date().getUTCMonth() + 1;
}

export const defaultPlannerDraft: PlannerDraft = {
  preferredCategories: [],
  tripDurationDays: 4,
  travelIntensity: "balanced",
  budget: "medium",
  travelMonth: getDefaultTravelMonth(),
  updatedAt: ""
};

function normalizePlannerDraft(raw: LegacyPlannerDraft): PlannerDraft {
  const preferredCategorySource = Array.isArray(raw.preferredCategories)
    ? raw.preferredCategories
    : Array.isArray(raw.themes)
      ? raw.themes
      : defaultPlannerDraft.preferredCategories;
  const preferredCategories = preferredCategorySource.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );

  return {
    ...defaultPlannerDraft,
    preferredCategories,
    travelMonth:
      typeof raw.travelMonth === "number" && Number.isFinite(raw.travelMonth)
        ? Math.max(1, Math.min(12, Math.floor(raw.travelMonth)))
        : defaultPlannerDraft.travelMonth,
    tripDurationDays:
      typeof raw.tripDurationDays === "number" && Number.isFinite(raw.tripDurationDays)
        ? clampTripDays(raw.tripDurationDays)
        : typeof raw.tripDays === "number" && Number.isFinite(raw.tripDays)
          ? clampTripDays(raw.tripDays)
          : defaultPlannerDraft.tripDurationDays,
    travelIntensity:
      raw.travelIntensity === "relaxed" ||
      raw.travelIntensity === "balanced" ||
      raw.travelIntensity === "packed"
        ? raw.travelIntensity
        : raw.pace === "relaxed" || raw.pace === "balanced" || raw.pace === "packed"
          ? raw.pace
          : defaultPlannerDraft.travelIntensity,
    budget:
      raw.budget === "low" || raw.budget === "medium" || raw.budget === "luxury"
        ? raw.budget
        : raw.budget === "budget"
          ? "low"
          : raw.budget === "moderate"
            ? "medium"
            : defaultPlannerDraft.budget,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : ""
  };
}

function isPlannerDraftEnvelope(value: unknown): value is PersistedPlannerDraftEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.schemaVersion === 2 && !!record.draft && typeof record.draft === "object";
}

export function readPlannerDraft(): PlannerDraft {
  const persisted = readJsonStorageFromKeys<unknown>(
    [storageKeys.plannerDraft, ...legacyStorageKeys.plannerDraft],
    null
  );

  const isCurrentEnvelope = isPlannerDraftEnvelope(persisted);
  const normalized = isCurrentEnvelope
    ? normalizePlannerDraft(persisted.draft)
    : persisted && typeof persisted === "object"
      ? normalizePlannerDraft(persisted as LegacyPlannerDraft)
      : defaultPlannerDraft;

  if (!isCurrentEnvelope && persisted !== null) {
    writePlannerDraft(normalized);
  }

  return normalized;
}

export function writePlannerDraft(draft: PlannerDraft): void {
  const normalizedDraft = {
    ...draft,
    preferredCategories: draft.preferredCategories.filter(
      (category) => typeof category === "string" && category.length > 0
    ),
    tripDurationDays: clampTripDays(draft.tripDurationDays),
    travelIntensity: draft.travelIntensity,
    budget: draft.budget,
    travelMonth: Math.max(1, Math.min(12, Math.floor(draft.travelMonth))),
    updatedAt: new Date().toISOString()
  };

  writeJsonStorage(storageKeys.plannerDraft, {
    schemaVersion: 2,
    draft: normalizedDraft
  } satisfies PersistedPlannerDraftEnvelope);
}

export function clearPlannerDraft(): void {
  removeStorageKeys([storageKeys.plannerDraft, ...legacyStorageKeys.plannerDraft]);
}
