const EARTH_RADIUS_KM = 6371;

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula:
  // a = sin²(Δφ / 2) + cos(φ1) * cos(φ2) * sin²(Δλ / 2)
  // c = 2 * atan2(√a, √(1 - a))
  // d = R * c
  // where φ is latitude in radians, λ is longitude in radians, and R is the Earth's radius.
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
