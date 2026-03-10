import type { Destination, InterestProfile } from "@/types/domain";
import type { DatasetCoordinates } from "@/types/dataset";

import { haversineDistance } from "@/lib/geo/haversine";

export type BudgetLevel = InterestProfile["budget"];
export type Coordinates = DatasetCoordinates;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function toUniqueNormalized(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

export function monthDistance(a: number, b: number): number {
  const normalizedA = clamp(Math.round(a), 1, 12);
  const normalizedB = clamp(Math.round(b), 1, 12);
  const directDistance = Math.abs(normalizedA - normalizedB);
  return Math.min(directDistance, 12 - directDistance);
}

export function budgetLevelToTargetCost(level: BudgetLevel): number {
  if (level === "budget") {
    return 5;
  }
  if (level === "moderate") {
    return 15;
  }
  return 30;
}

export function normalizeCrowdLevel(crowdLevel: number): number {
  return clamp01((crowdLevel - 1) / 4);
}

export function normalizeTicketCost(ticketCostOmr: number, minCost: number, maxCost: number): number {
  if (maxCost <= minCost) {
    return 0;
  }
  return clamp01((ticketCostOmr - minCost) / (maxCost - minCost));
}

export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  return haversineDistance(from.lat, from.lng, to.lat, to.lng);
}

export function centroid(destinations: Array<Pick<Destination, "coordinates">>): Coordinates | null {
  if (destinations.length === 0) {
    return null;
  }

  const totals = destinations.reduce(
    (acc, destination) => ({
      lat: acc.lat + destination.coordinates.lat,
      lng: acc.lng + destination.coordinates.lng
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: totals.lat / destinations.length,
    lng: totals.lng / destinations.length
  };
}
