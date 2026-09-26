/**
 * Tournament management — the organiser side of TM-1…TM-4 (stories M-02…M-09).
 *
 *   - Permission: owner / admin / organizer of a VERIFIED organisation manages its tournaments.
 *   - Lifecycle: draft → registration_open ⇄ registration_closed → in_progress → completed;
 *     anything not completed can be cancelled (entries withdrawn, vouchers refunded).
 *   - Entries: disqualify (with reason) / reinstate / check in / undo check-in.
 *   - Bracket: single elimination from checked-in teams (or every confirmed team when nobody
 *     checked in). A `matches` row exists only for pairings whose two teams are known.
 *   - Results: the organiser records scores; the winner advances; the next match is created
 *     when both of its teams are known. A result can be corrected until the next match has one.
 *   - Completion: final standings, ranking points for federation events that award them.
 *
 * Every state change runs in a transaction holding a per-tournament advisory lock so two
 * organisers clicking at once can't double-advance a bracket. Notifications go out after
 * commit and never fail the action.
 */

import { and, asc, count, desc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import {
  BracketError,
  advanceWinner,
  buildSingleElimination,
  isFinalDecided,
  isPairingLocked,
  roundLabel,
  seedTeams,
  standings as bracketStandings,
  type BracketTree,
} from '@beat-em-all/utils';
import { getDb } from '../client';
import { tournaments, type TournamentRow } from '../schema/tournaments';
import {
  tournamentRegistrations,
  type TournamentRegistrationRow,
} from '../schema/tournament_registrations';
import { organizations, type OrganizationRow } from '../schema/organizations';
import { memberships, type MembershipRow } from '../schema/memberships';
import { games } from '../schema/games';
import { teams } from '../schema/teams';
import { users } from '../schema/users';
import { brackets, matchResults, tournamentRounds, type BracketData } from '../schema/brackets';
import { matches } from '../schema/matches';
import { rankingPoints } from '../schema/ranking_points';
import { voucherRedemptions } from '../schema/vouchers';
import { refundRegistrationRedemptionsInTx, type Tx } from './voucher';
import { notify, teamUserIds } from './notifications';
import { isUuid } from './ids';
import { isOrganizationMember, loadBracketView, type BracketView } from './tournament';
import { slugBase } from './organization_apply';

// ---------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------

export type TournamentAdminErrorCode =
  | 'not_found'
  | 'organization_not_found'
  | 'forbidden'
  | 'org_not_verified'
  | 'game_not_found'
  | 'federation_only'
  | 'starts_in_past'
  | 'closes_after_start'
  | 'min_above_max'
  | 'below_entries'
  | 'entries_exist'
  | 'invalid_state'
  | 'not_editable'
  | 'not_enough_teams'
  | 'tournament_full'
  | 'reason_required'
  | 'not_confirmed'
  | 'same_score'
  | 'match_not_ready'
  | 'result_locked'
  | 'final_not_played'
  | 'insert_failed';

/** HTTP status for each code, shared by the /api/manage routes. */
export const TOURNAMENT_ADMIN_ERROR_STATUS: Record<TournamentAdminErrorCode, number> = {
  not_found: 404,
  organization_not_found: 404,
  forbidden: 403,
  org_not_verified: 403,
  game_not_found: 400,
  federation_only: 400,
  starts_in_past: 400,
  closes_after_start: 400,
  min_above_max: 400,
  below_entries: 409,
  entries_exist: 409,
  invalid_state: 409,
  not_editable: 409,
  not_enough_teams: 409,
  tournament_full: 409,
  reason_required: 400,
  not_confirmed: 409,
  same_score: 400,
  match_not_ready: 409,
  result_locked: 409,
  final_not_played: 409,
  insert_failed: 500,
};

export class TournamentAdminError extends Error {
  constructor(
    public code: TournamentAdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TournamentAdminError';
  }
}

// ---------------------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------------------

/** Membership roles that run an organisation's tournaments (DOMAIN_MODEL §3.2). */
export const TOURNAMENT_MANAGER_ROLES: readonly MembershipRow['role'][] = [
  'owner',
  'admin',
  'organizer',
];

export type TournamentOrganization = {
  id: string;
  slug: string;
  name: string;
  tier: OrganizationRow['tier'];
  role: MembershipRow['role'];
};

function managerMembership(userId: string) {
  return and(
    eq(memberships.userId, userId),
    isNull(memberships.revokedAt),
    isNotNull(memberships.acceptedAt),
    inArray(memberships.role, [...TOURNAMENT_MANAGER_ROLES]),
  );
}

/** Verified organisations where the user is owner / admin / organizer. */
export async function listTournamentOrganizations(
  userId: string,
): Promise<TournamentOrganization[]> {
  return getDb()
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      tier: organizations.tier,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        managerMembership(userId),
        eq(organizations.verificationStatus, 'verified'),
        isNull(organizations.deletedAt),
      ),
    )
    .orderBy(organizations.name);
}

/**
 * Can the user manage this organisation's tournaments? Needs an active owner / admin /
 * organizer membership AND the organisation must be verified.
 */
export async function canManageOrganizationTournaments(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        managerMembership(userId),
        eq(memberships.organizationId, organizationId),
        eq(organizations.verificationStatus, 'verified'),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1);
  return !!row;
}

/** User ids of everyone who runs the organisation's tournaments (owner/admin/organizer). */
export async function tournamentManagerUserIds(organizationId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        isNull(memberships.revokedAt),
        isNotNull(memberships.acceptedAt),
        inArray(memberships.role, [...TOURNAMENT_MANAGER_ROLES]),
      ),
    );
  return rows.map((r) => r.userId);
}

/**
 * Load a tournament the user may manage. Unknown slugs, and drafts of organisations the
 * user isn't in, are `not_found`; everything else they can't manage is `forbidden`.
 */
