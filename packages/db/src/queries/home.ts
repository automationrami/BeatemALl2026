/**
 * Home Feed composer — builds the full `HomeFeedData` shape from a mix of DB queries
 * (teams, tournaments, venues — real) and mock-data fallbacks (hero upcomingMatch,
 * recent activity — until match-result epics ship).
 *
 * Persona resolution is dev-only: the persona switcher in the frontend posts the
 * `personaId` query param; we look up that persona's context (mode, primary game,
 * geo, registered tournament) in mock-data, then drive all DB queries from there.
 *
 * Once Auth.js v5 lands (E1-S2), this composer will resolve the viewer from the
 * session cookie instead of `personaId`. Same payload shape; same callers.
 */

import { eq } from 'drizzle-orm';
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
  getPersonaContext,
  getPlayerProfileByPersona,
  getRecentActivityForTeam,
  getTeamBySlug as getMockTeamBySlug,
  GAMES,
} from '@beat-em-all/mock-data';
import { haversineKm } from '@beat-em-all/utils';
import { getDb } from '../client';
import { teams } from '../schema/teams';
import { teamGames } from '../schema/team_games';
import { games } from '../schema/games';
import { listSurfaceableTournaments } from './tournament';
import { listVenues } from './venue';

const MAX_RECOMMENDED_TEAMS = 3;
const MAX_TOURNAMENTS = 3;
const MAX_VENUES = 3;
const MAX_ACTIVITY = 3;

/**
 * Compose the full Home Feed payload for the given persona.
 *
 * Returns the same `HomeFeedData` shape the mock `getHomeFeed()` returned, so existing
 * components don't change. Real DB drives recommendedTeams / tournaments / nearbyVenues;
 * mock-data drives the hero upcomingMatch + recentActivity until match epics ship.
 */
export async function loadHomeFeed(
  personaId: string,
  now: Date = new Date(),
): Promise<HomeFeedData> {
  const ctx = getPersonaContext(personaId);
  const profile = getPlayerProfileByPersona(personaId);
  const greetingBucket = pickGreetingBucket(now);

  const [recommendedTeams, tournaments, nearbyVenues] = await Promise.all([
    pickRecommendedTeams(ctx),
    pickTournaments(ctx),
    pickNearbyVenues(ctx),
  ]);

  const recentActivity = pickRecentActivity(ctx);
  const hero = pickHero(ctx, tournaments);

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

function pickGreetingBucket(now: Date): GreetingBucket {
  const h = now.getHours();
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
}

async function pickRecommendedTeams(
  ctx: ReturnType<typeof getPersonaContext>,
): Promise<RecommendedTeam[]> {
  const db = getDb();
  const filterGame: GameId | null = ctx.primaryGame;

  // Fetch all + filter in memory; team count is bounded (Phase 1 = 3, MVP = ~50).
  const all = await db.select().from(teams);
  const active = all.filter((t) => !t.disbandedAt && t.isPublic);

  // Pull the games per team in one query.
  const tgRows = await db
    .select({ teamId: teamGames.teamId, slug: games.slug })
    .from(teamGames)
    .innerJoin(games, eq(games.id, teamGames.gameId));
  const gamesByTeam = new Map<string, GameId[]>();
  for (const r of tgRows) {
    const list = gamesByTeam.get(r.teamId) ?? [];
    list.push(r.slug as GameId);
    gamesByTeam.set(r.teamId, list);
  }

  const candidates: RecommendedTeam[] = active
    .filter((t) => t.slug !== ctx.primaryTeamSlug)
    .map((t) => {
      const teamGameSlugs = gamesByTeam.get(t.id) ?? [];
      const mock = getMockTeamBySlug(t.slug);
      const distanceKm = mock
        ? haversineKm(ctx.geo, geoForCity(t.countryCode, t.city ?? '') ?? ctx.geo)
        : 0;
      const teamShape: Team = {
        id: t.id,
        slug: t.slug,
        tag: t.tag,
        name: t.name,
        country: t.countryCode,
        city: t.city ?? '',
        accentColor: mock?.accentColor ?? brandColorFor(teamGameSlugs),
        games: teamGameSlugs,
        recruiting: t.isRecruiting,
        bio: t.bio ?? '',
        joinedLabel: '',
        badges: mock?.badges ?? [],
        members: mock?.members ?? [],
        stats: mock?.stats ?? {
          winRate: 0,
          totalMatches: 0,
          trophies: 0,
          rating: 1500,
          ratingDelta30d: 0,
          streak: { count: 0, streakType: 'W' },
        },
        upcomingMatch: mock?.upcomingMatch ?? null,
      };
      return { ...teamShape, distanceKm };
    })
    .filter((t) => (filterGame ? t.games.includes(filterGame) : true))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RECOMMENDED_TEAMS);

  return candidates;
}

async function pickTournaments(
  ctx: ReturnType<typeof getPersonaContext>,
): Promise<TournamentSummary[]> {
  const all = await listSurfaceableTournaments();
  const game = ctx.primaryGame;
  return all
    .filter((t) => (game ? t.game === game : true))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status))
    .slice(0, MAX_TOURNAMENTS);
}

async function pickNearbyVenues(ctx: ReturnType<typeof getPersonaContext>): Promise<NearbyVenue[]> {
  const all = await listVenues();
  return all
    .map<NearbyVenue>((v) => ({ ...v, distanceKm: haversineKm(ctx.geo, v.geo) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_VENUES);
}

function pickRecentActivity(ctx: ReturnType<typeof getPersonaContext>): ActivityMatch[] {
  return getRecentActivityForTeam(ctx.primaryTeamSlug).slice(0, MAX_ACTIVITY);
}

function pickHero(
  ctx: ReturnType<typeof getPersonaContext>,
  tournaments: TournamentSummary[],
): HomeHeroVariant {
  if (ctx.mode === 'incomplete') return { kind: 'incomplete_prompt' };
  if (ctx.mode === 'solo') return { kind: 'solo_prompt' };

  // Active mode: prefer mock upcomingMatch on the primary team.
  const team = ctx.primaryTeamSlug ? getMockTeamBySlug(ctx.primaryTeamSlug) : null;
  if (team?.upcomingMatch) return { kind: 'next_match', team };

  // Fallback: first sanctioned tournament the viewer's primary game matches.
  const tournamentSlug = ctx.registeredTournamentSlug;
  if (tournamentSlug) {
    const tournament = tournaments.find((t) => t.slug === tournamentSlug);
    if (tournament) return { kind: 'upcoming_tournament', tournament };
  }

  return { kind: 'idle' };
}

function brandColorFor(gameSlugs: GameId[]): string {
  const primary = gameSlugs[0];
  if (primary && GAMES[primary]) return GAMES[primary].brandColor;
  return '#8B5CF6';
}

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
  if (s === 'registration_open') return 0;
  if (s === 'in_progress') return 1;
  return 2;
}
