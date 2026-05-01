/**
 * Home Feed read-side. Phase 1 reads from @beat-em-all/mock-data.
 * Phase 9 swaps these bodies for Supabase queries — same return shapes, callers don't change.
 *
 * Spec: `Beatemall/docs/page-specs/HOME_FEED.md`
 */

import type {
  ActivityMatch,
  GameId,
  GreetingBucket,
  HomeFeedData,
  HomeHeroVariant,
  NearbyVenue,
  RecommendedTeam,
  Team,
  TournamentSummary,
} from '@beat-em-all/types';
import {
  TEAMS_LIST,
  TOURNAMENTS_LIST,
  TOURNAMENTS,
  VENUES_LIST,
  getPersonaContext,
  getPlayerProfileByPersona,
  getRecentActivityForTeam,
  getTeamBySlug,
} from '@beat-em-all/mock-data';
import { haversineKm } from '@beat-em-all/utils';

/** Cap counts per HOME_FEED.md so the page doesn't grow unbounded as seeds expand. */
const MAX_RECOMMENDED_TEAMS = 3;
const MAX_TOURNAMENTS = 3;
const MAX_VENUES = 3;
const MAX_ACTIVITY = 3;

/**
 * The single Home Feed accessor. Returns the composed payload for the active persona,
 * filtered/sorted/capped per the spec. Pure synchronous read against in-memory mock data.
 */
export function getHomeFeed(personaId: string, now: Date = new Date()): HomeFeedData {
  const ctx = getPersonaContext(personaId);
  const profile = getPlayerProfileByPersona(personaId);

  const greetingBucket = pickGreetingBucket(now);

  const recommendedTeams = pickRecommendedTeams(ctx);
  const tournaments = pickTournaments(ctx);
  const nearbyVenues = pickNearbyVenues(ctx);
  const recentActivity = pickRecentActivity(ctx);
  const hero = pickHero(ctx, recommendedTeams);

  return {
    viewer: {
      personaId: ctx.personaId,
      displayName: profile.displayName,
      primaryGame: ctx.primaryGame,
      country: ctx.country,
      city: ctx.city,
      mode: ctx.mode,
      greetingBucket,
    },
    hero,
    recommendedTeams,
    tournaments,
    nearbyVenues,
    recentActivity,
  };
}

// ---- helpers ----

function pickGreetingBucket(now: Date): GreetingBucket {
  const h = now.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
}

function pickRecommendedTeams(ctx: ReturnType<typeof getPersonaContext>): RecommendedTeam[] {
  const filterGame: GameId | null = ctx.primaryGame;

  return (
    TEAMS_LIST
      // exclude the persona's own team(s)
      .filter((team: Team) => team.slug !== ctx.primaryTeamSlug)
      // when the viewer has a primary game, prefer teams that play it; otherwise show everything
      .filter((team: Team) => (filterGame ? team.games.includes(filterGame) : true))
      .map<RecommendedTeam>((team: Team) => ({
        ...team,
        // mock geo: derive from the team's `city` via a small lookup. Falls back to viewer geo
        // (yielding 0 km) so the section never produces NaN.
        distanceKm: haversineKm(ctx.geo, geoForCity(team.country, team.city) ?? ctx.geo),
      }))
      .sort((a: RecommendedTeam, b: RecommendedTeam) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_RECOMMENDED_TEAMS)
  );
}

function pickTournaments(ctx: ReturnType<typeof getPersonaContext>): TournamentSummary[] {
  const game = ctx.primaryGame;
  return TOURNAMENTS_LIST.filter((t) => (game ? t.game === game : true))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status))
    .slice(0, MAX_TOURNAMENTS);
}

function pickNearbyVenues(ctx: ReturnType<typeof getPersonaContext>): NearbyVenue[] {
  return VENUES_LIST.filter((v) => v.isVerified)
    .map<NearbyVenue>((v) => ({ ...v, distanceKm: haversineKm(ctx.geo, v.geo) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_VENUES);
}

function pickRecentActivity(ctx: ReturnType<typeof getPersonaContext>): ActivityMatch[] {
  return getRecentActivityForTeam(ctx.primaryTeamSlug).slice(0, MAX_ACTIVITY);
}

function pickHero(
  ctx: ReturnType<typeof getPersonaContext>,
  _recommendedTeams: RecommendedTeam[],
): HomeHeroVariant {
  if (ctx.mode === 'incomplete') return { kind: 'incomplete_prompt' };
  if (ctx.mode === 'solo') return { kind: 'solo_prompt' };

  // Active mode: prefer an upcoming match on the primary team; fall back to a registered tournament.
  const team = ctx.primaryTeamSlug ? getTeamBySlug(ctx.primaryTeamSlug) : null;
  if (team?.upcomingMatch) return { kind: 'next_match', team };

  const tournamentSlug = ctx.registeredTournamentSlug;
  if (tournamentSlug) {
    const tournament = TOURNAMENTS[tournamentSlug];
    if (tournament) return { kind: 'upcoming_tournament', tournament };
  }

  return { kind: 'idle' };
}

/**
 * Rough city → geo lookup for mock teams. We only have a handful of cities in the
 * Phase-1 seeds; anything else returns null and the haversine call falls back to viewer geo.
 */
function geoForCity(country: string, city: string): { lat: number; lng: number } | null {
  const k = `${country.toLowerCase()}.${city.toLowerCase().replace(/\s+/g, '-')}`;
  const map: Record<string, { lat: number; lng: number }> = {
    'kw.salmiya': { lat: 29.3394, lng: 48.0758 },
    'kw.hawally': { lat: 29.3326, lng: 48.0289 },
    'kw.kuwait-city': { lat: 29.3759, lng: 47.9774 },
    'kw.farwaniya': { lat: 29.2773, lng: 47.9583 },
    'ksa.riyadh': { lat: 24.7136, lng: 46.6753 },
  };
  return map[k] ?? null;
}

function statusRank(s: TournamentSummary['status']): number {
  // registration_open → 0  (most actionable for the viewer)
  // in_progress       → 1  (live now, surface but slightly lower priority)
  // published         → 2  (announced but not yet open)
  if (s === 'registration_open') return 0;
  if (s === 'in_progress') return 1;
  return 2;
}