async function requireManagedTournament(
  slug: string,
  userId: string,
): Promise<{ tournament: TournamentRow; organization: OrganizationRow }> {
  const db = getDb();
  const [row] = await db
    .select({ tournament: tournaments, organization: organizations })
    .from(tournaments)
    .innerJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .where(and(eq(tournaments.slug, slug), isNull(tournaments.deletedAt)))
    .limit(1);
  if (!row) throw new TournamentAdminError('not_found', 'Tournament not found.');
  if (!(await canManageOrganizationTournaments(userId, row.organization.id))) {
    if (
      row.tournament.status === 'draft' &&
      !(await isOrganizationMember(userId, row.organization.id))
    ) {
      throw new TournamentAdminError('not_found', 'Tournament not found.');
    }
    throw new TournamentAdminError(
      'forbidden',
      "Only the organisation's owners, admins and organisers can manage this tournament.",
    );
  }
  return row;
}

// ---------------------------------------------------------------------------------------
// Create / edit (M-02)
// ---------------------------------------------------------------------------------------

export type SeedingChoice = 'check_in' | 'random';

export type TournamentFields = {
  name: string;
  gameSlug: string;
  matchFormat: 'bo1' | 'bo3' | 'bo5';
  teamSize: number;
  maxTeams: number;
  minTeams: number;
  entryFeeKwd: number;
  prizePoolKwd: number;
  startsAt: Date;
  registrationClosesAt: Date | null;
  description: string | null;
  rulesUrl: string | null;
  isOfficialSanctioned: boolean;
  awardsRankingPoints: boolean;
  seedingStrategy: SeedingChoice;
};

function checkFields(f: Partial<TournamentFields>, org: Pick<OrganizationRow, 'tier'>) {
  if ((f.isOfficialSanctioned || f.awardsRankingPoints) && org.tier !== 'federation') {
    throw new TournamentAdminError(
      'federation_only',
      'Only federation organisations can run sanctioned or ranking-points events.',
    );
  }
  if (f.minTeams !== undefined && f.maxTeams !== undefined && f.minTeams > f.maxTeams) {
    throw new TournamentAdminError('min_above_max', 'Minimum teams cannot exceed maximum teams.');
  }
  if (f.registrationClosesAt && f.startsAt && f.registrationClosesAt > f.startsAt) {
    throw new TournamentAdminError(
      'closes_after_start',
      'Registration must close before the tournament starts.',
    );
  }
}

async function resolveGameId(gameSlug: string): Promise<string> {
  const [g] = await getDb()
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.slug, gameSlug), eq(games.isActive, true)))
    .limit(1);
  if (!g) throw new TournamentAdminError('game_not_found', `Unknown game "${gameSlug}".`);
  return g.id;
}

