/**
 * Tournament-registration queries.
 *
 * Spec: DOMAIN_MODEL.md §9.2 + epic TM-2 (Registration & Check-in).
 *
 * Phase-1 simplifications (rationale lives in `schema/tournament_registrations.ts`):
 *   - Single team registers, no roster lock yet (TM-3).
 *   - Entry-fee + Tap Payments deferred to P-2. If the tournament has `entryFeeKwd > 0`
 *     the registration starts in `pending_payment`; otherwise `confirmed` immediately.
 *   - Capacity check uses a transactional advisory lock keyed on the tournament id —
 *     prevents two concurrent POSTs both pushing past `maxTeams`.
 */

import { and, asc, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { tournamentRegistrations } from '../schema/tournament_registrations';
import type { TournamentRegistrationRow } from '../schema/tournament_registrations';
import { tournaments } from '../schema/tournaments';
import type { TournamentRow } from '../schema/tournaments';
import { teams } from '../schema/teams';
import type { TeamRow } from '../schema/teams';
import { teamGames } from '../schema/team_games';
import { teamMembers } from '../schema/team_members';
import { games } from '../schema/games';
import type { GameRow } from '../schema/games';
import { users } from '../schema/users';
import { isTeamLeaderRole, loadTeamRole } from './roles';
import { refundRegistrationRedemptionsInTx } from './voucher';
import { isUuid } from './ids';

/** Statuses that count toward the tournament's capacity (the slot is taken). */
const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'checked_in'] as const;

export type RegistrationWithRelations = {
  registration: TournamentRegistrationRow;
  tournament: Pick<
    TournamentRow,
    'id' | 'slug' | 'name' | 'status' | 'maxTeams' | 'entryFeeKwd' | 'startsAt' | 'startsInLabel'
  >;
  team: Pick<TeamRow, 'id' | 'slug' | 'name' | 'tag'>;
  game: Pick<GameRow, 'id' | 'slug' | 'name'>;
  registeredByDisplayName: string;
};

/**
 * Register a team for a tournament. Atomic + race-safe via advisory lock keyed on the
 * tournament id (concurrent POSTs for the same tournament serialise; other tournaments
 * stay parallel).
 *
 * Validations:
 *   - Tournament must exist + status === `registration_open`
 *   - Team must exist + the calling persona must be its captain or co-captain
 *   - Team must play the tournament's game (intersection check)
 *   - Active roster must be at least the tournament's team size (US-TM2.2)
 *   - Active registrations count + 1 must not exceed `maxTeams`
 *   - Same `(tournament_id, team_id)` not already actively registered
 */
