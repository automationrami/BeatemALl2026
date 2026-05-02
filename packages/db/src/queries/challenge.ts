/**
 * Challenge queries + state-machine helpers.
 *
 * Spec: DOMAIN_MODEL.md §7.1 + epic E6 (Challenge, Negotiation & Match Lifecycle).
 *
 * The persona-as-current-user pattern (see `current_user.ts`) is what authorises
 * write actions in Phase 1. Real Auth.js takes over in Phase 9 / E1-S2.
 */

import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb } from '../client';
import { challenges, challengeNegotiations } from '../schema/challenges';
import type { ChallengeRow } from '../schema/challenges';
import { teams } from '../schema/teams';
import type { TeamRow } from '../schema/teams';
import { games } from '../schema/games';
import type { GameRow } from '../schema/games';
import { matches } from '../schema/matches';
import { teamMembers } from '../schema/team_members';
import type { GameId } from '@beat-em-all/types';

export type ChallengeWithRelations = {
  challenge: ChallengeRow;
  challengerTeam: Pick<TeamRow, 'id' | 'slug' | 'name' | 'tag' | 'countryCode' | 'city'>;
  challengedTeam: Pick<TeamRow, 'id' | 'slug' | 'name' | 'tag' | 'countryCode' | 'city'>;
  game: Pick<GameRow, 'id' | 'slug' | 'name'>;
};

/**
 * Direction relative to the current persona's team memberships.
 *   incoming → my team is the challenged side (action expected from me)
 *   outgoing → my team is the challenger
 *   all      → either side
 */
export type ChallengeDirection = 'incoming' | 'outgoing' | 'all';

/**
 * Create a challenge from `challengerTeamId` to `challengedTeamId`. Caller is responsible
 * for verifying the current persona is authorised to act for the challenger team
 * (currently: persona is captain or co_captain of challenger).
 */
export async function createChallenge(input: {
  challengerTeamId: string;
  challengedTeamId: string;
  gameId: string;
  proposedFormat: 'bo1' | 'bo3' | 'bo5';
  proposedDateRangeStart: Date;
  proposedDateRangeEnd: Date;
  proposedVenueSlug?: string | null;
  message?: string | null;
}): Promise<ChallengeRow> {
  if (input.challengerTeamId === input.challengedTeamId) {
    throw new ChallengeError('cannot_challenge_self', 'A team cannot challenge itself.');
  }
  if (input.proposedDateRangeEnd <= input.proposedDateRangeStart) {
    throw new ChallengeError(
      'invalid_date_range',
      'proposed_date_range_end must be strictly after proposed_date_range_start',
    );
  }

  const db = getDb();
  const rows = await db
    .insert(challenges)
    .values({
      challengerTeamId: input.challengerTeamId,
      challengedTeamId: input.challengedTeamId,
      gameId: input.gameId,
      proposedFormat: input.proposedFormat,
      proposedDateRangeStart: input.proposedDateRangeStart,
      proposedDateRangeEnd: input.proposedDateRangeEnd,
      proposedVenueSlug: input.proposedVenueSlug ?? null,
      message: input.message ?? null,
      status: 'pending',
    })
    .returning();

  const row = rows[0];
  if (!row) throw new ChallengeError('insert_failed', 'Challenge insert returned no row.');

  // Seed the negotiation history with the initial proposal so the timeline has at least 1 entry.
  await db.insert(challengeNegotiations).values({
    challengeId: row.id,
    proposedByTeamId: input.challengerTeamId,
    proposedFormat: input.proposedFormat,
    proposedDateRangeStart: input.proposedDateRangeStart,
    proposedDateRangeEnd: input.proposedDateRangeEnd,
    proposedVenueSlug: input.proposedVenueSlug ?? null,
    message: input.message ?? null,
  });

  return row;
}

export async function loadChallengeById(id: string): Promise<ChallengeWithRelations | null> {
  const db = getDb();
  const challengerAlias = teams;
  const challengedAlias = teams; // we'll use raw SQL for two joins below

  // Fetch the challenge row first
  const cRows = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
  const challenge = cRows[0];
  if (!challenge) return null;

  const teamRows = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      tag: teams.tag,
      countryCode: teams.countryCode,
      city: teams.city,
    })
    .from(teams)
    .where(inArray(teams.id, [challenge.challengerTeamId, challenge.challengedTeamId]));

  const gameRows = await db
    .select({ id: games.id, slug: games.slug, name: games.name })
    .from(games)
    .where(eq(games.id, challenge.gameId))
    .limit(1);

  const challengerTeam = teamRows.find((t) => t.id === challenge.challengerTeamId);
  const challengedTeam = teamRows.find((t) => t.id === challenge.challengedTeamId);
  const game = gameRows[0];

  if (!challengerTeam || !challengedTeam || !game) return null;

  void challengerAlias;
  void challengedAlias;
  return { challenge, challengerTeam, challengedTeam, game };
}

