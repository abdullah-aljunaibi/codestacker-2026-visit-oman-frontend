import type { BudgetLevel, Destination } from "@/types/domain";
import type { DatasetDestination, Locale } from "@/types/dataset";

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
  return Math.round(((minutes / 60) + Number.EPSILON) * 100) / 100;
}

export function deriveBudgetLevel(ticketCostOmr: number): BudgetLevel {
  if (ticketCostOmr <= 5) {
    return "budget";
  }
  if (ticketCostOmr < 15) {
    return "moderate";
  }
  return "luxury";
}

export function normalizeDestination(
  destination: DatasetDestination,
  locale: Locale
): Destination {
  return {
    ...destination,
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
