/**
 * Dataset-to-domain normalization helpers for planner-ready destinations.
 */
import type { BudgetLevel, Destination } from "@/types/domain";
import type { DatasetDestination, Locale } from "@/types/dataset";

import {
  buildDestinationDescription,
  getDestinationHeroImage
} from "@/lib/data/destination-presentation";

const regionLabelsEn: Record<DatasetDestination["region"]["en"], string> = {
  muscat: "Muscat",
  dakhiliya: "Dakhiliya",
  sharqiya: "Sharqiya",
  dhofar: "Dhofar",
  batinah: "Batinah",
  dhahira: "Dhahira"
};

export function getRegionKey(
  destination: Pick<DatasetDestination, "region">
): DatasetDestination["region"]["en"] {
  return destination.region.en;
}

export function getLocalizedRegionLabel(
  destination: Pick<DatasetDestination, "region">,
  locale: Locale
): string {
  return locale === "ar" ? destination.region.ar : regionLabelsEn[destination.region.en];
}

export function minutesToHours(minutes: number): number {
  return Math.round(((minutes / 60) + Number.EPSILON) * 100) / 100;
}

export function deriveBudgetLevel(ticketCostOmr: number): BudgetLevel {
  if (ticketCostOmr <= 5) {
    return "low";
  }
  if (ticketCostOmr < 15) {
    return "medium";
  }
  return "luxury";
}

export function normalizeDestination(
  destination: DatasetDestination,
  locale: Locale
): Destination {
  return {
    ...destination,
    coordinates: {
      lat: destination.lat,
      lng: destination.lng
    },
    heroImage: getDestinationHeroImage(destination),
    description: buildDestinationDescription(destination),
    budgetLevel: deriveBudgetLevel(destination.ticket_cost_omr),
    recommendedDurationHours: minutesToHours(destination.avg_visit_duration_minutes),
    regionKey: getRegionKey(destination),
    regionLabel: getLocalizedRegionLabel(destination, locale),
    locale
  };
}

export function normalizeDestinations(
  destinations: DatasetDestination[],
  locale: Locale
): Destination[] {
  return destinations.map((destination) => normalizeDestination(destination, locale));
}
