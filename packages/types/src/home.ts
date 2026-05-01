import type { GameId } from './game';
import type { Team } from './team';
import type { TournamentSummary } from './tournament';
import type { VenueSummary } from './venue';
import type { MatchSummary } from './player';
import type { CountryCode } from './auth';

/**
 * Viewer mode for the Home Feed — drives layout variants per HOME_FEED.md.
 *
 *   active   — Player has a Team membership and at least one selected Game. Full feed.
 *   solo     — Player exists with games but no team. Hero shows "find/form a team" CTA;
 *              Recent Activity becomes a "your matches will live here" empty state.
 *   incomplete — Profile lacks games (escaped onboarding). Whole feed replaced with a
 *                "Finish setting up your profile" gradient card pointing to /onboarding.
 */
export type HomeViewerMode = 'active' | 'solo' | 'incomplete';

/** Time-of-day greeting bucket — the page picks an i18n key from this. */
export type GreetingBucket = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Hero variant — the priority-picked render mode for the top card.
 *
 *   next_match           — viewer has an upcoming match scheduled within view window
 *   upcoming_tournament  — viewer has a confirmed tournament registration starting soon
 *   solo_prompt          — solo-mode CTA surface (no team yet)
 *   incomplete_prompt    — incomplete-mode CTA surface (finish onboarding)
 *   idle                 — active viewer with nothing scheduled
 */
export type HomeHeroVariant =
  | { kind: 'next_match'; team: Team }
  | { kind: 'upcoming_tournament'; tournament: TournamentSummary }
  | { kind: 'solo_prompt' }
  | { kind: 'incomplete_prompt' }
  | { kind: 'idle' };

/** A single match in the viewer's recent-activity rail. */
export type ActivityMatch = MatchSummary & {
  /** Optional venue label for the secondary line on the match row. */
  venueLabel?: string;
};

/**
 * Recommended team — augments the canonical Team with computed fields the Home rail needs.
 * `distanceKm` is computed by `haversineKm(viewer.location, team.location)` in api-client/home.
 */
export type RecommendedTeam = Team & {
  distanceKm: number;
};

/**
 * Nearby venue — augments VenueSummary with the same computed distance.
 */
export type NearbyVenue = VenueSummary & {
  distanceKm: number;
};

/**
 * Composed payload for the Home Feed. The api-client/home.ts accessor returns this.
 * Phase 1 produces it from mock-data; Phase 9 produces it from Supabase. Same shape, same callers.
 */
export type HomeFeedData = {
  viewer: {
    personaId: string;
    displayName: string;
    primaryGame: GameId | null;
    country: CountryCode;
    city: string;
    mode: HomeViewerMode;
    greetingBucket: GreetingBucket;
  };
  hero: HomeHeroVariant;
  recommendedTeams: RecommendedTeam[];
  tournaments: TournamentSummary[];
  nearbyVenues: NearbyVenue[];
  recentActivity: ActivityMatch[];
};