export async function registerTeamForTournament(input: {
  tournamentSlug: string;
  byUserId: string;
  byPlayerId: string;
  byTeamId: string;
}): Promise<RegistrationWithRelations> {
  const db = getDb();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, input.tournamentSlug))
    .limit(1);
  if (!tournament) {
    throw new TournamentRegistrationError('tournament_not_found', 'Tournament not found.');
  }
  if (tournament.status !== 'registration_open') {
    throw new TournamentRegistrationError(
      'registration_closed',
      `Registration is not open for ${tournament.name} (status: ${tournament.status}).`,
    );
  }

  const [team] = await db.select().from(teams).where(eq(teams.id, input.byTeamId)).limit(1);
  if (!team) {
    throw new TournamentRegistrationError('team_not_found', 'Team not found.');
  }

  // Authorisation: the captain or co-captain enters the team (US-TM2.1 "As a captain…").
  const role = await loadTeamRole(input.byPlayerId, team.id);
  if (!role) {
    throw new TournamentRegistrationError(
      'forbidden',
      "You must be a member of the team you're registering.",
    );
  }
  if (!isTeamLeaderRole(role)) {
    throw new TournamentRegistrationError(
      'captain_only',
      'Only the captain or co-captain can register the team.',
    );
  }

  // Game match: team plays the tournament's game.
  const [tg] = await db
    .select({ teamId: teamGames.teamId })
    .from(teamGames)
    .where(and(eq(teamGames.teamId, team.id), eq(teamGames.gameId, tournament.gameId)))
    .limit(1);
  if (!tg) {
    throw new TournamentRegistrationError(
      'game_mismatch',
      `${team.name} doesn't play this game. Add the game on your team profile first.`,
    );
  }

  // Eligibility: the active roster must fill the tournament's team size.
  const [roster] = await db
    .select({ n: count() })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, team.id),
        isNull(teamMembers.leftAt),
        eq(teamMembers.invitationStatus, 'accepted'),
      ),
    );
  const rosterSize = roster?.n ?? 0;
  if (rosterSize < tournament.teamSize) {
    throw new TournamentRegistrationError(
      'roster_too_small',
      `${tournament.name} needs ${tournament.teamSize} players per team; ${team.name} has ${rosterSize} on its roster.`,
    );
  }

  const initialStatus = tournament.entryFeeKwd > 0 ? 'pending_payment' : 'confirmed';

  const created = await db.transaction(async (tx) => {
    // Serialise per-tournament registration so capacity math is accurate under concurrency.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tournament.id}))`);

    // Capacity check: count current active registrations.
    const activeCountRows = await tx
      .select({ id: tournamentRegistrations.id })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          inArray(tournamentRegistrations.status, [...ACTIVE_STATUSES]),
        ),
      );
    if (activeCountRows.length >= tournament.maxTeams) {
      throw new TournamentRegistrationError(
        'tournament_full',
        `${tournament.name} is full (${tournament.maxTeams} teams).`,
      );
    }

    // Reactivate-on-rejoin support: if there's a withdrawn/disqualified row, flip it
    // back to active rather than insert a duplicate (the unique index would fail).
    const [existing] = await tx
      .select()
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          eq(tournamentRegistrations.teamId, team.id),
        ),
      )
      .limit(1);

    if (existing) {
      if ((ACTIVE_STATUSES as readonly string[]).includes(existing.status)) {
        throw new TournamentRegistrationError(
          'already_registered',
          `${team.name} is already registered.`,
        );
      }
      // Disqualification is an admin verdict — silently re-activating it would erase the
      // organiser's decision and zero out the audit trail. Force a contact-the-organiser
      // path instead.
      if (existing.status === 'disqualified') {
        throw new TournamentRegistrationError(
          'invalid_state',
          `${team.name} was disqualified from this tournament. Contact the organiser to appeal.`,
        );
      }
      // existing.status === 'withdrawn' → reactivate
      const updated = await tx
        .update(tournamentRegistrations)
        .set({
          status: initialStatus,
          registeredByUserId: input.byUserId,
          updatedAt: new Date(),
        })
        .where(eq(tournamentRegistrations.id, existing.id))
        .returning();
      const r = updated[0];
      if (!r)
        throw new TournamentRegistrationError(
          'insert_failed',
          'Re-register update returned no row.',
        );
      return r;
    }

    const inserted = await tx
      .insert(tournamentRegistrations)
      .values({
        tournamentId: tournament.id,
        teamId: team.id,
        registeredByUserId: input.byUserId,
        status: initialStatus,
      })
      .returning();
    const r = inserted[0];
    if (!r) throw new TournamentRegistrationError('insert_failed', 'Insert returned no row.');
    return r;
  });

  const detail = await loadRegistrationById(created.id);
  if (!detail) {
    throw new TournamentRegistrationError(
      'insert_failed',
      'Registration created but could not be loaded.',
    );
  }
  return detail;
}

/**
 * Withdraw a registration. Persona must be the original registrant or any member of the
 * registered team. Idempotent: re-withdraw is a no-op.
 */
