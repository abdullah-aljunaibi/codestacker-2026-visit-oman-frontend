const EARTH_RADIUS_KM = 6371;

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes the great-circle distance between two latitude/longitude pairs.
 *
 * The Haversine formula converts the latitude and longitude deltas into the
 * central angle between two points on a sphere:
 * `a = sin^2(dLat / 2) + cos(lat1) * cos(lat2) * sin^2(dLng / 2)`
 * `c = 2 * atan2(sqrt(a), sqrt(1 - a))`
 * `distance = R * c`
 *
 * With `R = 6371`, the result is returned in kilometers.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const latitude1 = degreesToRadians(lat1);
  const latitude2 = degreesToRadians(lat2);
  const deltaLatitude = degreesToRadians(lat2 - lat1);
  const deltaLongitude = degreesToRadians(lng2 - lng1);

  const haversineComponent =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineComponent), Math.sqrt(1 - haversineComponent));
  return EARTH_RADIUS_KM * angularDistance;
}
