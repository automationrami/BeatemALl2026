import type { GameId, GeoPoint, HomeViewerMode } from '@beat-em-all/types';
import { GEO } from './geo-points';

/**
 * Per-persona world state used by the Home Feed and other viewer-aware surfaces.
 *
 * What this file is for: the canonical PLAYER_PROFILES seeds carry _identity_ data only
 * (display name, bio, ranks, recent matches inside their own profile). For viewer-aware
 * surfaces we also need to know:
 *   - what the viewer's current location is (for distance-sorted lists)
 *   - which team they captain or are a member of (or that they have none → "solo" mode)
 *   - which game is their primary focus right now (for the Recommended Teams filter default)
 *   - whether they have a tournament registration in flight (drives the hero variant)
 *
 * In Phase 9 every value here is derived from Player.geo_location, TeamMember rows, and
 * TournamentRegistration rows in Supabase.
 */
export type PersonaContext = {
  personaId: string;
  /** Resolved Player.country_code. */
  country: 'KW' | 'KSA' | 'AE' | 'BH' | 'QA' | 'OM';
  city: string;
  /** Approximate lat/lng — drives Recommended Teams + Nearby Venues distance sorting. */
  geo: GeoPoint;
  /** Slug of the team the persona is on, if any. Mirrors TEAMS keys in mock-data/teams.ts. */
  primaryTeamSlug: string | null;
  /** Slugs of any other teams (for Recent Activity coverage). */
  otherTeamSlugs: string[];
  /** Selected primary game — used as the default filter on Recommended Teams. */
  primaryGame: GameId | null;
  /** Tournament slug a persona is registered in, if any — drives Variant B hero. */
  registeredTournamentSlug: string | null;
  /** Computed viewer mode per HOME_FEED.md §Visitor Modes. */
  mode: HomeViewerMode;
};

export const PERSONA_CONTEXTS: Record<string, PersonaContext> = {
  // Active competitor: Sandstorm captain, Salmiya-based, primary game Valorant.
  // Tournament registration: KEC Spring '26 (the one Sandstorm has an upcoming match in).
  khaled: {
    personaId: 'khaled',
    country: 'KW',
    city: 'Salmiya',
    geo: GEO['kw.salmiya'] as GeoPoint,
    primaryTeamSlug: 'sandstorm',
    otherTeamSlugs: [],
    primaryGame: 'valorant',
    registeredTournamentSlug: 'kec-spring-26',
    mode: 'active',
  },

  // Solo player: in Hawally, has CodM selected, no team in mock TEAMS seeds.
  // Hero falls back to Variant C / solo prompt.
  sara: {
    personaId: 'sara',
    country: 'KW',
    city: 'Hawally',
    geo: GEO['kw.hawally'] as GeoPoint,
    primaryTeamSlug: null,
    otherTeamSlugs: [],
    primaryGame: 'codm',
    registeredTournamentSlug: null,
    mode: 'solo',
  },

  // KEC tournament manager — has zero games selected in PLAYER_PROFILES.
  // Treated as "incomplete" for Home Feed purposes (org admin surfaces are P-3, separate epic).
  ahmad: {
    personaId: 'ahmad',
    country: 'KW',
    city: 'Kuwait City',
    geo: GEO['kw.kuwait-city'] as GeoPoint,
    primaryTeamSlug: null,
    otherTeamSlugs: [],
    primaryGame: null,
    registeredTournamentSlug: null,
    mode: 'incomplete',
  },

  // Venue owner — has EAFC selected, lives in Riyadh, no team membership.
  // Solo mode; Recommended Teams will surface distant teams (or empty if none in the same game).
  omar: {
    personaId: 'omar',
    country: 'KSA',
    city: 'Riyadh',
    geo: GEO['ksa.riyadh'] as GeoPoint,
    primaryTeamSlug: null,
    otherTeamSlugs: [],
    primaryGame: 'eafc',
    registeredTournamentSlug: null,
    mode: 'solo',
  },

  // Brand marketer — no games selected at all → incomplete onboarding.
  fatima: {
    personaId: 'fatima',
    country: 'KW',
    city: 'Kuwait City',
    geo: GEO['kw.kuwait-city'] as GeoPoint,
    primaryTeamSlug: null,
    otherTeamSlugs: [],
    primaryGame: null,
    registeredTournamentSlug: null,
    mode: 'incomplete',
  },
};

export function getPersonaContext(personaId: string): PersonaContext {
  return PERSONA_CONTEXTS[personaId] ?? (PERSONA_CONTEXTS.khaled as PersonaContext);
}
