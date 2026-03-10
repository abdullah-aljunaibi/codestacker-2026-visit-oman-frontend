import type { InterestProfile } from "@/types/domain";
import { readJsonStorage, writeJsonStorage } from "@/lib/persistence/browser-storage";
import { storageKeys } from "@/lib/persistence/keys";

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
  budget: "moderate",
  travelMonth: getDefaultTravelMonth(),
  updatedAt: ""
};

export function readPlannerDraft(): PlannerDraft {
  const raw = readJsonStorage<LegacyPlannerDraft>(storageKeys.plannerDraft, {});
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
      raw.budget === "budget" || raw.budget === "moderate" || raw.budget === "luxury"
        ? raw.budget
        : raw.budget === "low"
          ? "budget"
          : raw.budget === "medium"
            ? "moderate"
            : defaultPlannerDraft.budget,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : ""
  };
}

export function writePlannerDraft(draft: PlannerDraft): void {
  writeJsonStorage(storageKeys.plannerDraft, {
    ...draft,
    preferredCategories: draft.preferredCategories.filter(
      (category) => typeof category === "string" && category.length > 0
    ),
    tripDurationDays: clampTripDays(draft.tripDurationDays),
    travelIntensity: draft.travelIntensity,
    budget: draft.budget,
    travelMonth: Math.max(1, Math.min(12, Math.floor(draft.travelMonth))),
    updatedAt: new Date().toISOString()
  });
}
