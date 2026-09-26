/**
 * Challenge queries + state-machine helpers.
 *
 * Spec: DOMAIN_MODEL.md §7.1 + epic E6 (Challenge, Negotiation & Match Lifecycle).
 *
 * The persona-as-current-user pattern (see `current_user.ts`) is what authorises
 * write actions in Phase 1. Real Auth.js takes over in Phase 9 / E1-S2.
 */

import { and, count, desc, eq, gte, inArray, or } from 'drizzle-orm';
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
import { activeMembership, isTeamLeaderRole, loadTeamRole } from './roles';
import { isUuid } from './ids';

/** US-E6.1 anti-spam: open challenges a team may have at once, and sends per rolling day. */
export const MAX_PENDING_CHALLENGES = 3;
export const MAX_CHALLENGES_PER_DAY = 10;
/** US-E6.3: counter-proposals allowed after the original proposal. */
export const MAX_COUNTER_PROPOSALS = 5;

const OPEN_STATUSES = ['pending', 'negotiating'] as const;

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
  byPlayerId: string;
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

  const role = await loadTeamRole(input.byPlayerId, input.challengerTeamId);
  if (!role)
    throw new ChallengeError('forbidden', 'Only members of the team can send its challenges.');
  if (!isTeamLeaderRole(role)) {
    throw new ChallengeError('captain_only', 'Only the captain or co-captain can send challenges.');
  }

  const db = getDb();
  const [open] = await db
    .select({ n: count() })
    .from(challenges)
    .where(
      and(
        eq(challenges.challengerTeamId, input.challengerTeamId),
        inArray(challenges.status, [...OPEN_STATUSES]),
      ),
    );
  if ((open?.n ?? 0) >= MAX_PENDING_CHALLENGES) {
    throw new ChallengeError(
      'too_many_pending',
      `Your team already has ${MAX_PENDING_CHALLENGES} open challenges. Wait for a reply before sending more.`,
    );
  }
  const [today] = await db
    .select({ n: count() })
    .from(challenges)
    .where(
      and(
        eq(challenges.challengerTeamId, input.challengerTeamId),
        gte(challenges.createdAt, new Date(Date.now() - 86_400_000)),
      ),
    );
  if ((today?.n ?? 0) >= MAX_CHALLENGES_PER_DAY) {
    throw new ChallengeError(
      'daily_limit',
      `Teams can send ${MAX_CHALLENGES_PER_DAY} challenges a day. Try again tomorrow.`,
    );
  }

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
  if (!isUuid(id)) return null;
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
    .where(and(eq(teamMembers.playerId, playerId), activeMembership()));
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
 * Whose move is it? The side that did NOT make the latest proposal responds to it
 * (US-E6.3 "goes to challenger for acceptance", US-E6.4 "captain (either side)").
 */
export async function loadRespondingTeamId(challenge: ChallengeRow): Promise<string> {
  const db = getDb();
  const [latest] = await db
    .select({ by: challengeNegotiations.proposedByTeamId })
    .from(challengeNegotiations)
    .where(eq(challengeNegotiations.challengeId, challenge.id))
    .orderBy(desc(challengeNegotiations.createdAt))
    .limit(1);
  const proposer = latest?.by ?? challenge.challengerTeamId;
  return proposer === challenge.challengedTeamId
    ? challenge.challengerTeamId
    : challenge.challengedTeamId;
}

/** Only members of either team can see a challenge (its message and terms are private). */
export async function canViewChallenge(
  challenge: ChallengeRow,
  playerId: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.playerId, playerId),
        inArray(teamMembers.teamId, [challenge.challengerTeamId, challenge.challengedTeamId]),
        activeMembership(),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** The responding team's captain or co-captain may act; everyone else gets a precise error. */
async function requireResponder(
  challenge: ChallengeRow,
  playerId: string,
  verb: 'accept' | 'reject' | 'counter',
): Promise<string> {
  const responding = await loadRespondingTeamId(challenge);
  const role = await loadTeamRole(playerId, responding);
  if (!role) {
    const other =
      responding === challenge.challengerTeamId
        ? challenge.challengedTeamId
        : challenge.challengerTeamId;
    if (await loadTeamRole(playerId, other)) {
      throw new ChallengeError(
        'not_your_turn',
        'Waiting for the other team to respond to your proposal.',
      );
    }
    throw new ChallengeError('forbidden', `Only the two teams in this challenge can ${verb} it.`);
  }
  if (!isTeamLeaderRole(role)) {
    throw new ChallengeError(
      'captain_only',
      `Only the captain or co-captain can ${verb} a challenge.`,
    );
  }
  return responding;
}

/**
 * Accept the latest proposal. The captain of the side it was sent to accepts: the
 * challenged team for the original, the challenger for a counter. Creates the match.
 */
export async function acceptChallenge(input: {
  challengeId: string;
  byPlayerId: string;
}): Promise<{ challenge: ChallengeRow; matchId: string }> {
  const db = getDb();
  if (!isUuid(input.challengeId)) throw new ChallengeError('not_found', 'Challenge not found.');
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

  await requireResponder(challenge, input.byPlayerId, 'accept');

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
  if (!isUuid(input.challengeId)) throw new ChallengeError('not_found', 'Challenge not found.');
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

  await requireResponder(challenge, input.byPlayerId, 'reject');

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
 * Turn-based: only the side answering the latest proposal can counter it, at most
 * MAX_COUNTER_PROPOSALS times, after which the challenge expires (US-E6.3).
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
  if (!isUuid(input.challengeId)) throw new ChallengeError('not_found', 'Challenge not found.');
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

  if (input.proposedDateRangeEnd <= input.proposedDateRangeStart) {
    throw new ChallengeError('invalid_date_range', 'The proposed end must be after the start.');
  }
  if (input.proposedDateRangeStart.getTime() < Date.now() - 60_000) {
    throw new ChallengeError('invalid_date_range', "The proposed start can't be in the past.");
  }
  const proposedByTeamId = await requireResponder(challenge, input.byPlayerId, 'counter');

  const [made] = await db
    .select({ n: count() })
    .from(challengeNegotiations)
    .where(eq(challengeNegotiations.challengeId, challenge.id));
  // The first negotiation row is the original proposal, not a counter.
  if ((made?.n ?? 1) - 1 >= MAX_COUNTER_PROPOSALS) {
    await db
      .update(challenges)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(challenges.id, challenge.id));
    throw new ChallengeError(
      'counter_limit_reached',
      `This challenge reached ${MAX_COUNTER_PROPOSALS} counter-proposals and has expired. Send a fresh challenge.`,
    );
  }

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
      | 'captain_only'
      | 'not_your_turn'
      | 'too_many_pending'
      | 'daily_limit'
      | 'counter_limit_reached'
      | 'insert_failed'
      | 'update_failed',
    message: string,
  ) {
    super(message);
    this.name = 'ChallengeError';
  }
}