export async function withdrawRegistration(input: {
  registrationId: string;
  byUserId: string;
  byPlayerId: string;
}): Promise<TournamentRegistrationRow> {
  if (!isUuid(input.registrationId)) {
    throw new TournamentRegistrationError('not_found', 'Registration not found.');
  }
  const db = getDb();
  const [reg] = await db
    .select()
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, input.registrationId))
    .limit(1);
  if (!reg) throw new TournamentRegistrationError('not_found', 'Registration not found.');

  // Auth check runs BEFORE the idempotent early-return — otherwise an attacker can probe
  // withdrawn registration IDs and learn they exist (no 403 thrown), while active IDs
  // correctly return 403. That asymmetry is a low-severity info leak.
  const isRegistrant = reg.registeredByUserId === input.byUserId;
  const role = await loadTeamRole(input.byPlayerId, reg.teamId);
  if (!isRegistrant && !role) {
    throw new TournamentRegistrationError(
      'forbidden',
      'Only the registrant or a teammate can withdraw this entry.',
    );
  }
  if (!isRegistrant && !isTeamLeaderRole(role)) {
    throw new TournamentRegistrationError(
      'captain_only',
      'Only the captain or co-captain can withdraw the team.',
    );
  }

  if (reg.status === 'withdrawn') return reg;

  if (reg.status === 'checked_in' || reg.status === 'disqualified') {
    throw new TournamentRegistrationError(
      'invalid_state',
      `Cannot withdraw a registration in state "${reg.status}".`,
    );
  }

  // Withdrawing before the event gives any voucher payment back to the voucher.
  const updated = await db.transaction(async (tx) => {
    await refundRegistrationRedemptionsInTx(tx, reg.id);
    return tx
      .update(tournamentRegistrations)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(tournamentRegistrations.id, reg.id))
      .returning();
  });
  const out = updated[0];
  if (!out)
    throw new TournamentRegistrationError('update_failed', 'Withdraw update returned no row.');
  return out;
}

export async function loadRegistrationById(id: string): Promise<RegistrationWithRelations | null> {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [reg] = await db
    .select()
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, id))
    .limit(1);
  if (!reg) return null;

  const [tour] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, reg.tournamentId))
    .limit(1);
  if (!tour) {
    // FK is `restrict` so this branch can't legitimately fire — log loudly so an
    // ops-side data integrity bug doesn't silently surface as a generic 404.
    console.error('[loadRegistrationById] orphan tournament FK', {
      regId: id,
      tournamentId: reg.tournamentId,
    });
    return null;
  }
  const [tm] = await db.select().from(teams).where(eq(teams.id, reg.teamId)).limit(1);
  if (!tm) {
    console.error('[loadRegistrationById] orphan team FK', { regId: id, teamId: reg.teamId });
    return null;
  }
  const [g] = await db.select().from(games).where(eq(games.id, tour.gameId)).limit(1);
  if (!g) {
    console.error('[loadRegistrationById] orphan game FK', { regId: id, gameId: tour.gameId });
    return null;
  }
  const [u] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, reg.registeredByUserId))
    .limit(1);

  return {
    registration: reg,
    tournament: {
      id: tour.id,
      slug: tour.slug,
      name: tour.name,
      status: tour.status,
      maxTeams: tour.maxTeams,
      entryFeeKwd: tour.entryFeeKwd,
      startsAt: tour.startsAt,
      startsInLabel: tour.startsInLabel,
    },
    team: { id: tm.id, slug: tm.slug, name: tm.name, tag: tm.tag },
    game: { id: g.id, slug: g.slug, name: g.name },
    registeredByDisplayName: u?.displayName ?? '—',
  };
}

/**
 * Public list of registered teams for a tournament, ordered by registration time.
 * Withdrawn / disqualified rows are excluded by default (caller can pass `includeAll`
 * if they want to render an audit log).
 */
export async function listRegistrationsForTournament(
  tournamentSlug: string,
  options: { includeAll?: boolean } = {},
): Promise<RegistrationWithRelations[]> {
  const db = getDb();
  const [tour] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.slug, tournamentSlug))
    .limit(1);
  if (!tour) return [];

  const where = options.includeAll
    ? eq(tournamentRegistrations.tournamentId, tour.id)
    : and(
        eq(tournamentRegistrations.tournamentId, tour.id),
        inArray(tournamentRegistrations.status, [...ACTIVE_STATUSES]),
      );

  const regs = await db
    .select()
    .from(tournamentRegistrations)
    .where(where)
    .orderBy(asc(tournamentRegistrations.createdAt));
  if (regs.length === 0) return [];

  const teamIds = new Set(regs.map((r) => r.teamId));
  const userIds = new Set(regs.map((r) => r.registeredByUserId));
  const [teamRows, gameRows, userRows] = await Promise.all([
    db
      .select()
      .from(teams)
      .where(inArray(teams.id, [...teamIds])),
    db.select().from(games).where(eq(games.id, tour.gameId)),
    db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, [...userIds])),
  ]);
  const teamById = new Map(teamRows.map((t) => [t.id, t]));
  const game = gameRows[0];
  const userById = new Map(userRows.map((u) => [u.id, u.displayName]));
  if (!game) return [];

  const out: RegistrationWithRelations[] = [];
  for (const r of regs) {
    const tm = teamById.get(r.teamId);
    if (!tm) continue;
    out.push({
      registration: r,
      tournament: {
        id: tour.id,
        slug: tour.slug,
        name: tour.name,
        status: tour.status,
        maxTeams: tour.maxTeams,
        entryFeeKwd: tour.entryFeeKwd,
        startsAt: tour.startsAt,
        startsInLabel: tour.startsInLabel,
      },
      team: { id: tm.id, slug: tm.slug, name: tm.name, tag: tm.tag },
      game: { id: game.id, slug: game.slug, name: game.name },
      registeredByDisplayName: userById.get(r.registeredByUserId) ?? '—',
    });
  }
  return out;
}