export async function listChallengesForPlayer(
  playerId: string,
  direction: ChallengeDirection = 'all',
): Promise<ChallengeWithRelations[]> {
  const db = getDb();

  // Find all teams this player belongs to.
  const myTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.playerId, playerId));
  const myTeamIds = myTeams.map((m) => m.teamId);
  if (myTeamIds.length === 0) return [];

  // Build the where clause based on direction.
  const whereClause =
    direction === 'incoming'
      ? inArray(challenges.challengedTeamId, myTeamIds)
      : direction === 'outgoing'
        ? inArray(challenges.challengerTeamId, myTeamIds)
        : or(
            inArray(challenges.challengerTeamId, myTeamIds),
            inArray(challenges.challengedTeamId, myTeamIds),
          );

  const rows = await db
    .select()
    .from(challenges)
    .where(whereClause)
    .orderBy(desc(challenges.createdAt))
    .limit(50);

  // Fan out to fetch teams + games in bulk.
  const teamIds = new Set<string>();
  const gameIds = new Set<string>();
  for (const c of rows) {
    teamIds.add(c.challengerTeamId);
    teamIds.add(c.challengedTeamId);
    gameIds.add(c.gameId);
  }

  if (teamIds.size === 0) return [];

  const teamRows = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      tag: teams.tag,
      countryCode: teams.countryCode,
      city: teams.city,
    })
    .from(teams)
    .where(inArray(teams.id, Array.from(teamIds)));
  const gameRows = await db
    .select({ id: games.id, slug: games.slug, name: games.name })
    .from(games)
    .where(inArray(games.id, Array.from(gameIds)));

  const teamById = new Map(teamRows.map((t) => [t.id, t]));
  const gameById = new Map(gameRows.map((g) => [g.id, g]));

  const out: ChallengeWithRelations[] = [];
  for (const c of rows) {
    const challengerTeam = teamById.get(c.challengerTeamId);
    const challengedTeam = teamById.get(c.challengedTeamId);
    const game = gameById.get(c.gameId);
    if (challengerTeam && challengedTeam && game) {
      out.push({ challenge: c, challengerTeam, challengedTeam, game });
    }
  }
  return out;
}

export async function loadChallengeNegotiations(challengeId: string) {
  const db = getDb();
  return db
    .select()
    .from(challengeNegotiations)
    .where(eq(challengeNegotiations.challengeId, challengeId))
    .orderBy(challengeNegotiations.createdAt);
}

/**
 * Accept a pending or negotiating challenge. Verifies the persona belongs to the
 * challenged team. Creates a `matches` row and links it back to the challenge.
 */
export async function acceptChallenge(input: {
  challengeId: string;
  byPlayerId: string;
}): Promise<{ challenge: ChallengeRow; matchId: string }> {
  const db = getDb();
  const cRows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, input.challengeId))
    .limit(1);
  const challenge = cRows[0];
  if (!challenge) throw new ChallengeError('not_found', 'Challenge not found.');

  // Idempotent fast-path: already-accepted challenges return the existing match. This
  // avoids the scary 409 "invalid_state" error on a double-click.
  if (challenge.status === 'accepted' && challenge.matchId) {
    return { challenge, matchId: challenge.matchId };
  }

  if (!['pending', 'negotiating'].includes(challenge.status)) {
    throw new ChallengeError(
      'invalid_state',
      `This challenge has already been ${challenge.status}.`,
    );
  }

  // Authorisation: actor must be a member of the challenged team.
  const memberRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.playerId, input.byPlayerId),
        eq(teamMembers.teamId, challenge.challengedTeamId),
      ),
    )
    .limit(1);
  if (memberRows.length === 0) {
    throw new ChallengeError(
      'forbidden',
      'Only members of the challenged team can accept this challenge.',
    );
  }

  // Wrap match insert + challenge update in a transaction so a partial failure can't
  // leave an orphan match row + a still-pending challenge.
  const result = await db.transaction(async (tx) => {
    const matchRows = await tx
      .insert(matches)
      .values({
        matchType: 'challenge',
        challengeId: challenge.id,
        homeTeamId: challenge.challengerTeamId,
        awayTeamId: challenge.challengedTeamId,
        gameId: challenge.gameId,
        format: challenge.proposedFormat,
        scheduledAt: challenge.proposedDateRangeStart,
        status: 'scheduled',
        isOnline: false,
      })
      .returning({ id: matches.id });
    const matchId = matchRows[0]?.id;
    if (!matchId) throw new ChallengeError('insert_failed', 'Match insert returned no row.');

    const updateRows = await tx
      .update(challenges)
      .set({ status: 'accepted', acceptedAt: new Date(), matchId, updatedAt: new Date() })
      .where(eq(challenges.id, challenge.id))
      .returning();
    const updated = updateRows[0];
    if (!updated)
      throw new ChallengeError('update_failed', 'Challenge state update returned no row.');

    return { challenge: updated, matchId };
  });

  return result;
}