async function uniqueTournamentSlug(name: string): Promise<string> {
  const db = getDb();
  const base = slugBase(name, 'tournament');
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const [hit] = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(eq(tournaments.slug, candidate))
      .limit(1);
    if (!hit) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

export async function createTournament(
  input: TournamentFields & { organizationSlug: string },
  byUserId: string,
): Promise<TournamentRow> {
  const db = getDb();
  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.slug, input.organizationSlug), isNull(organizations.deletedAt)))
    .limit(1);
  if (!org) throw new TournamentAdminError('organization_not_found', 'Organisation not found.');

  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(managerMembership(byUserId), eq(memberships.organizationId, org.id)))
    .limit(1);
  if (!membership) {
    throw new TournamentAdminError(
      'forbidden',
      "Only the organisation's owners, admins and organisers can create tournaments.",
    );
  }
  if (org.verificationStatus !== 'verified') {
    throw new TournamentAdminError(
      'org_not_verified',
      'Your organisation is still under review. You can create tournaments once it is approved.',
    );
  }

  checkFields(input, org);
  if (input.startsAt.getTime() < Date.now()) {
    throw new TournamentAdminError('starts_in_past', 'The start date must be in the future.');
  }
  const gameId = await resolveGameId(input.gameSlug);

  const values = {
    organizationId: org.id,
    gameId,
    createdByUserId: byUserId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    format: 'single_elimination' as const,
    matchFormat: input.matchFormat,
    teamSize: input.teamSize,
    minTeams: input.minTeams,
    maxTeams: input.maxTeams,
    seedingStrategy: input.seedingStrategy,
    entryFeeKwd: input.entryFeeKwd,
    prizePoolKwd: input.prizePoolKwd,
    isOfficialSanctioned: input.isOfficialSanctioned,
    awardsRankingPoints: input.awardsRankingPoints,
    startsAt: input.startsAt,
    registrationClosesAt: input.registrationClosesAt,
    rulesUrl: input.rulesUrl?.trim() || null,
    status: 'draft' as const,
    startsInLabel: null,
    registrationLabel: null,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await uniqueTournamentSlug(input.name);
    try {
      const [row] = await db
        .insert(tournaments)
        .values({ ...values, slug })
        .returning();
      if (!row) throw new TournamentAdminError('insert_failed', 'Insert returned no row.');
      return row;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new TournamentAdminError('insert_failed', 'Could not allocate a tournament URL.');
}

const EDITABLE_STATUSES: TournamentRow['status'][] = ['draft', 'published', 'registration_open'];
const ACTIVE_ENTRY: TournamentRegistrationRow['status'][] = [
  'pending_payment',
  'confirmed',
  'checked_in',
];

export async function updateTournament(
  slug: string,
  patch: Partial<TournamentFields>,
  byUserId: string,
): Promise<TournamentRow> {
  const { tournament: t, organization: org } = await requireManagedTournament(slug, byUserId);
  if (!EDITABLE_STATUSES.includes(t.status)) {
    throw new TournamentAdminError(
      'not_editable',
      'Details can only be edited before registration closes.',
    );
  }
  const merged: Partial<TournamentFields> = {
    isOfficialSanctioned: patch.isOfficialSanctioned ?? t.isOfficialSanctioned,
    awardsRankingPoints: patch.awardsRankingPoints ?? t.awardsRankingPoints,
    minTeams: patch.minTeams ?? t.minTeams,
    maxTeams: patch.maxTeams ?? t.maxTeams,
    startsAt: patch.startsAt ?? t.startsAt ?? undefined,
    registrationClosesAt:
      patch.registrationClosesAt !== undefined
        ? patch.registrationClosesAt
        : t.registrationClosesAt,
  };
  // Only flag the federation rule when the patch turns a flag on (legacy rows stay editable).
  checkFields(
    {
      ...merged,
      isOfficialSanctioned: patch.isOfficialSanctioned === true,
      awardsRankingPoints: patch.awardsRankingPoints === true,
    },
    org,
  );
  if (patch.startsAt && patch.startsAt.getTime() < Date.now()) {
    throw new TournamentAdminError('starts_in_past', 'The start date must be in the future.');
  }

  const db = getDb();
  const [active] = await db
    .select({ n: count() })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, t.id),
        inArray(tournamentRegistrations.status, ACTIVE_ENTRY),
      ),
    );
  const entries = active?.n ?? 0;
  if (patch.maxTeams !== undefined && patch.maxTeams < entries) {
    throw new TournamentAdminError(
      'below_entries',
      `${entries} teams are already entered; the maximum can't go below that.`,
    );
  }
  if (patch.teamSize !== undefined && patch.teamSize !== t.teamSize && entries > 0) {
    throw new TournamentAdminError(
      'entries_exist',
      'Team size is locked once teams have entered (their rosters were checked against it).',
    );
  }

  const gameId = patch.gameSlug ? await resolveGameId(patch.gameSlug) : undefined;
  if (gameId && gameId !== t.gameId && entries > 0) {
    throw new TournamentAdminError('entries_exist', 'The game is locked once teams have entered.');
  }

  const [row] = await db
    .update(tournaments)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(gameId ? { gameId } : {}),
      ...(patch.matchFormat ? { matchFormat: patch.matchFormat } : {}),
      ...(patch.teamSize !== undefined ? { teamSize: patch.teamSize } : {}),
      ...(patch.maxTeams !== undefined ? { maxTeams: patch.maxTeams } : {}),
      ...(patch.minTeams !== undefined ? { minTeams: patch.minTeams } : {}),
      ...(patch.entryFeeKwd !== undefined ? { entryFeeKwd: patch.entryFeeKwd } : {}),
      ...(patch.prizePoolKwd !== undefined ? { prizePoolKwd: patch.prizePoolKwd } : {}),
      ...(patch.startsAt ? { startsAt: patch.startsAt } : {}),
      ...(patch.registrationClosesAt !== undefined
        ? { registrationClosesAt: patch.registrationClosesAt }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      ...(patch.rulesUrl !== undefined ? { rulesUrl: patch.rulesUrl?.trim() || null } : {}),
      ...(patch.isOfficialSanctioned !== undefined
        ? { isOfficialSanctioned: patch.isOfficialSanctioned }
        : {}),
      ...(patch.awardsRankingPoints !== undefined
        ? { awardsRankingPoints: patch.awardsRankingPoints }
        : {}),
      ...(patch.seedingStrategy ? { seedingStrategy: patch.seedingStrategy } : {}),
      // Dates may have moved: stop showing the cached seed labels, pages render from dates.
      startsInLabel: null,
      updatedAt: new Date(),
    })
    .where(eq(tournaments.id, t.id))
    .returning();
  if (!row) throw new TournamentAdminError('not_found', 'Tournament not found.');
  return row;
}

// ---------------------------------------------------------------------------------------
// Transitions (M-03, M-06, M-08, M-09)
// ---------------------------------------------------------------------------------------

export type TournamentAction =
  | 'open_registration'
  | 'close_registration'
  | 'start'
  | 'complete'
  | 'cancel';

async function lockTournament(tx: Tx, tournamentId: string): Promise<TournamentRow> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${tournamentId}))`);
  const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!t) throw new TournamentAdminError('not_found', 'Tournament not found.');
  return t;
}

function invalidState(t: TournamentRow, action: string): TournamentAdminError {
  return new TournamentAdminError(
    'invalid_state',
    `Can't ${action.replace('_', ' ')} a tournament that is ${t.status.replace('_', ' ')}.`,
  );
}

/** Season key (`2026-spring`) for a date in Kuwait time. December counts toward next winter. */
export function rankingSeasonFor(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuwait',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? date.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? date.getUTCMonth() + 1);
  if (month >= 3 && month <= 5) return `${year}-spring`;
  if (month >= 6 && month <= 8) return `${year}-summer`;
  if (month >= 9 && month <= 11) return `${year}-autumn`;
  return `${month === 12 ? year + 1 : year}-winter`;
}

/** FED-1 placement points: 1st 100, 2nd 75, shared 3rd–4th 50. */
export const RANKING_POINTS_BY_PLACEMENT: Record<number, number> = { 1: 100, 2: 75, 3: 50 };

type PendingNotice = Parameters<typeof notify>[0] & { teamIds?: string[] };

export type TransitionResult = { tournament: TournamentRow };