/** "My tournaments" — registrations made by user OR for any of their teams. */
export async function listRegistrationsForPlayer(
  playerId: string,
  userId: string,
): Promise<RegistrationWithRelations[]> {
  const db = getDb();
  const myTeamRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.playerId, playerId));
  const myTeamIds = myTeamRows.map((r) => r.teamId);

  const where =
    myTeamIds.length > 0
      ? or(
          eq(tournamentRegistrations.registeredByUserId, userId),
          inArray(tournamentRegistrations.teamId, myTeamIds),
        )
      : eq(tournamentRegistrations.registeredByUserId, userId);

  const regs = await db
    .select()
    .from(tournamentRegistrations)
    .where(where)
    .orderBy(desc(tournamentRegistrations.createdAt))
    .limit(50);
  if (regs.length === 0) return [];

  const tournamentIds = new Set(regs.map((r) => r.tournamentId));
  const teamIds = new Set(regs.map((r) => r.teamId));
  const userIds = new Set(regs.map((r) => r.registeredByUserId));

  const [tourRows, teamRows, userRows] = await Promise.all([
    db
      .select()
      .from(tournaments)
      .where(inArray(tournaments.id, [...tournamentIds])),
    db
      .select()
      .from(teams)
      .where(inArray(teams.id, [...teamIds])),
    db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, [...userIds])),
  ]);
  const gameIds = new Set(tourRows.map((t) => t.gameId));
  const gameRows = await db
    .select()
    .from(games)
    .where(inArray(games.id, [...gameIds]));

  const tourById = new Map(tourRows.map((t) => [t.id, t]));
  const teamById = new Map(teamRows.map((t) => [t.id, t]));
  const gameById = new Map(gameRows.map((g) => [g.id, g]));
  const userById = new Map(userRows.map((u) => [u.id, u.displayName]));

  const out: RegistrationWithRelations[] = [];
  for (const r of regs) {
    const tour = tourById.get(r.tournamentId);
    const tm = teamById.get(r.teamId);
    if (!tour || !tm) continue;
    const game = gameById.get(tour.gameId);
    if (!game) continue;
    out.push({
      registration: r,
      tournament: {
        id: tour.id,
        slug: tour.slug,
        name: tour.name,
        status: tour.status,
        maxTeams: tour.maxTeams,
        entryFeeKwd: tour.entryFeeKwd,
        startsAt: tour.startsAt,
        startsInLabel: tour.startsInLabel,
      },
      team: { id: tm.id, slug: tm.slug, name: tm.name, tag: tm.tag },
      game: { id: game.id, slug: game.slug, name: game.name },
      registeredByDisplayName: userById.get(r.registeredByUserId) ?? '—',
    });
  }
  return out;
}

export class TournamentRegistrationError extends Error {
  constructor(
    public code:
      | 'tournament_not_found'
      | 'team_not_found'
      | 'not_found'
      | 'forbidden'
      | 'captain_only'
      | 'roster_too_small'
      | 'registration_closed'
      | 'game_mismatch'
      | 'tournament_full'
      | 'already_registered'
      | 'invalid_state'
      | 'insert_failed'
      | 'update_failed',
    message: string,
  ) {
    super(message);
    this.name = 'TournamentRegistrationError';
  }
}