export async function rejectChallenge(input: {
  challengeId: string;
  byPlayerId: string;
}): Promise<ChallengeRow> {
  const db = getDb();
  const cRows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, input.challengeId))
    .limit(1);
  const challenge = cRows[0];
  if (!challenge) throw new ChallengeError('not_found', 'Challenge not found.');
  if (!['pending', 'negotiating'].includes(challenge.status)) {
    throw new ChallengeError(
      'invalid_state',
      `Cannot reject a challenge in state "${challenge.status}".`,
    );
  }

  const memberRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.playerId, input.byPlayerId),
        eq(teamMembers.teamId, challenge.challengedTeamId),
      ),
    )
    .limit(1);
  if (memberRows.length === 0) {
    throw new ChallengeError(
      'forbidden',
      'Only members of the challenged team can reject this challenge.',
    );
  }

  const updateRows = await db
    .update(challenges)
    .set({ status: 'rejected', updatedAt: new Date() })
    .where(eq(challenges.id, challenge.id))
    .returning();
  const updated = updateRows[0];
  if (!updated)
    throw new ChallengeError('update_failed', 'Challenge reject update returned no row.');
  return updated;
}

/**
 * Counter-propose: append a new negotiation row with new terms; flip status to negotiating.
 * Either side can counter (challenger after their own proposal, challenged on the original).
 * Authorisation: actor must be a member of the team they're proposing on behalf of.
 */
export async function counterChallenge(input: {
  challengeId: string;
  byPlayerId: string;
  proposedFormat: 'bo1' | 'bo3' | 'bo5';
  proposedDateRangeStart: Date;
  proposedDateRangeEnd: Date;
  proposedVenueSlug?: string | null;
  message?: string | null;
}): Promise<ChallengeRow> {
  const db = getDb();
  const cRows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, input.challengeId))
    .limit(1);
  const challenge = cRows[0];
  if (!challenge) throw new ChallengeError('not_found', 'Challenge not found.');
  if (!['pending', 'negotiating'].includes(challenge.status)) {
    throw new ChallengeError(
      'invalid_state',
      `Cannot counter a challenge in state "${challenge.status}".`,
    );
  }

  const memberRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.playerId, input.byPlayerId),
        inArray(teamMembers.teamId, [challenge.challengerTeamId, challenge.challengedTeamId]),
      ),
    )
    .limit(1);
  if (memberRows.length === 0) {
    throw new ChallengeError('forbidden', 'Only members of either side can counter-propose.');
  }
  const proposedByTeamId = memberRows[0]?.teamId;
  if (!proposedByTeamId) throw new ChallengeError('forbidden', 'Could not resolve proposing team.');

  await db.insert(challengeNegotiations).values({
    challengeId: challenge.id,
    proposedByTeamId,
    proposedFormat: input.proposedFormat,
    proposedDateRangeStart: input.proposedDateRangeStart,
    proposedDateRangeEnd: input.proposedDateRangeEnd,
    proposedVenueSlug: input.proposedVenueSlug ?? null,
    message: input.message ?? null,
  });

  const updateRows = await db
    .update(challenges)
    .set({
      status: 'negotiating',
      proposedFormat: input.proposedFormat,
      proposedDateRangeStart: input.proposedDateRangeStart,
      proposedDateRangeEnd: input.proposedDateRangeEnd,
      proposedVenueSlug: input.proposedVenueSlug ?? null,
      message: input.message ?? null,
      updatedAt: new Date(),
    })
    .where(eq(challenges.id, challenge.id))
    .returning();
  const updated = updateRows[0];
  if (!updated)
    throw new ChallengeError('update_failed', 'Challenge counter update returned no row.');
  return updated;
}

/** Map challengeId → list of intersecting game slugs between two teams. */
export async function intersectionGamesBetweenTeams(
  teamAId: string,
  teamBId: string,
): Promise<GameId[]> {
  const db = getDb();
  const { teamGames } = await import('../schema/team_games');
  const rows = await db
    .select({ teamId: teamGames.teamId, slug: games.slug })
    .from(teamGames)
    .innerJoin(games, eq(games.id, teamGames.gameId))
    .where(inArray(teamGames.teamId, [teamAId, teamBId]));
  const aSet = new Set<string>();
  const bSet = new Set<string>();
  for (const r of rows) {
    if (r.teamId === teamAId) aSet.add(r.slug);
    else if (r.teamId === teamBId) bSet.add(r.slug);
  }
  const out: GameId[] = [];
  for (const slug of aSet) {
    if (bSet.has(slug)) out.push(slug as GameId);
  }
  return out;
}

/** Domain error for challenge operations. */
export class ChallengeError extends Error {
  constructor(
    public code:
      | 'not_found'
      | 'forbidden'
      | 'invalid_state'
      | 'invalid_date_range'
      | 'cannot_challenge_self'
      | 'insert_failed'
      | 'update_failed',
    message: string,
  ) {
    super(message);
    this.name = 'ChallengeError';
  }
}