export async function transitionTournament(
  slug: string,
  action: TournamentAction,
  byUserId: string,
): Promise<TransitionResult> {
  const { tournament: current, organization: org } = await requireManagedTournament(slug, byUserId);
  const db = getDb();
  const notices: { teamIds: string[]; notice: Omit<PendingNotice, 'recipientUserIds'> }[] = [];
  const tourHref = `/tournaments/${current.slug}`;

  const updated = await db.transaction(async (tx) => {
    const t = await lockTournament(tx, current.id);
    const now = new Date();

    switch (action) {
      case 'open_registration': {
        if (!['draft', 'published', 'registration_closed'].includes(t.status)) {
          throw invalidState(t, action);
        }
        const [row] = await tx
          .update(tournaments)
          .set({
            status: 'registration_open',
            registrationOpensAt: t.registrationOpensAt ?? now,
            // Re-opening after a manual close: the old close time no longer applies.
            registrationClosesAt:
              t.registrationClosesAt && t.registrationClosesAt < now
                ? null
                : t.registrationClosesAt,
            registrationLabel: null,
            updatedAt: now,
          })
          .where(eq(tournaments.id, t.id))
          .returning();
        return row;
      }
      case 'close_registration': {
        if (t.status !== 'registration_open') throw invalidState(t, action);
        const [row] = await tx
          .update(tournaments)
          .set({
            status: 'registration_closed',
            registrationClosesAt:
              t.registrationClosesAt && t.registrationClosesAt < now ? t.registrationClosesAt : now,
            registrationLabel: null,
            updatedAt: now,
          })
          .where(eq(tournaments.id, t.id))
          .returning();
        return row;
      }
      case 'start':
        return startInTx(tx, t, notices, tourHref);
      case 'complete':
        return completeInTx(tx, t, org, notices, tourHref);
      case 'cancel': {
        if (t.status === 'completed' || t.status === 'cancelled') throw invalidState(t, action);
        const active = await tx
          .select()
          .from(tournamentRegistrations)
          .where(
            and(
              eq(tournamentRegistrations.tournamentId, t.id),
              inArray(tournamentRegistrations.status, ACTIVE_ENTRY),
            ),
          );
        for (const reg of active) {
          await refundRegistrationRedemptionsInTx(tx, reg.id);
        }
        if (active.length > 0) {
          await tx
            .update(tournamentRegistrations)
            .set({ status: 'withdrawn', updatedAt: now })
            .where(
              inArray(
                tournamentRegistrations.id,
                active.map((r) => r.id),
              ),
            );
        }
        await tx
          .update(matches)
          .set({ status: 'cancelled', updatedAt: now })
          .where(and(eq(matches.tournamentId, t.id), ne(matches.status, 'completed')));
        const [row] = await tx
          .update(tournaments)
          .set({
            status: 'cancelled',
            startsInLabel: null,
            registrationLabel: null,
            updatedAt: now,
          })
          .where(eq(tournaments.id, t.id))
          .returning();
        notices.push({
          teamIds: active.map((r) => r.teamId),
          notice: {
            type: 'tournament_cancelled',
            title: `${t.name} has been cancelled`,
            data: { href: tourHref, tournament: t.name },
          },
        });
        return row;
      }
    }
  });
  if (!updated) throw new TournamentAdminError('not_found', 'Tournament not found.');

  for (const n of notices) {
    const ids = (await Promise.all(n.teamIds.map((id) => teamUserIds(id)))).flat();
    await notify({ ...n.notice, recipientUserIds: ids });
  }
  return { tournament: updated };
}

/** Load round ids keyed by 0-based round index. */
async function roundIdsFor(tx: Tx, bracketId: string): Promise<Map<number, string>> {
  const rows = await tx
    .select({ id: tournamentRounds.id, roundNumber: tournamentRounds.roundNumber })
    .from(tournamentRounds)
    .where(eq(tournamentRounds.bracketId, bracketId));
  return new Map(rows.map((r) => [r.roundNumber - 1, r.id]));
}

/**
 * Create a `matches` row for every pairing whose two teams are known and that has no match
 * yet. Mutates `data` (sets `matchId`) and returns the created pairings.
 */
async function createReadyMatches(
  tx: Tx,
  t: TournamentRow,
  data: BracketTree,
  roundIds: Map<number, string>,
): Promise<{ matchId: string; homeTeamId: string; awayTeamId: string; round: number }[]> {
  const created: { matchId: string; homeTeamId: string; awayTeamId: string; round: number }[] = [];
  for (let r = 0; r < data.rounds.length; r++) {
    const round = data.rounds[r] ?? [];
    for (let i = 0; i < round.length; i++) {
      const p = round[i];
      if (!p) continue;
      const home = p.slots[0].teamId;
      const away = p.slots[1].teamId;
      if (!home || !away || p.matchId || p.winnerTeamId) continue;
      const [m] = await tx
        .insert(matches)
        .values({
          matchType: 'tournament_match',
          tournamentId: t.id,
          tournamentRoundId: roundIds.get(r) ?? null,
          bracketSlot: i,
          homeTeamId: home,
          awayTeamId: away,
          gameId: t.gameId,
          format: t.matchFormat,
          status: 'scheduled',
        })
        .returning({ id: matches.id });
      if (!m) throw new TournamentAdminError('insert_failed', 'Match insert returned no row.');
      p.matchId = m.id;
      created.push({ matchId: m.id, homeTeamId: home, awayTeamId: away, round: r });
    }
  }
  return created;
}

/** Round status from the tree: completed / ready (a match to play) / pending. */
async function syncRoundStatuses(tx: Tx, data: BracketTree, roundIds: Map<number, string>) {
  for (let r = 0; r < data.rounds.length; r++) {
    const id = roundIds.get(r);
    const round = data.rounds[r] ?? [];
    if (!id) continue;
    const decided = round.filter((p) => p.winnerTeamId).length;
    const status =
      decided === round.length
        ? ('completed' as const)
        : decided > 0
          ? ('in_progress' as const)
          : round.some((p) => p.matchId)
            ? ('ready' as const)
            : ('pending' as const);
    await tx
      .update(tournamentRounds)
      .set({ status, updatedAt: new Date() })
      .where(eq(tournamentRounds.id, id));
  }
}

