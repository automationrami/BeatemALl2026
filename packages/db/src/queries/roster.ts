/**
 * Team roster management — E2 US-2.2 … US-2.7 (stories T-02…T-05, P-06, P-07).
 *
 * Invitations, role changes, captaincy transfer, leaving, editing and disbanding. Every
 * write locks the team row `FOR UPDATE` inside a transaction, so two concurrent roster
 * changes can't leave a team with zero or two captains (DOMAIN_MODEL §4.2: exactly one
 * captain at all times).
 *
 * `team_members` has a UNIQUE (team_id, player_id): an invitation re-uses a former
 * member's or a declined invitee's row instead of inserting a second one.
 */

import { and, asc, desc, eq, gt, inArray, isNull, or } from 'drizzle-orm';
import { getDb } from '../client';
import { teams, type TeamRow } from '../schema/teams';
import { teamMembers, type TeamMemberRow } from '../schema/team_members';
import { players } from '../schema/players';
import { users } from '../schema/users';
import { challenges } from '../schema/challenges';
import { tournamentRegistrations } from '../schema/tournament_registrations';
import { tournaments } from '../schema/tournaments';
import { activeMembership, isTeamLeaderRole, type TeamRole } from './roles';
import { notify, teamUserIds } from './notifications';
import { refundRegistrationRedemptionsInTx, type Tx } from './voucher';

/** Invitations not answered within 7 days lapse (DOMAIN_MODEL §4.2). */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Display order on the roster: captain first. */
export const ROLE_RANK: Record<TeamRole, number> = {
  captain: 0,
  co_captain: 1,
  starter: 2,
  substitute: 3,
  coach: 4,
  manager: 5,
};

export type RosterErrorCode =
  | 'invalid_body'
  | 'not_found'
  | 'player_not_found'
  | 'member_not_found'
  | 'invite_not_found'
  | 'forbidden'
  | 'leader_only'
  | 'captain_only'
  | 'team_disbanded'
  | 'not_open_to_invites'
  | 'already_member'
  | 'already_invited'
  | 'invite_expired'
  | 'cannot_target_self'
  | 'invalid_state'
  | 'sole_captain'
  | 'invalid_tag'
  | 'not_a_member';

const STATUS: Record<RosterErrorCode, number> = {
  invalid_body: 400,
  invalid_tag: 400,
  cannot_target_self: 400,
  not_found: 404,
  player_not_found: 404,
  member_not_found: 404,
  invite_not_found: 404,
  forbidden: 403,
  leader_only: 403,
  captain_only: 403,
  not_a_member: 403,
  team_disbanded: 409,
  not_open_to_invites: 409,
  already_member: 409,
  already_invited: 409,
  invite_expired: 409,
  invalid_state: 409,
  sole_captain: 409,
};

export class RosterError extends Error {
  constructor(
    public code: RosterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RosterError';
  }

  get status(): number {
    return STATUS[this.code];
  }
}

/* ------------------------------------------------------------------ reads */

export type RosterMember = {
  memberId: string;
  playerId: string;
  playerSlug: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: TeamRole;
  inGameRole: string | null;
  joinedAt: Date;
};

export async function loadTeamRowBySlug(slug: string): Promise<TeamRow | null> {
  if (!slug || slug.length > 80) return null;
  const [row] = await getDb().select().from(teams).where(eq(teams.slug, slug)).limit(1);
  return row ?? null;
}

