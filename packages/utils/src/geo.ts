import type { GeoPoint } from '@beat-em-all/types';

const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two GeoPoints in kilometres.
 *
 * Used by the Home Feed to compute "X km away" labels for Recommended Teams and
 * Nearby Venues. In Phase 9 the same labels come from PostGIS `ST_Distance` queries
 * and this helper is only used for unit conversion / formatting.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * c;
}

/**
 * Format a distance for display. Whole-km below 100, one-decimal under 10.
 *
 *   formatDistanceKm(0.4)  → "0.4"
 *   formatDistanceKm(4.7)  → "4.7"
 *   formatDistanceKm(12.6) → "13"
 *   formatDistanceKm(140)  → "140"
 */
export function formatDistanceKm(km: number): string {
  if (km < 10) return km.toFixed(1);
  return Math.round(km).toString();
}
