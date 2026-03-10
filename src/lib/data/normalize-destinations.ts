import type { DatasetDestination, Locale } from "@/types/dataset";

export interface NormalizedDestination extends DatasetDestination {
  region_key: string;
  region_label: string;
  avg_visit_duration_hours: number;
}

export function getRegionKey(destination: Pick<DatasetDestination, "region">): string {
  return destination.region.en;
}

export function getLocalizedRegionLabel(
  destination: Pick<DatasetDestination, "region">,
  locale: Locale
): string {
  return destination.region[locale];
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function normalizeDestination(
  destination: DatasetDestination,
  locale: Locale
): NormalizedDestination {
  return {
    ...destination,
    region_key: getRegionKey(destination),
    region_label: getLocalizedRegionLabel(destination, locale),
    avg_visit_duration_hours: minutesToHours(destination.avg_visit_duration_minutes)
  };
}