/** Active roster (accepted, not left), captain first. */
export async function listTeamRoster(teamId: string): Promise<RosterMember[]> {
  const rows = await getDb()
    .select({
      memberId: teamMembers.id,
      playerId: players.id,
      playerSlug: players.slug,
      userId: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: teamMembers.role,
      inGameRole: teamMembers.inGameRole,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .innerJoin(users, eq(users.id, players.userId))
    .where(and(eq(teamMembers.teamId, teamId), activeMembership()))
    .orderBy(asc(teamMembers.joinedAt));
  return rows.sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);
}

export type PendingInvite = {
  playerSlug: string;
  displayName: string;
  invitedAt: Date;
  expiresAt: Date;
  invitedByName: string | null;
};

/** Open (unanswered, unexpired) invitations for a team, newest first. */
export async function listPendingTeamInvites(teamId: string): Promise<PendingInvite[]> {
  const db = getDb();
  const rows = await db
    .select({
      playerSlug: players.slug,
      displayName: users.displayName,
      invitedAt: teamMembers.updatedAt,
      invitedByPlayerId: teamMembers.invitedByPlayerId,
    })
    .from(teamMembers)
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .innerJoin(users, eq(users.id, players.userId))
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.invitationStatus, 'pending'),
        gt(teamMembers.updatedAt, new Date(Date.now() - INVITE_TTL_MS)),
      ),
    )
    .orderBy(desc(teamMembers.updatedAt));
  const inviterNames = await namesByPlayerId(
    rows.map((r) => r.invitedByPlayerId).filter((id): id is string => !!id),
  );
  return rows.map((r) => ({
    playerSlug: r.playerSlug,
    displayName: r.displayName,
    invitedAt: r.invitedAt,
    expiresAt: new Date(r.invitedAt.getTime() + INVITE_TTL_MS),
    invitedByName: r.invitedByPlayerId ? (inviterNames.get(r.invitedByPlayerId) ?? null) : null,
  }));
}

export type MyInvitation = {
  teamSlug: string;
  teamName: string;
  teamTag: string;
  teamCity: string | null;
  teamCountryCode: string;
  invitedAt: Date;
  expiresAt: Date;
  invitedByName: string | null;
};

/** The player's open invitations (P-06). Expired ones and disbanded teams are left out. */
export async function listMyInvitations(playerId: string): Promise<MyInvitation[]> {
  const rows = await getDb()
    .select({
      teamSlug: teams.slug,
      teamName: teams.name,
      teamTag: teams.tag,
      teamCity: teams.city,
      teamCountryCode: teams.countryCode,
      invitedAt: teamMembers.updatedAt,
      invitedByPlayerId: teamMembers.invitedByPlayerId,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(
      and(
        eq(teamMembers.playerId, playerId),
        eq(teamMembers.invitationStatus, 'pending'),
        isNull(teams.disbandedAt),
        gt(teamMembers.updatedAt, new Date(Date.now() - INVITE_TTL_MS)),
      ),
    )
    .orderBy(desc(teamMembers.updatedAt));
  const inviterNames = await namesByPlayerId(
    rows.map((r) => r.invitedByPlayerId).filter((id): id is string => !!id),
  );
  return rows.map((r) => ({
    teamSlug: r.teamSlug,
    teamName: r.teamName,
    teamTag: r.teamTag,
    teamCity: r.teamCity,
    teamCountryCode: r.teamCountryCode,
    invitedAt: r.invitedAt,
    expiresAt: new Date(r.invitedAt.getTime() + INVITE_TTL_MS),
    invitedByName: r.invitedByPlayerId ? (inviterNames.get(r.invitedByPlayerId) ?? null) : null,
  }));
}

async function namesByPlayerId(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await getDb()
    .select({ id: players.id, name: users.displayName })
    .from(players)
    .innerJoin(users, eq(users.id, players.userId))
    .where(inArray(players.id, unique));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/* ------------------------------------------------------------ helpers */

type Actor = { playerId: string; displayName?: string };

/** Lock the team row for the rest of the transaction. */
async function lockTeam(tx: Tx, slug: string): Promise<TeamRow> {
  const [team] = await tx.select().from(teams).where(eq(teams.slug, slug)).for('update').limit(1);
  if (!team) throw new RosterError('not_found', 'Team not found.');
  return team;
}

async function activeRow(tx: Tx, teamId: string, playerId: string) {
  const [row] = await tx
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.playerId, playerId), activeMembership()),
    )
    .limit(1);
  return row ?? null;
}