function teamNameMap(rows: { id: string; name: string }[]) {
  return new Map(rows.map((r) => [r.id, r.name]));
}

async function matchReadyNotices(
  tx: Tx,
  t: TournamentRow,
  created: { homeTeamId: string; awayTeamId: string; round: number }[],
  totalRounds: number,
  href: string,
) {
  if (created.length === 0) return [];
  const ids = [...new Set(created.flatMap((c) => [c.homeTeamId, c.awayTeamId]))];
  const names = teamNameMap(
    await tx.select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, ids)),
  );
  return created.map((c) => ({
    teamIds: [c.homeTeamId, c.awayTeamId],
    notice: {
      type: 'tournament_match_ready' as const,
      title: `${names.get(c.homeTeamId) ?? ''} vs ${names.get(c.awayTeamId) ?? ''} is ready to play`,
      data: {
        href,
        tournament: t.name,
        home: names.get(c.homeTeamId) ?? '',
        away: names.get(c.awayTeamId) ?? '',
        round: roundLabel(c.round, totalRounds),
      },
    },
  }));
}

async function startInTx(
  tx: Tx,
  t: TournamentRow,
  notices: { teamIds: string[]; notice: Omit<PendingNotice, 'recipientUserIds'> }[],
  href: string,
): Promise<TournamentRow | undefined> {
  if (t.status !== 'registration_open' && t.status !== 'registration_closed') {
    throw invalidState(t, 'start');
  }
  const [existing] = await tx
    .select({ id: brackets.id })
    .from(brackets)
    .where(eq(brackets.tournamentId, t.id))
    .limit(1);
  if (existing) throw new TournamentAdminError('invalid_state', 'The bracket already exists.');

  const regs = await tx
    .select()
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, t.id),
        inArray(tournamentRegistrations.status, ['confirmed', 'checked_in']),
      ),
    )
    .orderBy(asc(tournamentRegistrations.createdAt));
  const checkedIn = regs
    .filter((r) => r.status === 'checked_in')
    .sort(
      (a, b) =>
        (a.checkedInAt?.getTime() ?? a.createdAt.getTime()) -
        (b.checkedInAt?.getTime() ?? b.createdAt.getTime()),
    );
  const pool = checkedIn.length > 0 ? checkedIn : regs;
  if (pool.length < 2) {
    throw new TournamentAdminError(
      'not_enough_teams',
      'At least two confirmed or checked-in teams are needed to start.',
    );
  }

  const seeded = seedTeams(
    pool.map((r) => r.teamId),
    t.seedingStrategy === 'random' ? 'random' : 'order',
  );
  const data = buildSingleElimination(seeded.map((s) => s.teamId));
  const now = new Date();

  for (const s of seeded) {
    await tx
      .update(tournamentRegistrations)
      .set({ seedNumber: s.seed, updatedAt: now })
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, t.id),
          eq(tournamentRegistrations.teamId, s.teamId),
        ),
      );
  }

  const [bracket] = await tx
    .insert(brackets)
    .values({
      tournamentId: t.id,
      bracketType: 'single_elimination',
      totalRounds: data.rounds.length,
      seedData: seeded,
      bracketData: data as BracketData,
    })
    .returning({ id: brackets.id });
  if (!bracket) throw new TournamentAdminError('insert_failed', 'Bracket insert returned no row.');

  const roundRows = await tx
    .insert(tournamentRounds)
    .values(
      data.rounds.map((_, r) => ({
        bracketId: bracket.id,
        tournamentId: t.id,
        roundNumber: r + 1,
        roundLabel: roundLabel(r, data.rounds.length),
        status: 'pending' as const,
      })),
    )
    .returning({ id: tournamentRounds.id, roundNumber: tournamentRounds.roundNumber });
  const roundIds = new Map(roundRows.map((r) => [r.roundNumber - 1, r.id]));

  const created = await createReadyMatches(tx, t, data, roundIds);
  await tx
    .update(brackets)
    .set({ bracketData: data as BracketData, updatedAt: now })
    .where(eq(brackets.id, bracket.id));
  await syncRoundStatuses(tx, data, roundIds);

  const [row] = await tx
    .update(tournaments)
    .set({
      status: 'in_progress',
      startsAt: t.startsAt && t.startsAt < now ? t.startsAt : now,
      startsInLabel: null,
      registrationLabel: null,
      updatedAt: now,
    })
    .where(eq(tournaments.id, t.id))
    .returning();

  notices.push({
    teamIds: seeded.map((s) => s.teamId),
    notice: {
      type: 'tournament_started',
      title: `${t.name} has started`,
      data: { href, tournament: t.name },
    },
  });
  notices.push(...(await matchReadyNotices(tx, t, created, data.rounds.length, href)));
  return row;
}

