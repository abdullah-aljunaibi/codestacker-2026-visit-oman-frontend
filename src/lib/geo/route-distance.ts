import { haversineDistance } from "@/lib/geo/haversine";

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export function totalRouteDistance(coordinates: RouteCoordinate[]): number {
  if (coordinates.length < 2) {
    return 0;
  }

  let totalDistanceKm = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    totalDistanceKm += haversineDistance(previous.lat, previous.lng, current.lat, current.lng);
  }

  return totalDistanceKm;
}
