export type Locale = "en" | "ar";

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface Destination {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  region: string;
  coordinates: { lat: number; lng: number };
  tags: string[];
  idealVisitMonths: number[];
  costLevel: "low" | "medium" | "high";
  recommendedDurationHours: number;
  popularityScore: number;
}

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