async function requireLeader(tx: Tx, team: TeamRow, playerId: string): Promise<TeamMemberRow> {
  const me = await activeRow(tx, team.id, playerId);
  if (!me) throw new RosterError('forbidden', 'Only members of this team can do that.');
  if (!isTeamLeaderRole(me.role)) {
    throw new RosterError('leader_only', 'Only the captain or co-captain can do that.');
  }
  return me;
}

function assertNotDisbanded(team: TeamRow) {
  if (team.disbandedAt) throw new RosterError('team_disbanded', 'This team has been disbanded.');
}

async function playerBySlug(tx: Tx, slug: string) {
  const clean = slug.trim().replace(/^@/, '').toLowerCase();
  if (!clean || clean.length > 80) return null;
  const [row] = await tx
    .select({
      id: players.id,
      slug: players.slug,
      userId: players.userId,
      isOpenToTeamInvites: players.isOpenToTeamInvites,
      displayName: users.displayName,
    })
    .from(players)
    .innerJoin(users, eq(users.id, players.userId))
    .where(eq(players.slug, clean))
    .limit(1);
  return row ?? null;
}

const teamHref = (slug: string) => `/teams/${slug}`;

/* ------------------------------------------------------------ invites */

/** T-02: a captain or co-captain invites a player by username (player slug). */
export async function invitePlayer(input: {
  teamSlug: string;
  actor: Actor;
  playerSlug: string;
}): Promise<{ playerSlug: string; displayName: string }> {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const team = await lockTeam(tx, input.teamSlug);
    assertNotDisbanded(team);
    await requireLeader(tx, team, input.actor.playerId);

    const target = await playerBySlug(tx, input.playerSlug);
    if (!target) throw new RosterError('player_not_found', 'No player with that username.');

    const [existing] = await tx
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.playerId, target.id)))
      .limit(1);

    if (existing && existing.invitationStatus === 'accepted' && !existing.leftAt) {
      throw new RosterError('already_member', 'That player is already on the team.');
    }
    if (
      existing &&
      existing.invitationStatus === 'pending' &&
      existing.updatedAt.getTime() > Date.now() - INVITE_TTL_MS
    ) {
      throw new RosterError('already_invited', 'That player already has a pending invitation.');
    }
    if (!target.isOpenToTeamInvites) {
      throw new RosterError('not_open_to_invites', 'That player is not open to team invitations.');
    }

    const now = new Date();
    if (existing) {
      await tx
        .update(teamMembers)
        .set({
          invitationStatus: 'pending',
          role: 'starter',
          invitedByPlayerId: input.actor.playerId,
          leftAt: null,
          updatedAt: now,
        })
        .where(eq(teamMembers.id, existing.id));
    } else {
      await tx.insert(teamMembers).values({
        teamId: team.id,
        playerId: target.id,
        role: 'starter',
        invitationStatus: 'pending',
        invitedByPlayerId: input.actor.playerId,
        joinedAt: now,
        updatedAt: now,
      });
    }
    return { team, target };
  });

  await notify({
    recipientUserIds: [result.target.userId],
    type: 'team_invite',
    title: `${result.team.name} invited you to join the team`,
    data: {
      href: '/me#invitations',
      team: result.team.name,
      teamSlug: result.team.slug,
      player: input.actor.displayName ?? null,
    },
  });
  return { playerSlug: result.target.slug, displayName: result.target.displayName };
}

/** T-02: cancel a pending invitation (captain or co-captain). */
export async function cancelInvite(input: {
  teamSlug: string;
  actor: Actor;
  playerSlug: string;
}): Promise<void> {
  await getDb().transaction(async (tx) => {
    const team = await lockTeam(tx, input.teamSlug);
    await requireLeader(tx, team, input.actor.playerId);
    const target = await playerBySlug(tx, input.playerSlug);
    if (!target)
      throw new RosterError('invite_not_found', 'No pending invitation for that player.');
    const updated = await tx
      .update(teamMembers)
      .set({ invitationStatus: 'rejected', updatedAt: new Date() })
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.playerId, target.id),
          eq(teamMembers.invitationStatus, 'pending'),
        ),
      )
      .returning({ id: teamMembers.id });
    if (updated.length === 0) {
      throw new RosterError('invite_not_found', 'No pending invitation for that player.');
    }
  });
}

