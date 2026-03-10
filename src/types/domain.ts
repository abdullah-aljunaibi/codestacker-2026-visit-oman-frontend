import type { DatasetDestination, Locale, LocalizedText } from "@/types/dataset";

export type BudgetLevel = "low" | "medium" | "luxury";
export type TripDayCount = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type TravelIntensity = "relaxed" | "balanced" | "packed";

export interface InterestProfile {
  preferredCategories: string[];
  tripDurationDays: TripDayCount;
  travelIntensity: TravelIntensity;
  budget: BudgetLevel;
  travelMonth: number;
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
  coordinates: {
    lat: number;
    lng: number;
  };
  heroImage: {
    src: string;
    width: number;
    height: number;
    theme: string;
  };
  description: LocalizedText;
  budgetLevel: BudgetLevel;
  recommendedDurationHours: number;
  regionKey: DatasetDestination["region"]["en"];
  regionLabel: string;
  locale: Locale;
}