async function completeInTx(
  tx: Tx,
  t: TournamentRow,
  org: OrganizationRow,
  notices: { teamIds: string[]; notice: Omit<PendingNotice, 'recipientUserIds'> }[],
  href: string,
): Promise<TournamentRow | undefined> {
  if (t.status !== 'in_progress') throw invalidState(t, 'complete');
  const [bracket] = await tx
    .select()
    .from(brackets)
    .where(eq(brackets.tournamentId, t.id))
    .limit(1);
  if (!bracket || !isFinalDecided(bracket.bracketData)) {
    throw new TournamentAdminError('final_not_played', 'Record the final result first.');
  }
  const st = bracketStandings(bracket.bracketData);
  const now = new Date();
  const placements: { teamId: string; placement: number }[] = [
    ...(st.first ? [{ teamId: st.first, placement: 1 }] : []),
    ...(st.second ? [{ teamId: st.second, placement: 2 }] : []),
    ...st.thirdFourth.map((teamId) => ({ teamId, placement: 3 })),
  ];
  for (const p of placements) {
    await tx
      .update(tournamentRegistrations)
      .set({ finalPlacement: p.placement, updatedAt: now })
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, t.id),
          eq(tournamentRegistrations.teamId, p.teamId),
        ),
      );
  }

  // FED-1: only federation organisations award ranking points, and only when the event says so.
  if (org.tier === 'federation' && t.awardsRankingPoints && placements.length > 0) {
    const season = rankingSeasonFor(now);
    await tx
      .insert(rankingPoints)
      .values(
        placements.map((p) => ({
          awardedByOrganizationId: org.id,
          recipientType: 'team' as const,
          recipientId: p.teamId,
          tournamentId: t.id,
          gameId: t.gameId,
          points: RANKING_POINTS_BY_PLACEMENT[p.placement] ?? 0,
          placement: p.placement,
          season,
        })),
      )
      .onConflictDoNothing();
  }

  const [row] = await tx
    .update(tournaments)
    .set({
      status: 'completed',
      endsAt: now,
      startsInLabel: null,
      registrationLabel: null,
      updatedAt: now,
    })
    .where(eq(tournaments.id, t.id))
    .returning();

  const seeded = (bracket.seedData ?? []).map((s) => s.teamId);
  const [winner] = st.first
    ? await tx.select({ name: teams.name }).from(teams).where(eq(teams.id, st.first)).limit(1)
    : [];
  notices.push({
    teamIds: seeded,
    notice: {
      type: 'tournament_completed',
      title: `${t.name} is complete`,
      data: { href, tournament: t.name, winner: winner?.name ?? '' },
    },
  });
  return row;
}

// ---------------------------------------------------------------------------------------
// Results (M-07)
// ---------------------------------------------------------------------------------------

export type RecordResultInput = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  notes?: string | null;
  byUserId: string;
};

export async function recordMatchResult(input: RecordResultInput): Promise<{
  tournamentSlug: string;
  winnerTeamId: string;
  finalDecided: boolean;
}> {
  if (!isUuid(input.matchId)) throw new TournamentAdminError('not_found', 'Match not found.');
  const db = getDb();
  const [m] = await db
    .select({ match: matches, slug: tournaments.slug })
    .from(matches)
    .innerJoin(tournaments, eq(tournaments.id, matches.tournamentId))
    .where(and(eq(matches.id, input.matchId), eq(matches.matchType, 'tournament_match')))
    .limit(1);
  if (!m) throw new TournamentAdminError('not_found', 'Match not found.');
  await requireManagedTournament(m.slug, input.byUserId);

  if (input.homeScore === input.awayScore) {
    throw new TournamentAdminError('same_score', 'Knockout matches need a winner — no draws.');
  }

  const notices: { teamIds: string[]; notice: Omit<PendingNotice, 'recipientUserIds'> }[] = [];
  const href = `/tournaments/${m.slug}`;

  const out = await db.transaction(async (tx) => {
    const t = await lockTournament(tx, m.match.tournamentId as string);
    if (t.status !== 'in_progress') throw invalidState(t, 'record a result for');
    const [match] = await tx.select().from(matches).where(eq(matches.id, input.matchId)).limit(1);
    if (!match || match.status === 'cancelled') {
      throw new TournamentAdminError('match_not_ready', 'This match is not open for results.');
    }
    const [bracket] = await tx
      .select()
      .from(brackets)
      .where(eq(brackets.tournamentId, t.id))
      .limit(1);
    if (!bracket) throw new TournamentAdminError('match_not_ready', 'The bracket is missing.');
    const data = bracket.bracketData as BracketTree;

    let round = -1;
    let index = -1;
    data.rounds.forEach((r, ri) =>
      r.forEach((p, pi) => {
        if (p.matchId === match.id) {
          round = ri;
          index = pi;
        }
      }),
    );
    if (round < 0)
      throw new TournamentAdminError('match_not_ready', 'Match is not in the bracket.');
    if (isPairingLocked(data, round, index)) {
      throw new TournamentAdminError(
        'result_locked',
        'The next match already has a result, so this one can no longer change.',
      );
    }

    const winnerTeamId = input.homeScore > input.awayScore ? match.homeTeamId : match.awayTeamId;
    let next: BracketTree;
    try {
      next = advanceWinner(data, round, index, winnerTeamId);
    } catch (err) {
      if (err instanceof BracketError && err.code === 'locked') {
        throw new TournamentAdminError('result_locked', err.message);
      }
      throw err;
    }
    const now = new Date();

    await tx
      .insert(matchResults)
      .values({
        matchId: match.id,
        winnerTeamId,
        isDraw: false,
        homeTeamScore: input.homeScore,
        awayTeamScore: input.awayScore,
        reportedByUserId: input.byUserId,
        reportedAt: now,
        confirmedAt: now,
        notes: input.notes?.trim() || null,
      })
      .onConflictDoUpdate({
        target: matchResults.matchId,
        set: {
          winnerTeamId,
          homeTeamScore: input.homeScore,
          awayTeamScore: input.awayScore,
          reportedByUserId: input.byUserId,
          reportedAt: now,
          confirmedAt: now,
          notes: input.notes?.trim() || null,
          updatedAt: now,
        },
      });
    await tx
      .update(matches)
      .set({ status: 'completed', actualEndedAt: now, updatedAt: now })
      .where(eq(matches.id, match.id));

    // A corrected result can change who sits in an already-created (unplayed) next match.
    const before = data.rounds[round + 1]?.[Math.floor(index / 2)];
    const nextPairing = next.rounds[round + 1]?.[Math.floor(index / 2)];
    const moved: { homeTeamId: string; awayTeamId: string; round: number }[] = [];
    if (nextPairing?.matchId) {
      const [home, away] = nextPairing.slots;
      const changed =
        before?.slots[0].teamId !== home.teamId || before?.slots[1].teamId !== away.teamId;
      if (home.teamId && away.teamId && changed) {
        await tx
          .update(matches)
          .set({ homeTeamId: home.teamId, awayTeamId: away.teamId, updatedAt: now })
          .where(eq(matches.id, nextPairing.matchId));
        moved.push({ homeTeamId: home.teamId, awayTeamId: away.teamId, round: round + 1 });
      }
    }

    const roundIds = await roundIdsFor(tx, bracket.id);
    const created = await createReadyMatches(tx, t, next, roundIds);
    await tx
      .update(brackets)
      .set({ bracketData: next as BracketData, updatedAt: now })
      .where(eq(brackets.id, bracket.id));
    await syncRoundStatuses(tx, next, roundIds);
    notices.push(
      ...(await matchReadyNotices(tx, t, [...created, ...moved], next.rounds.length, href)),
    );
    return { winnerTeamId, finalDecided: isFinalDecided(next) };
  });

  for (const n of notices) {
    const ids = (await Promise.all(n.teamIds.map((id) => teamUserIds(id)))).flat();
    await notify({ ...n.notice, recipientUserIds: ids });
  }
  return { tournamentSlug: m.slug, ...out };
}

