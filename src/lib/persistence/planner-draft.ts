import type { InterestProfile } from "@/types/planner";
import { storageKeys } from "@/lib/persistence/keys";
import { readJsonStorage, writeJsonStorage } from "@/lib/persistence/browser-storage";

export interface PlannerDraft extends InterestProfile {
  selectedDestinationSlugs: string[];
  updatedAt: string;
}

export const defaultPlannerDraft: PlannerDraft = {
  themes: [],
  tripDays: 4,
  pace: "balanced",
  budget: "medium",
  selectedDestinationSlugs: [],
  updatedAt: ""
};

export function readPlannerDraft(): PlannerDraft {
  const raw = readJsonStorage<Partial<PlannerDraft>>(storageKeys.plannerDraft, {});
  return {
    ...defaultPlannerDraft,
    ...raw,
    themes: Array.isArray(raw.themes) ? raw.themes : defaultPlannerDraft.themes,
    selectedDestinationSlugs: Array.isArray(raw.selectedDestinationSlugs)
      ? raw.selectedDestinationSlugs
      : defaultPlannerDraft.selectedDestinationSlugs,
    travelMonth: typeof raw.travelMonth === "number" ? raw.travelMonth : undefined,
    tripDays:
      typeof raw.tripDays === "number" && Number.isFinite(raw.tripDays)
        ? Math.max(1, Math.min(21, Math.floor(raw.tripDays)))
        : defaultPlannerDraft.tripDays,
    pace:
      raw.pace === "relaxed" || raw.pace === "balanced" || raw.pace === "packed"
        ? raw.pace
        : defaultPlannerDraft.pace,
    budget:
      raw.budget === "low" || raw.budget === "medium" || raw.budget === "high"
        ? raw.budget
        : defaultPlannerDraft.budget,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : ""
  };
}

export function writePlannerDraft(draft: PlannerDraft): void {
  writeJsonStorage(storageKeys.plannerDraft, {
    ...draft,
    updatedAt: new Date().toISOString()
  });
}