/** P-06: accept or decline an invitation. Accepting puts the player on the roster as a starter. */
export async function respondToInvitation(input: {
  teamSlug: string;
  actor: Actor;
  action: 'accept' | 'decline';
}): Promise<{ teamSlug: string; teamName: string; status: 'accepted' | 'rejected' }> {
  const db = getDb();
  const team = await db.transaction(async (tx) => {
    const t = await lockTeam(tx, input.teamSlug).catch((err) => {
      if (err instanceof RosterError && err.code === 'not_found') {
        throw new RosterError('invite_not_found', 'No pending invitation from that team.');
      }
      throw err;
    });
    const [row] = await tx
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, t.id),
          eq(teamMembers.playerId, input.actor.playerId),
          eq(teamMembers.invitationStatus, 'pending'),
        ),
      )
      .limit(1);
    if (!row) throw new RosterError('invite_not_found', 'No pending invitation from that team.');
    assertNotDisbanded(t);
    if (row.updatedAt.getTime() <= Date.now() - INVITE_TTL_MS) {
      throw new RosterError('invite_expired', 'This invitation has expired.');
    }
    const now = new Date();
    await tx
      .update(teamMembers)
      .set(
        input.action === 'accept'
          ? { invitationStatus: 'accepted', joinedAt: now, leftAt: null, updatedAt: now }
          : { invitationStatus: 'rejected', updatedAt: now },
      )
      .where(eq(teamMembers.id, row.id));
    return t;
  });

  const leaders = await teamUserIds(team.id, true);
  const name = input.actor.displayName ?? null;
  await notify({
    recipientUserIds: leaders,
    type: input.action === 'accept' ? 'team_invite_accepted' : 'team_invite_declined',
    title:
      input.action === 'accept'
        ? `${name ?? 'A player'} joined ${team.name}`
        : `${name ?? 'A player'} declined the invitation to ${team.name}`,
    data: { href: teamHref(team.slug), team: team.name, teamSlug: team.slug, player: name },
  });

  return {
    teamSlug: team.slug,
    teamName: team.name,
    status: input.action === 'accept' ? 'accepted' : 'rejected',
  };
}

/* ------------------------------------------------------ member changes */

export type MemberAction = 'promote' | 'demote' | 'remove' | 'transfer_captaincy';

/**
 * T-03 / T-04 roster changes.
 *   promote → co_captain, demote → starter: captain only.
 *   remove: captain (anyone but themselves) or co-captain (players below co-captain).
 *   transfer_captaincy: captain only; the target becomes captain, the old captain co-captain.
 */
