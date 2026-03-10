import { haversineDistance } from "@/lib/geo/haversine";

interface CoordinatesLike {
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Builds a symmetric matrix of great-circle distances between destinations.
 *
 * Because `distance(a, b) === distance(b, a)`, the implementation computes
 * each pair once and mirrors it across the diagonal so callers can reuse the
 * matrix for repeated route operations without recalculating distances.
 */
export function buildDistanceMatrix(destinations: CoordinatesLike[]): number[][] {
  const matrix = Array.from({ length: destinations.length }, () => Array<number>(destinations.length).fill(0));

  for (let rowIndex = 0; rowIndex < destinations.length; rowIndex += 1) {
    const from = destinations[rowIndex].coordinates;

    for (let columnIndex = rowIndex + 1; columnIndex < destinations.length; columnIndex += 1) {
      const to = destinations[columnIndex].coordinates;
      const distanceKm = haversineDistance(from.lat, from.lng, to.lat, to.lng);

      matrix[rowIndex][columnIndex] = distanceKm;
      matrix[columnIndex][rowIndex] = distanceKm;
    }
  }

  return matrix;
}
