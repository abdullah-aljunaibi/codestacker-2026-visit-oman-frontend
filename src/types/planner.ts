import type { DatasetDestination } from "@/types/dataset";

export interface InterestProfile {
  themes: string[];
  tripDays: number;
  pace: "relaxed" | "balanced" | "packed";
  budget: "low" | "medium" | "high";
  travelMonth?: number;
}

export interface ItineraryDay {
  dayNumber: number;
  destinationSlugs: string[];
}

export interface PlannerExplanation {
  weights: Record<string, number>;
  selectionReasons: Record<string, string[]>;
  exclusionReasons: Record<string, string[]>;
}

export interface ItineraryPlan {
  id: string;
  input: InterestProfile;
  days: ItineraryDay[];
  score: number;
  explanation: PlannerExplanation;
}

export interface PlannerContext {
  datasetVersion: string;
  destinations: DatasetDestination[];
}

export interface PlannerEngine {
  generate(profile: InterestProfile, context: PlannerContext): ItineraryPlan;
}
