/**
 * GeoPoint — minimal lat/lng pair used for distance calculations in Phase 1 mocks.
 * In Phase 9 this is replaced by a PostGIS Point on Player / Team / Venue per DOMAIN_MODEL.md §2.2, §4.1, §6.1.
 */
export type GeoPoint = {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
};