export async function updateTeamMember(input: {
  teamSlug: string;
  actor: Actor;
  playerSlug: string;
  action: MemberAction;
}): Promise<{ playerSlug: string; role: TeamRole | null }> {
  const db = getDb();
  const out = await db.transaction(async (tx) => {
    const team = await lockTeam(tx, input.teamSlug);
    assertNotDisbanded(team);
    const me = await requireLeader(tx, team, input.actor.playerId);

    const target = await playerBySlug(tx, input.playerSlug);
    if (!target) throw new RosterError('member_not_found', 'That player is not on the team.');
    const row = await activeRow(tx, team.id, target.id);
    if (!row) throw new RosterError('member_not_found', 'That player is not on the team.');
    if (target.id === input.actor.playerId) {
      throw new RosterError('cannot_target_self', 'You cannot do that to yourself.');
    }

    const isCaptain = me.role === 'captain';
    const now = new Date();

    switch (input.action) {
      case 'promote': {
        if (!isCaptain) throw new RosterError('captain_only', 'Only the captain can do that.');
        if (row.role === 'co_captain' || row.role === 'captain') {
          throw new RosterError('invalid_state', 'That player is already a team leader.');
        }
        await tx
          .update(teamMembers)
          .set({ role: 'co_captain', updatedAt: now })
          .where(eq(teamMembers.id, row.id));
        return { team, target, role: 'co_captain' as TeamRole };
      }
      case 'demote': {
        if (!isCaptain) throw new RosterError('captain_only', 'Only the captain can do that.');
        if (row.role !== 'co_captain') {
          throw new RosterError('invalid_state', 'Only a co-captain can be demoted.');
        }
        await tx
          .update(teamMembers)
          .set({ role: 'starter', updatedAt: now })
          .where(eq(teamMembers.id, row.id));
        return { team, target, role: 'starter' as TeamRole };
      }
      case 'remove': {
        if (!isCaptain && isTeamLeaderRole(row.role)) {
          throw new RosterError('captain_only', 'Only the captain can remove a co-captain.');
        }
        await tx
          .update(teamMembers)
          .set({ leftAt: now, updatedAt: now })
          .where(eq(teamMembers.id, row.id));
        return { team, target, role: null };
      }
      case 'transfer_captaincy': {
        if (!isCaptain) throw new RosterError('captain_only', 'Only the captain can do that.');
        await tx
          .update(teamMembers)
          .set({ role: 'co_captain', updatedAt: now })
          .where(eq(teamMembers.id, me.id));
        await tx
          .update(teamMembers)
          .set({ role: 'captain', updatedAt: now })
          .where(eq(teamMembers.id, row.id));
        return { team, target, role: 'captain' as TeamRole };
      }
    }
  });

  const { team, target } = out;
  const base = { href: teamHref(team.slug), team: team.name, teamSlug: team.slug };
  if (input.action === 'remove') {
    await notify({
      recipientUserIds: [target.userId],
      type: 'team_member_removed',
      title: `You were removed from ${team.name}`,
      data: base,
    });
  } else if (input.action === 'transfer_captaincy') {
    const everyone = await teamUserIds(team.id);
    await notify({
      recipientUserIds: everyone,
      type: 'team_captaincy_transferred',
      title: `${target.displayName} is now the captain of ${team.name}`,
      data: { ...base, player: target.displayName },
    });
  } else {
    await notify({
      recipientUserIds: [target.userId],
      type: 'team_role_changed',
      title: `Your role on ${team.name} is now ${out.role}`,
      data: { ...base, role: out.role },
    });
  }
  return { playerSlug: target.slug, role: out.role };
}

/** P-07: leave a team. The captain must hand over the captaincy first. */
export async function leaveTeam(input: { teamSlug: string; actor: Actor }): Promise<void> {
  await getDb().transaction(async (tx) => {
    const team = await lockTeam(tx, input.teamSlug);
    const row = await activeRow(tx, team.id, input.actor.playerId);
    if (!row) throw new RosterError('not_a_member', 'You are not on this team.');
    if (row.role === 'captain') {
      throw new RosterError(
        'sole_captain',
        'You are the captain. Transfer the captaincy to a teammate before leaving.',
      );
    }
    const now = new Date();
    await tx
      .update(teamMembers)
      .set({ leftAt: now, updatedAt: now })
      .where(eq(teamMembers.id, row.id));
  });
}

/* ------------------------------------------------------ edit / disband */

/** T-05: edit bio, city, recruiting flag and tag (captain or co-captain). */
export async function updateTeamDetails(input: {
  teamSlug: string;
  actor: Actor;
  bio?: string | null;
  city?: string | null;
  isRecruiting?: boolean;
  tag?: string;
}): Promise<TeamRow> {
  const patch: Partial<Pick<TeamRow, 'bio' | 'city' | 'isRecruiting' | 'tag'>> = {};
  if (input.bio !== undefined) patch.bio = input.bio?.trim() || null;
  if (input.city !== undefined) patch.city = input.city?.trim() || null;
  if (input.isRecruiting !== undefined) patch.isRecruiting = input.isRecruiting;
  if (input.tag !== undefined) {
    const tag = input.tag.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(tag)) {
      throw new RosterError('invalid_tag', 'Team tag must be 2–6 letters or digits, no spaces.');
    }
    patch.tag = tag;
  }
  return getDb().transaction(async (tx) => {
    const team = await lockTeam(tx, input.teamSlug);
    assertNotDisbanded(team);
    await requireLeader(tx, team, input.actor.playerId);
    if (Object.keys(patch).length === 0) return team;
    const [updated] = await tx
      .update(teams)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(teams.id, team.id))
      .returning();
    return updated ?? team;
  });
}

