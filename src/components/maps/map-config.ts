export const OMAN_BOUNDS = {
  south: 16.4,
  north: 26.45,
  west: 52,
  east: 59.9
} as const;

const MAP_PADDING_RATIO = 0.08;

export interface ProjectedPoint {
  x: number;
  y: number;
}

export interface MapBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export function projectPointToOmanBox(
  lat: number,
  lng: number,
  width: number,
  height: number
): ProjectedPoint {
  const innerWidth = width * (1 - MAP_PADDING_RATIO * 2);
  const innerHeight = height * (1 - MAP_PADDING_RATIO * 2);
  const clampedLng = Math.min(Math.max(lng, OMAN_BOUNDS.west), OMAN_BOUNDS.east);
  const clampedLat = Math.min(Math.max(lat, OMAN_BOUNDS.south), OMAN_BOUNDS.north);
  const xRatio = (clampedLng - OMAN_BOUNDS.west) / (OMAN_BOUNDS.east - OMAN_BOUNDS.west);
  const yRatio = (OMAN_BOUNDS.north - clampedLat) / (OMAN_BOUNDS.north - OMAN_BOUNDS.south);

  return {
    x: width * MAP_PADDING_RATIO + xRatio * innerWidth,
    y: height * MAP_PADDING_RATIO + yRatio * innerHeight
  };
}

export function getBoundsForCoordinates(points: Array<{ lat: number; lng: number }>): MapBounds {
  if (points.length === 0) {
    return { ...OMAN_BOUNDS };
  }

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);

  return {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs)
  };
}

export function expandBounds(bounds: MapBounds, minimumPadding = 0.2): MapBounds {
  const latSpan = Math.max(bounds.north - bounds.south, minimumPadding);
  const lngSpan = Math.max(bounds.east - bounds.west, minimumPadding);

  return {
    south: Math.max(OMAN_BOUNDS.south, bounds.south - latSpan * 0.35),
    north: Math.min(OMAN_BOUNDS.north, bounds.north + latSpan * 0.35),
    west: Math.max(OMAN_BOUNDS.west, bounds.west - lngSpan * 0.35),
    east: Math.min(OMAN_BOUNDS.east, bounds.east + lngSpan * 0.35)
  };
}
