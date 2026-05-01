import type { GeoPoint } from '@beat-em-all/types';

/**
 * Approximate geo points for Phase 1 mock seeds.
 * In Phase 9 these come from real PostGIS Points on Player.geo_location etc.
 *
 * Coordinates picked from public city centroids — close enough for haversine demo math,
 * not authoritative for venue placement.
 */
export const GEO: Record<string, GeoPoint> = {
  // Kuwait
  'kw.kuwait-city': { lat: 29.3759, lng: 47.9774 },
  'kw.salmiya': { lat: 29.3394, lng: 48.0758 },
  'kw.hawally': { lat: 29.3326, lng: 48.0289 },
  'kw.farwaniya': { lat: 29.2773, lng: 47.9583 },
  'kw.jahra': { lat: 29.3375, lng: 47.6581 },

  // KSA
  'ksa.riyadh': { lat: 24.7136, lng: 46.6753 },
};
