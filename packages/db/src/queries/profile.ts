/**
 * Player profile editing and public profile extras — E1 US-1.4 / US-1.5 (P-04, P-05).
 */

import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../client';
import { users } from '../schema/users';
import { players } from '../schema/players';
import { playerGames } from '../schema/player_games';
import { games } from '../schema/games';
import { teams } from '../schema/teams';
import { teamGames } from '../schema/team_games';
import { teamMembers } from '../schema/team_members';
import { activeMembership, type TeamRole } from './roles';
import { ROLE_RANK } from './roster';
import { teamAccentColor } from './team';

export type ProfileErrorCode =
  | 'not_found'
  | 'invalid_name'
  | 'bio_too_long'
  | 'invalid_city'
  | 'invalid_country'
  | 'no_games'
  | 'unknown_game';

export class ProfileError extends Error {
  constructor(
    public code: ProfileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileError';
  }

  get status(): number {
    return this.code === 'not_found' ? 404 : 400;
  }
}

export type EditableProfile = {
  displayName: string;
  playerSlug: string;
  bio: string;
  city: string;
  countryCode: string;
  isOpenToTeamInvites: boolean;
  gameSlugs: string[];
};

export async function loadEditableProfile(playerId: string): Promise<EditableProfile | null> {
  const db = getDb();
  const [row] = await db
    .select({
      displayName: users.displayName,
      playerSlug: players.slug,
      bio: players.bio,
      city: players.city,
      countryCode: players.countryCode,
      isOpenToTeamInvites: players.isOpenToTeamInvites,
    })
    .from(players)
    .innerJoin(users, eq(users.id, players.userId))
    .where(eq(players.id, playerId))
    .limit(1);
  if (!row) return null;
  const gameRows = await db
    .select({ slug: games.slug })
    .from(playerGames)
    .innerJoin(games, eq(games.id, playerGames.gameId))
    .where(eq(playerGames.playerId, playerId));
  return {
    ...row,
    bio: row.bio ?? '',
    city: row.city ?? '',
    gameSlugs: gameRows.map((g) => g.slug),
  };
}

/**
 * P-04: update name, bio, city, country, invite preference and games. The games list
 * replaces the player's games; rows for games they keep are left as they are (in-game id,
 * rank and proficiency survive).
 */
export async function updatePlayerProfile(input: {
  userId: string;
  playerId: string;
  displayName: string;
  bio?: string | null;
  city?: string | null;
  countryCode: string;
  isOpenToTeamInvites: boolean;
  gameSlugs: string[];
}): Promise<EditableProfile> {
  const displayName = input.displayName.trim().replace(/\s+/g, ' ');
  if (displayName.length < 2 || displayName.length > 60) {
    throw new ProfileError('invalid_name', 'Name must be between 2 and 60 characters.');
  }
  const bio = input.bio?.trim() ?? '';
  if (bio.length > 280)
    throw new ProfileError('bio_too_long', 'Bio can be at most 280 characters.');
  const city = input.city?.trim() ?? '';
  if (city.length > 80)
    throw new ProfileError('invalid_city', 'City can be at most 80 characters.');
  const countryCode = input.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(countryCode)) {
    throw new ProfileError('invalid_country', 'Pick your country.');
  }
  const gameSlugs = [...new Set(input.gameSlugs.map((s) => s.trim()).filter(Boolean))];
  if (gameSlugs.length === 0) throw new ProfileError('no_games', 'Pick at least one game.');

  const db = getDb();
  const gameRows = await db
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(inArray(games.slug, gameSlugs));
  if (gameRows.length !== gameSlugs.length) {
    throw new ProfileError('unknown_game', 'One of the games is not available.');
  }

  await db.transaction(async (tx) => {
    const [player] = await tx
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.id, input.playerId), eq(players.userId, input.userId)))
      .limit(1);
    if (!player) throw new ProfileError('not_found', 'Profile not found.');
    const now = new Date();
    await tx.update(users).set({ displayName, updatedAt: now }).where(eq(users.id, input.userId));
    await tx
      .update(players)
      .set({
        bio: bio || null,
        city: city || null,
        countryCode,
        isOpenToTeamInvites: input.isOpenToTeamInvites,
        updatedAt: now,
      })
      .where(eq(players.id, player.id));

    const current = await tx
      .select({ id: playerGames.id, gameId: playerGames.gameId })
      .from(playerGames)
      .where(eq(playerGames.playerId, player.id));
    const wanted = new Set(gameRows.map((g) => g.id));
    const have = new Set(current.map((c) => c.gameId));
    const drop = current.filter((c) => !wanted.has(c.gameId)).map((c) => c.id);
    if (drop.length > 0) await tx.delete(playerGames).where(inArray(playerGames.id, drop));
    const add = gameRows.filter((g) => !have.has(g.id));
    if (add.length > 0) {
      await tx.insert(playerGames).values(add.map((g) => ({ playerId: player.id, gameId: g.id })));
    }
  });

  const out = await loadEditableProfile(input.playerId);
  if (!out) throw new ProfileError('not_found', 'Profile not found.');
  return out;
}

export type PlayerTeam = {
  teamSlug: string;
  teamName: string;
  tag: string;
  accentColor: string;
  role: TeamRole;
  city: string | null;
  countryCode: string;
};

/**
 * P-05: a player's current teams (accepted, not left, team not disbanded), captaincies first.
 * Keyed by the public player slug so profile pages don't need the internal id.
 */
export async function listPlayerTeams(playerSlug: string): Promise<PlayerTeam[]> {
  const db = getDb();
  const rows = await db
    .select({
      teamId: teams.id,
      teamSlug: teams.slug,
      teamName: teams.name,
      tag: teams.tag,
      role: teamMembers.role,
      city: teams.city,
      countryCode: teams.countryCode,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .where(and(eq(players.slug, playerSlug), activeMembership(), isNull(teams.disbandedAt)))
    .orderBy(asc(teams.name));
  if (rows.length === 0) return [];

  const gameRows = await db
    .select({ teamId: teamGames.teamId, slug: games.slug, isPrimary: teamGames.isPrimary })
    .from(teamGames)
    .innerJoin(games, eq(games.id, teamGames.gameId))
    .where(
      inArray(
        teamGames.teamId,
        rows.map((r) => r.teamId),
      ),
    );

  return rows
    .map((r) => {
      const slugs = gameRows
        .filter((g) => g.teamId === r.teamId)
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
        .map((g) => g.slug);
      return {
        teamSlug: r.teamSlug,
        teamName: r.teamName,
        tag: r.tag,
        accentColor: teamAccentColor(r.teamSlug, slugs),
        role: r.role,
        city: r.city,
        countryCode: r.countryCode,
      };
    })
    .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);
}