/** Tournaments that haven't started yet: entries there are still "open" and get withdrawn. */
const NOT_STARTED = ['draft', 'published', 'registration_open', 'registration_closed'] as const;

/**
 * T-05: disband (captain only). Marks the team disbanded, withdraws entries in tournaments
 * that haven't started (voucher payments go back), cancels open challenges, ends every
 * membership and pending invitation, then tells the former members.
 */
export async function disbandTeam(input: { teamSlug: string; actor: Actor }): Promise<{
  withdrawnRegistrations: number;
  cancelledChallenges: number;
}> {
  const db = getDb();
  const out = await db.transaction(async (tx) => {
    const team = await lockTeam(tx, input.teamSlug);
    assertNotDisbanded(team);
    const me = await activeRow(tx, team.id, input.actor.playerId);
    if (!me) throw new RosterError('forbidden', 'Only members of this team can do that.');
    if (me.role !== 'captain') {
      throw new RosterError('captain_only', 'Only the captain can disband the team.');
    }

    const memberUserIds = (
      await tx
        .select({ userId: players.userId })
        .from(teamMembers)
        .innerJoin(players, eq(players.id, teamMembers.playerId))
        .where(and(eq(teamMembers.teamId, team.id), activeMembership()))
    ).map((r) => r.userId);

    const now = new Date();

    const regs = await tx
      .select({ id: tournamentRegistrations.id })
      .from(tournamentRegistrations)
      .innerJoin(tournaments, eq(tournaments.id, tournamentRegistrations.tournamentId))
      .where(
        and(
          eq(tournamentRegistrations.teamId, team.id),
          inArray(tournamentRegistrations.status, ['pending_payment', 'confirmed', 'checked_in']),
          inArray(tournaments.status, [...NOT_STARTED]),
        ),
      );
    for (const r of regs) {
      await refundRegistrationRedemptionsInTx(tx, r.id);
      await tx
        .update(tournamentRegistrations)
        .set({ status: 'withdrawn', updatedAt: now })
        .where(eq(tournamentRegistrations.id, r.id));
    }

    const cancelled = await tx
      .update(challenges)
      .set({ status: 'cancelled', updatedAt: now })
      .where(
        and(
          or(eq(challenges.challengerTeamId, team.id), eq(challenges.challengedTeamId, team.id)),
          inArray(challenges.status, ['pending', 'negotiating']),
        ),
      )
      .returning({ id: challenges.id });

    // Pending invitations lapse; active members leave (so the team drops out of everyone's
    // "my teams" and can't be used to book, challenge or register any more).
    await tx
      .update(teamMembers)
      .set({ invitationStatus: 'rejected', updatedAt: now })
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.invitationStatus, 'pending')));
    await tx
      .update(teamMembers)
      .set({ leftAt: now, updatedAt: now })
      .where(and(eq(teamMembers.teamId, team.id), activeMembership()));

    await tx
      .update(teams)
      .set({ disbandedAt: now, isRecruiting: false, updatedAt: now })
      .where(eq(teams.id, team.id));

    return {
      team,
      memberUserIds,
      withdrawnRegistrations: regs.length,
      cancelledChallenges: cancelled.length,
    };
  });

  await notify({
    recipientUserIds: out.memberUserIds,
    type: 'team_disbanded',
    title: `${out.team.name} has been disbanded`,
    data: { href: teamHref(out.team.slug), team: out.team.name, teamSlug: out.team.slug },
  });
  return {
    withdrawnRegistrations: out.withdrawnRegistrations,
    cancelledChallenges: out.cancelledChallenges,
  };
}
