import type { DatasetDestination, Locale } from "@/types/dataset";

export type BudgetLevel = "budget" | "moderate" | "luxury";

export interface InterestProfile {
  themes: string[];
  tripDays: number;
  pace: "relaxed" | "balanced" | "packed";
  budget: BudgetLevel;
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

export interface Destination extends DatasetDestination {
  budgetLevel: BudgetLevel;
  recommendedDurationHours: number;
  regionKey: string;
  regionLabel: string;
  locale: Locale;
}
