export type Locale = "en" | "ar";

export interface LocalizedText {
  en: string;
  ar: string;
}

export type DatasetRegionKey = "muscat" | "dakhiliya" | "sharqiya" | "dhofar" | "batinah" | "musandam";
export type DatasetCategory = "mountain" | "beach" | "culture" | "desert" | "nature" | "food";
export type DatasetCrowdLevel = 1 | 2 | 3 | 4 | 5;

export interface DatasetDestination {
  id: string;
  slug: string;
  name: LocalizedText;
  lat: number;
  lng: number;
  region: {
    en: DatasetRegionKey;
    ar: string;
  };
  categories: DatasetCategory[];
  recommended_months: number[];
  company: LocalizedText;
  ticket_cost_omr: number;
  avg_visit_duration_minutes: number;
  crowd_level: DatasetCrowdLevel;
  image: string;
  images: string[];
}
