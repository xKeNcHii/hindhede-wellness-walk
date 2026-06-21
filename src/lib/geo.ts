export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance between two coordinates in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sin = Math.sin;
  const h =
    sin(dLat / 2) ** 2 + sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface GeoFix {
  coord: LatLng;
  accuracy: number; // metres
  timestamp: number; // ms
}

export interface DistanceFilterConfig {
  maxAccuracy: number; // ignore fixes worse than this (m)
  minStep: number; // ignore movements smaller than this (m) — jitter
  maxSpeed: number; // ignore movements faster than this (m/s) — vehicle / GPS jump
}

export const DEFAULT_FILTER: DistanceFilterConfig = {
  maxAccuracy: 35,
  minStep: 4,
  maxSpeed: 4, // ~14.4 km/h; brisk walking is < 2 m/s
};

/**
 * Decide how much real distance a new fix adds versus the previous accepted fix.
 * Returns the accepted increment in metres (0 if the fix is rejected).
 */
export function acceptedDistance(
  prev: GeoFix | null,
  next: GeoFix,
  cfg: DistanceFilterConfig = DEFAULT_FILTER
): number {
  if (next.accuracy > cfg.maxAccuracy) return 0;
  if (!prev) return 0;
  const d = haversine(prev.coord, next.coord);
  if (d < cfg.minStep) return 0;
  const dt = (next.timestamp - prev.timestamp) / 1000;
  if (dt <= 0) return 0;
  const speed = d / dt;
  if (speed > cfg.maxSpeed) return 0;
  return d;
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}
