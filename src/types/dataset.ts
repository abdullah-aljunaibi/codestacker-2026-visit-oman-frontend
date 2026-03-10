export type Locale = "en" | "ar";

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface DatasetCoordinates {
  lat: number;
  lng: number;
}

export interface DatasetDestination {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  region: LocalizedText;
  coordinates: DatasetCoordinates;
  categories: string[];
  idealVisitMonths: number[];
  ticket_cost_omr: number;
  avg_visit_duration_minutes: number;
  crowd_level: 1 | 2 | 3 | 4 | 5;
  company: string;
}