// ---------------------------------------------------------------------------------------
// Entries (M-04, M-05)
// ---------------------------------------------------------------------------------------

export type ManageEntry = {
  id: string;
  status: TournamentRegistrationRow['status'];
  seedNumber: number | null;
  checkedInAt: Date | null;
  createdAt: Date;
  disqualificationReason: string | null;
  finalPlacement: number | null;
  team: { id: string; slug: string; name: string; tag: string };
  registeredBy: string;
  /** Entry fee paid so far (voucher redemptions), KWD. */
  paidKwd: number;
};

async function entriesFor(tournamentId: string): Promise<ManageEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      reg: tournamentRegistrations,
      team: { id: teams.id, slug: teams.slug, name: teams.name, tag: teams.tag },
      registeredBy: users.displayName,
    })
    .from(tournamentRegistrations)
    .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .leftJoin(users, eq(users.id, tournamentRegistrations.registeredByUserId))
    .where(eq(tournamentRegistrations.tournamentId, tournamentId))
    .orderBy(asc(tournamentRegistrations.createdAt));
  const ids = rows.map((r) => r.reg.id);
  const paid = ids.length
    ? await db
        .select({
          registrationId: voucherRedemptions.registrationId,
          total: sql<number>`coalesce(sum(${voucherRedemptions.amountKwd}), 0)`.mapWith(Number),
        })
        .from(voucherRedemptions)
        .where(inArray(voucherRedemptions.registrationId, ids))
        .groupBy(voucherRedemptions.registrationId)
    : [];
  const paidById = new Map(paid.map((p) => [p.registrationId, p.total]));
  return rows.map((r) => ({
    id: r.reg.id,
    status: r.reg.status,
    seedNumber: r.reg.seedNumber,
    checkedInAt: r.reg.checkedInAt,
    createdAt: r.reg.createdAt,
    disqualificationReason: r.reg.disqualificationReason,
    finalPlacement: r.reg.finalPlacement,
    team: r.team,
    registeredBy: r.registeredBy ?? '—',
    paidKwd: paidById.get(r.reg.id) ?? 0,
  }));
}

export async function listTournamentEntries(
  slug: string,
  byUserId: string,
): Promise<ManageEntry[]> {
  const { tournament } = await requireManagedTournament(slug, byUserId);
  return entriesFor(tournament.id);
}

export type EntryAction = 'disqualify' | 'reinstate' | 'check_in' | 'undo_check_in';

/** Entries can be managed until the bracket is generated. */
const ENTRY_EDITABLE: TournamentRow['status'][] = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
];

