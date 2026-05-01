import type { VenueSummary } from '@beat-em-all/types';
import { GEO } from './geo-points';

/**
 * Phase 1 venue seeds. All entries are `isVerified: true` so they pass the Home Feed filter.
 * Geo points spread across Kuwait (Salmiya / Hawally / Kuwait City / Farwaniya) and one in Riyadh.
 *
 * `rating` is intentionally null for most venues — DOMAIN_MODEL.md does not yet model Reviews,
 * and HOME_FEED.md treats null ratings as "render the price pill alone". One venue carries a
 * non-null rating to exercise the rating-rendering branch in the row component.
 */
export const VENUES: Record<string, VenueSummary> = {
  'gg-arena-salmiya': {
    id: 'venue-gg-arena-salmiya',
    slug: 'gg-arena-salmiya',
    name: 'GG Arena',
    city: 'Salmiya',
    country: 'KW',
    geo: { lat: 29.3402, lng: 48.0775 }, // ~150m from city centroid
    hourlyRateKWD: 6,
    supportedGames: ['valorant', 'eafc', 'tekken8'],
    rating: 4.8,
    isVerified: true,
  },

  'pixel-house-hawally': {
    id: 'venue-pixel-house-hawally',
    slug: 'pixel-house-hawally',
    name: 'Pixel House',
    city: 'Hawally',
    country: 'KW',
    geo: { lat: 29.3331, lng: 48.0301 },
    hourlyRateKWD: 5,
    supportedGames: ['codm', 'tekken8'],
    rating: null,
    isVerified: true,
  },

  'arc-esports-kuwait-city': {
    id: 'venue-arc-esports-kuwait-city',
    slug: 'arc-esports-kuwait-city',
    name: 'ARC Esports',
    city: 'Kuwait City',
    country: 'KW',
    geo: { lat: 29.3771, lng: 47.9762 },
    hourlyRateKWD: 7,
    supportedGames: ['valorant', 'cs2', 'lol'],
    rating: null,
    isVerified: true,
  },

  'qmark-farwaniya': {
    id: 'venue-qmark-farwaniya',
    slug: 'qmark-farwaniya',
    name: 'Q-Mark Lounge',
    city: 'Farwaniya',
    country: 'KW',
    geo: GEO['kw.farwaniya'] as { lat: number; lng: number },
    hourlyRateKWD: 4,
    supportedGames: ['eafc', 'codm'],
    rating: null,
    isVerified: true,
  },

  'dxe-fuel-riyadh': {
    id: 'venue-dxe-fuel-riyadh',
    slug: 'dxe-fuel-riyadh',
    name: 'DXE Fuel',
    city: 'Riyadh',
    country: 'KSA',
    geo: GEO['ksa.riyadh'] as { lat: number; lng: number },
    hourlyRateKWD: 8,
    supportedGames: ['eafc', 'tekken8'],
    rating: null,
    isVerified: true,
  },
};

export const VENUES_LIST: VenueSummary[] = Object.values(VENUES);

export function getVenueBySlug(slug: string): VenueSummary | null {
  return VENUES[slug] ?? null;
}
