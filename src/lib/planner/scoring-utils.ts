import type { Destination, InterestProfile } from "@/types/domain";

export type BudgetLevel = InterestProfile["budget"];
export type CostLevel = Destination["costLevel"];

export interface Coordinates {
  lat: number;
  lng: number;
}

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

export function costLevelToOrdinal(level: CostLevel | BudgetLevel): number {
  if (level === "low") {
    return 1;
  }
  if (level === "medium") {
    return 2;
  }
  return 3;
}

export function normalizePopularity(popularityScore: number): number {
  return clamp01(popularityScore / 100);
}

export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const earthRadiusKm = 6371;
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = degToRad(to.lat - from.lat);
  const dLng = degToRad(to.lng - from.lng);

  const lat1 = degToRad(from.lat);
  const lat2 = degToRad(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
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