export async function updateEntry(input: {
  registrationId: string;
  action: EntryAction;
  reason?: string | null;
  byUserId: string;
}): Promise<TournamentRegistrationRow> {
  if (!isUuid(input.registrationId)) {
    throw new TournamentAdminError('not_found', 'Entry not found.');
  }
  const db = getDb();
  const [row] = await db
    .select({ reg: tournamentRegistrations, slug: tournaments.slug, teamName: teams.name })
    .from(tournamentRegistrations)
    .innerJoin(tournaments, eq(tournaments.id, tournamentRegistrations.tournamentId))
    .innerJoin(teams, eq(teams.id, tournamentRegistrations.teamId))
    .where(eq(tournamentRegistrations.id, input.registrationId))
    .limit(1);
  if (!row) throw new TournamentAdminError('not_found', 'Entry not found.');
  const { tournament: tour } = await requireManagedTournament(row.slug, input.byUserId);

  const reason = input.reason?.trim() ?? '';
  if (input.action === 'disqualify' && reason.length === 0) {
    throw new TournamentAdminError('reason_required', 'Give a reason for the disqualification.');
  }

  const updated = await db.transaction(async (tx) => {
    const t = await lockTournament(tx, tour.id);
    if (!ENTRY_EDITABLE.includes(t.status)) {
      throw new TournamentAdminError(
        'invalid_state',
        'Entries can only be changed before the bracket is generated.',
      );
    }
    const [reg] = await tx
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, input.registrationId))
      .limit(1);
    if (!reg) throw new TournamentAdminError('not_found', 'Entry not found.');
    const now = new Date();

    const set = async (values: Partial<TournamentRegistrationRow>) => {
      const [r] = await tx
        .update(tournamentRegistrations)
        .set({ ...values, updatedAt: now })
        .where(eq(tournamentRegistrations.id, reg.id))
        .returning();
      return r;
    };

    switch (input.action) {
      case 'disqualify':
        if (!ACTIVE_ENTRY.includes(reg.status)) {
          throw new TournamentAdminError('invalid_state', `Entry is ${reg.status}.`);
        }
        return set({ status: 'disqualified', disqualificationReason: reason.slice(0, 500) });
      case 'reinstate': {
        if (reg.status !== 'disqualified') {
          throw new TournamentAdminError('invalid_state', `Entry is ${reg.status}.`);
        }
        const [active] = await tx
          .select({ n: count() })
          .from(tournamentRegistrations)
          .where(
            and(
              eq(tournamentRegistrations.tournamentId, t.id),
              inArray(tournamentRegistrations.status, ACTIVE_ENTRY),
            ),
          );
        if ((active?.n ?? 0) >= t.maxTeams) {
          throw new TournamentAdminError('tournament_full', 'The tournament is full.');
        }
        const [paid] = await tx
          .select({ n: count() })
          .from(voucherRedemptions)
          .where(eq(voucherRedemptions.registrationId, reg.id));
        const status = t.entryFeeKwd > 0 && (paid?.n ?? 0) === 0 ? 'pending_payment' : 'confirmed';
        return set({ status, disqualificationReason: null, checkedInAt: null });
      }
      case 'check_in':
        if (reg.status !== 'confirmed') {
          throw new TournamentAdminError(
            'not_confirmed',
            'Only confirmed (paid) entries can be checked in.',
          );
        }
        return set({ status: 'checked_in', checkedInAt: now });
      case 'undo_check_in':
        if (reg.status !== 'checked_in') {
          throw new TournamentAdminError('invalid_state', `Entry is ${reg.status}.`);
        }
        return set({ status: 'confirmed', checkedInAt: null });
    }
  });
  if (!updated) throw new TournamentAdminError('not_found', 'Entry not found.');

  if (input.action === 'disqualify' || input.action === 'reinstate') {
    await notify({
      recipientUserIds: await teamUserIds(updated.teamId, true),
      type: input.action === 'disqualify' ? 'registration_disqualified' : 'registration_reinstated',
      title:
        input.action === 'disqualify'
          ? `${row.teamName} was disqualified from ${tour.name}`
          : `${row.teamName} was reinstated in ${tour.name}`,
      data: {
        href: `/registrations/${updated.id}`,
        tournament: tour.name,
        team: row.teamName,
        ...(input.action === 'disqualify' ? { reason } : {}),
      },
    });
  }
  return updated;
}

// ---------------------------------------------------------------------------------------
// Reads for the organiser console + hub
// ---------------------------------------------------------------------------------------

export type ManagedTournamentConsole = {
  tournament: TournamentRow;
  organization: Pick<OrganizationRow, 'id' | 'slug' | 'name' | 'tier'>;
  game: { id: string; slug: string; name: string };
  entries: ManageEntry[];
  bracket: BracketView | null;
  /** Final decided and still in progress: the "Complete" action is available. */
  readyToComplete: boolean;
};

export async function loadTournamentConsole(
  slug: string,
  byUserId: string,
): Promise<ManagedTournamentConsole> {
  const { tournament, organization } = await requireManagedTournament(slug, byUserId);
  const db = getDb();
  const [[game], entries, bracket] = await Promise.all([
    db
      .select({ id: games.id, slug: games.slug, name: games.name })
      .from(games)
      .where(eq(games.id, tournament.gameId))
      .limit(1),
    entriesFor(tournament.id),
    loadBracketView(tournament.id),
  ]);
  return {
    tournament,
    organization: {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      tier: organization.tier,
    },
    game: game ?? { id: tournament.gameId, slug: '', name: '' },
    entries,
    bracket,
    readyToComplete: tournament.status === 'in_progress' && !!bracket?.finalDecided,
  };
}

export type ManagedTournamentItem = {
  id: string;
  slug: string;
  name: string;
  status: TournamentRow['status'];
  startsAt: Date | null;
  organization: { slug: string; name: string };
  gameSlug: string;
  gameName: string;
  activeEntries: number;
  maxTeams: number;
};

/** Every tournament the user can manage (for the /manage hub), newest first. */
export async function listManagedTournaments(userId: string): Promise<ManagedTournamentItem[]> {
  const orgs = await listTournamentOrganizations(userId);
  if (orgs.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: tournaments.id,
      slug: tournaments.slug,
      name: tournaments.name,
      status: tournaments.status,
      startsAt: tournaments.startsAt,
      maxTeams: tournaments.maxTeams,
      orgSlug: organizations.slug,
      orgName: organizations.name,
      gameSlug: games.slug,
      gameName: games.name,
    })
    .from(tournaments)
    .innerJoin(organizations, eq(organizations.id, tournaments.organizationId))
    .innerJoin(games, eq(games.id, tournaments.gameId))
    .where(
      and(
        inArray(
          tournaments.organizationId,
          orgs.map((o) => o.id),
        ),
        isNull(tournaments.deletedAt),
      ),
    )
    .orderBy(desc(tournaments.createdAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({ tournamentId: tournamentRegistrations.tournamentId, n: count() })
    .from(tournamentRegistrations)
    .where(
      and(
        inArray(
          tournamentRegistrations.tournamentId,
          rows.map((r) => r.id),
        ),
        inArray(tournamentRegistrations.status, ACTIVE_ENTRY),
      ),
    )
    .groupBy(tournamentRegistrations.tournamentId);
  const countById = new Map(counts.map((c) => [c.tournamentId, c.n]));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    startsAt: r.startsAt,
    organization: { slug: r.orgSlug, name: r.orgName },
    gameSlug: r.gameSlug,
    gameName: r.gameName,
    activeEntries: countById.get(r.id) ?? 0,
    maxTeams: r.maxTeams,
  }));
}

/** Active games for the tournament form's game picker. */
export async function listTournamentGames(): Promise<{ slug: string; name: string }[]> {
  return getDb()
    .select({ slug: games.slug, name: games.name })
    .from(games)
    .where(eq(games.isActive, true))
    .orderBy(games.name);
}
