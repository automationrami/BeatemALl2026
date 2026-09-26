/**
 * Voucher queries — issue, preview, redeem, revoke, list.
 *
 * Rules live in `@beat-em-all/utils` (`evaluateVoucher`) so the UI preview and the
 * authoritative server check can't drift. Every redemption runs inside a transaction
 * with the voucher row locked `FOR UPDATE`, so two bookings can't spend the same
 * balance twice.
 */

import { and, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import {
  evaluateVoucher,
  generateVoucherCode,
  normalizeVoucherCode,
  roundKwd,
  type VoucherPurpose,
  type VoucherRejection,
} from '@beat-em-all/utils';
import { getDb } from '../client';
import { vouchers, voucherRedemptions, type VoucherRow } from '../schema/vouchers';
import { organizations } from '../schema/organizations';
import { teams } from '../schema/teams';
import { venues } from '../schema/venues';
import { venueBookings } from '../schema/venue_bookings';
import { tournamentRegistrations } from '../schema/tournament_registrations';
import { tournaments } from '../schema/tournaments';
import { users } from '../schema/users';
import { teamMembers } from '../schema/team_members';
import {
  activeMembership,
  isTeamLeaderRole,
  listManagedOrganizations,
  loadTeamRole,
} from './roles';

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export class VoucherError extends Error {
  constructor(
    public code:
      | VoucherRejection
      | 'invalid_code'
      | 'not_found'
      | 'forbidden'
      | 'captain_only'
      | 'already_paid'
      | 'invalid_state'
      | 'code_taken'
      | 'invalid_value'
      | 'team_not_found'
      | 'venue_not_found'
      | 'organization_not_found'
      | 'insert_failed',
    message: string,
  ) {
    super(message);
    this.name = 'VoucherError';
  }
}

const REJECTION_MESSAGES: Record<VoucherRejection, string> = {
  revoked: 'This voucher has been revoked by its issuer.',
  expired: 'This voucher has expired.',
  exhausted: 'This voucher has no uses left.',
  wrong_team: 'This voucher belongs to another team.',
  wrong_venue: 'This voucher is only valid at another venue.',
  venue_only: 'This voucher is only valid for venue bookings.',
  insufficient_balance: "This voucher's balance doesn't cover the amount.",
  nothing_to_pay: 'There is nothing to pay.',
};

export type VoucherSummary = {
  code: string;
  kind: VoucherRow['kind'];
  status: VoucherRow['status'];
  valueKwd: number | null;
  balanceKwd: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: Date | null;
  note: string | null;
  createdAt: Date;
  issuer: { slug: string; name: string };
  team: { slug: string; name: string; tag: string } | null;
  venue: { slug: string; name: string } | null;
};

function requireCode(raw: string): string {
  const code = normalizeVoucherCode(raw);
  if (!code)
    throw new VoucherError('invalid_code', 'Voucher codes are 4–32 letters, digits or hyphens.');
  return code;
}

async function summarise(rows: VoucherRow[]): Promise<VoucherSummary[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const orgIds = [...new Set(rows.map((r) => r.issuerOrganizationId))];
  const teamIds = [...new Set(rows.map((r) => r.teamId).filter((x): x is string => !!x))];
  const venueIds = [...new Set(rows.map((r) => r.venueId).filter((x): x is string => !!x))];
  const [os, ts, vs] = await Promise.all([
    db
      .select({ id: organizations.id, slug: organizations.slug, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, orgIds)),
    teamIds.length
      ? db
          .select({ id: teams.id, slug: teams.slug, name: teams.name, tag: teams.tag })
          .from(teams)
          .where(inArray(teams.id, teamIds))
      : Promise.resolve([]),
    venueIds.length
      ? db
          .select({ id: venues.id, slug: venues.slug, name: venues.name })
          .from(venues)
          .where(inArray(venues.id, venueIds))
      : Promise.resolve([]),
  ]);
  const org = new Map(os.map((o) => [o.id, o]));
  const team = new Map(ts.map((t) => [t.id, t]));
  const venue = new Map(vs.map((v) => [v.id, v]));
  return rows.map((r) => {
    const o = org.get(r.issuerOrganizationId);
    const t = r.teamId ? team.get(r.teamId) : undefined;
    const v = r.venueId ? venue.get(r.venueId) : undefined;
    return {
      code: r.code,
      kind: r.kind,
      status: r.status,
      valueKwd: r.valueKwd,
      balanceKwd: r.balanceKwd,
      maxRedemptions: r.maxRedemptions,
      redemptionCount: r.redemptionCount,
      expiresAt: r.expiresAt,
      note: r.note,
      createdAt: r.createdAt,
      issuer: { slug: o?.slug ?? '', name: o?.name ?? '—' },
      team: t ? { slug: t.slug, name: t.name, tag: t.tag } : null,
      venue: v ? { slug: v.slug, name: v.name } : null,
    };
  });
}

// ─── Issue / revoke ──────────────────────────────────────────────────────────

export async function issueVoucher(input: {
  byUserId: string;
  organizationSlug: string;
  kind: VoucherRow['kind'];
  valueKwd?: number | null;
  teamSlug?: string | null;
  venueSlug?: string | null;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  code?: string | null;
  note?: string | null;
}): Promise<VoucherSummary> {
  const managed = await listManagedOrganizations(input.byUserId);
  const org = managed.find((o) => o.slug === input.organizationSlug);
  if (!org) {
    throw new VoucherError(
      'forbidden',
      'Only owners and admins of an organisation can issue its vouchers.',
    );
  }

  let valueKwd: number | null = null;
  if (input.kind === 'stored_value') {
    valueKwd = roundKwd(input.valueKwd ?? 0);
    if (!(valueKwd > 0) || valueKwd > 10_000) {
      throw new VoucherError(
        'invalid_value',
        'A stored-value voucher needs an amount between 0.001 and 10,000 KWD.',
      );
    }
  }
  if (input.maxRedemptions != null && (input.maxRedemptions < 1 || input.maxRedemptions > 10_000)) {
    throw new VoucherError('invalid_value', 'Maximum uses must be between 1 and 10,000.');
  }
  if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
    throw new VoucherError('invalid_value', 'The expiry date must be in the future.');
  }

  const db = getDb();
  let teamId: string | null = null;
  if (input.teamSlug) {
    const [t] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, input.teamSlug))
      .limit(1);
    if (!t) throw new VoucherError('team_not_found', 'Team not found.');
    teamId = t.id;
  }
  let venueId: string | null = null;
  if (input.venueSlug) {
    const [v] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, input.venueSlug))
      .limit(1);
    if (!v) throw new VoucherError('venue_not_found', 'Venue not found.');
    venueId = v.id;
  }

  const code = input.code ? requireCode(input.code) : generateVoucherCode(org.slug);

  try {
    const [row] = await db
      .insert(vouchers)
      .values({
        code,
        issuerOrganizationId: org.id,
        issuedByUserId: input.byUserId,
        kind: input.kind,
        valueKwd,
        balanceKwd: valueKwd,
        teamId,
        venueId,
        maxRedemptions: input.maxRedemptions ?? null,
        expiresAt: input.expiresAt ?? null,
        note: input.note?.trim() || null,
      })
      .returning();
    if (!row) throw new VoucherError('insert_failed', 'Voucher insert returned no row.');
    const [summary] = await summarise([row]);
    if (!summary)
      throw new VoucherError('insert_failed', 'Voucher created but could not be loaded.');
    return summary;
  } catch (err) {
    if (typeof err === 'object' && err && (err as { code?: string }).code === '23505') {
      throw new VoucherError('code_taken', `The code ${code} is already in use.`);
    }
    throw err;
  }
}

export async function revokeVoucher(input: {
  code: string;
  byUserId: string;
}): Promise<VoucherSummary> {
  const code = requireCode(input.code);
  const db = getDb();
  const [v] = await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  if (!v) throw new VoucherError('not_found', 'Voucher not found.');
  const managed = await listManagedOrganizations(input.byUserId);
  if (!managed.some((o) => o.id === v.issuerOrganizationId)) {
    throw new VoucherError('forbidden', 'Only the issuing organisation can revoke this voucher.');
  }
  const [row] = await db
    .update(vouchers)
    .set({ status: 'revoked', updatedAt: new Date() })
    .where(eq(vouchers.id, v.id))
    .returning();
  const [summary] = await summarise(row ? [row] : [v]);
  if (!summary) throw new VoucherError('not_found', 'Voucher not found.');
  return summary;
}

// ─── Preview / redeem ────────────────────────────────────────────────────────

export type VoucherPreview =
  | {
      ok: true;
      code: string;
      kind: VoucherRow['kind'];
      amountKwd: number;
      balanceAfterKwd: number | null;
      issuer: string;
    }
  | {
      ok: false;
      code: string;
      reason: VoucherRejection | 'not_found' | 'invalid_code';
      message: string;
    };

/** Would this code pay `amountKwd` for `teamId`? Read-only. */
export async function previewVoucher(input: {
  code: string;
  teamId: string;
  purpose: VoucherPurpose;
  amountKwd: number;
  venueId: string | null;
}): Promise<VoucherPreview> {
  const code = normalizeVoucherCode(input.code);
  if (!code)
    return {
      ok: false,
      code: input.code,
      reason: 'invalid_code',
      message: 'That is not a valid voucher code.',
    };
  const db = getDb();
  const [v] = await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  if (!v) return { ok: false, code, reason: 'not_found', message: 'No voucher with that code.' };
  const result = evaluateVoucher(v, { now: new Date(), ...input });
  if (!result.ok)
    return { ok: false, code, reason: result.reason, message: REJECTION_MESSAGES[result.reason] };
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, v.issuerOrganizationId))
    .limit(1);
  return {
    ok: true,
    code,
    kind: v.kind,
    amountKwd: result.amountKwd,
    balanceAfterKwd: result.balanceAfterKwd,
    issuer: org?.name ?? '—',
  };
}

/**
 * Spend a voucher inside the caller's transaction. Locks the voucher row, re-checks every
 * rule, draws down balance / bumps the use count and records the redemption.
 */
export async function redeemVoucherInTx(
  tx: Tx,
  input: {
    code: string;
    teamId: string;
    userId: string;
    purpose: VoucherPurpose;
    amountKwd: number;
    venueId: string | null;
    bookingId?: string | null;
    registrationId?: string | null;
  },
): Promise<{ voucherId: string; amountKwd: number; balanceAfterKwd: number | null }> {
  const code = requireCode(input.code);
  const [v] = await tx
    .select()
    .from(vouchers)
    .where(eq(vouchers.code, code))
    .for('update')
    .limit(1);
  if (!v) throw new VoucherError('not_found', 'No voucher with that code.');
  const result = evaluateVoucher(v, {
    now: new Date(),
    amountKwd: input.amountKwd,
    teamId: input.teamId,
    purpose: input.purpose,
    venueId: input.venueId,
  });
  if (!result.ok) throw new VoucherError(result.reason, REJECTION_MESSAGES[result.reason]);

  await tx
    .update(vouchers)
    .set({
      balanceKwd: result.balanceAfterKwd,
      redemptionCount: sql`${vouchers.redemptionCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(vouchers.id, v.id));
  await tx.insert(voucherRedemptions).values({
    voucherId: v.id,
    teamId: input.teamId,
    redeemedByUserId: input.userId,
    purpose: input.purpose,
    bookingId: input.bookingId ?? null,
    registrationId: input.registrationId ?? null,
    amountKwd: result.amountKwd,
  });
  return { voucherId: v.id, amountKwd: result.amountKwd, balanceAfterKwd: result.balanceAfterKwd };
}

/** Give a registration's voucher payments back (withdrawal before the event). */
export async function refundRegistrationRedemptionsInTx(
  tx: Tx,
  registrationId: string,
): Promise<number> {
  const rows = await tx
    .select()
    .from(voucherRedemptions)
    .where(eq(voucherRedemptions.registrationId, registrationId));
  for (const r of rows) {
    const [v] = await tx
      .select()
      .from(vouchers)
      .where(eq(vouchers.id, r.voucherId))
      .for('update')
      .limit(1);
    if (v) {
      await tx
        .update(vouchers)
        .set({
          balanceKwd:
            v.kind === 'stored_value' ? roundKwd((v.balanceKwd ?? 0) + r.amountKwd) : null,
          redemptionCount: Math.max(0, v.redemptionCount - 1),
          updatedAt: new Date(),
        })
        .where(eq(vouchers.id, v.id));
    }
    await tx.delete(voucherRedemptions).where(eq(voucherRedemptions.id, r.id));
  }
  return rows.length;
}

async function requireLeader(playerId: string, teamId: string, what: string) {
  const role = await loadTeamRole(playerId, teamId);
  if (!role) throw new VoucherError('forbidden', `Only members of the team can pay for ${what}.`);
  if (!isTeamLeaderRole(role)) {
    throw new VoucherError('captain_only', `Only the captain or co-captain can pay for ${what}.`);
  }
}

/** Pay a pending booking with a voucher; the booking becomes `confirmed`. */
export async function payBookingWithVoucher(input: {
  bookingId: string;
  code: string;
  byUserId: string;
  byPlayerId: string;
}) {
  const db = getDb();
  const [b] = await db
    .select()
    .from(venueBookings)
    .where(eq(venueBookings.id, input.bookingId))
    .limit(1);
  if (!b) throw new VoucherError('not_found', 'Booking not found.');
  await requireLeader(input.byPlayerId, b.bookedByTeamId, 'this booking');

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(venueBookings)
      .where(eq(venueBookings.id, b.id))
      .for('update')
      .limit(1);
    if (!locked) throw new VoucherError('not_found', 'Booking not found.');
    if (locked.status !== 'pending_payment') {
      throw new VoucherError(
        locked.status === 'confirmed' ? 'already_paid' : 'invalid_state',
        locked.status === 'confirmed'
          ? 'This booking is already paid.'
          : `Can't pay a ${locked.status} booking.`,
      );
    }
    const paid = await redeemVoucherInTx(tx, {
      code: input.code,
      teamId: locked.bookedByTeamId,
      userId: input.byUserId,
      purpose: 'booking',
      amountKwd: locked.totalAmountKwd,
      venueId: locked.venueId,
      bookingId: locked.id,
    });
    const [updated] = await tx
      .update(venueBookings)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(venueBookings.id, locked.id))
      .returning();
    return { booking: updated ?? locked, payment: paid };
  });
}

/** Pay a pending tournament entry fee with a voucher; the entry becomes `confirmed`. */
export async function payRegistrationWithVoucher(input: {
  registrationId: string;
  code: string;
  byUserId: string;
  byPlayerId: string;
}) {
  const db = getDb();
  const [r] = await db
    .select()
    .from(tournamentRegistrations)
    .where(eq(tournamentRegistrations.id, input.registrationId))
    .limit(1);
  if (!r) throw new VoucherError('not_found', 'Registration not found.');
  await requireLeader(input.byPlayerId, r.teamId, 'this entry');
  const [t] = await db
    .select({ entryFeeKwd: tournaments.entryFeeKwd })
    .from(tournaments)
    .where(eq(tournaments.id, r.tournamentId))
    .limit(1);

  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(tournamentRegistrations)
      .where(eq(tournamentRegistrations.id, r.id))
      .for('update')
      .limit(1);
    if (!locked) throw new VoucherError('not_found', 'Registration not found.');
    if (locked.status !== 'pending_payment') {
      throw new VoucherError(
        locked.status === 'confirmed' ? 'already_paid' : 'invalid_state',
        locked.status === 'confirmed'
          ? 'This entry is already paid.'
          : `Can't pay a ${locked.status} entry.`,
      );
    }
    const paid = await redeemVoucherInTx(tx, {
      code: input.code,
      teamId: locked.teamId,
      userId: input.byUserId,
      purpose: 'tournament_entry',
      amountKwd: t?.entryFeeKwd ?? 0,
      venueId: null,
      registrationId: locked.id,
    });
    const [updated] = await tx
      .update(tournamentRegistrations)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(eq(tournamentRegistrations.id, locked.id))
      .returning();
    return { registration: updated ?? locked, payment: paid };
  });
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export type VoucherPayment = {
  code: string;
  kind: VoucherRow['kind'];
  amountKwd: number;
  issuer: string;
  paidAt: Date;
  paidBy: string;
};

async function loadPayment(where: SQL): Promise<VoucherPayment | null> {
  const db = getDb();
  const [row] = await db
    .select({
      code: vouchers.code,
      kind: vouchers.kind,
      amountKwd: voucherRedemptions.amountKwd,
      issuer: organizations.name,
      paidAt: voucherRedemptions.createdAt,
      paidBy: users.displayName,
    })
    .from(voucherRedemptions)
    .innerJoin(vouchers, eq(vouchers.id, voucherRedemptions.voucherId))
    .innerJoin(organizations, eq(organizations.id, vouchers.issuerOrganizationId))
    .innerJoin(users, eq(users.id, voucherRedemptions.redeemedByUserId))
    .where(where)
    .orderBy(desc(voucherRedemptions.createdAt))
    .limit(1);
  return row ?? null;
}

export function loadBookingVoucherPayment(bookingId: string) {
  return loadPayment(eq(voucherRedemptions.bookingId, bookingId));
}

export function loadRegistrationVoucherPayment(registrationId: string) {
  return loadPayment(eq(voucherRedemptions.registrationId, registrationId));
}

export type VoucherRedemptionItem = {
  id: string;
  code: string;
  purpose: VoucherPurpose;
  amountKwd: number;
  createdAt: Date;
  teamName: string;
  redeemedBy: string;
  bookingId: string | null;
  registrationId: string | null;
};

async function listRedemptions(where: SQL, limit = 30): Promise<VoucherRedemptionItem[]> {
  const db = getDb();
  return db
    .select({
      id: voucherRedemptions.id,
      code: vouchers.code,
      purpose: voucherRedemptions.purpose,
      amountKwd: voucherRedemptions.amountKwd,
      createdAt: voucherRedemptions.createdAt,
      teamName: teams.name,
      redeemedBy: users.displayName,
      bookingId: voucherRedemptions.bookingId,
      registrationId: voucherRedemptions.registrationId,
    })
    .from(voucherRedemptions)
    .innerJoin(vouchers, eq(vouchers.id, voucherRedemptions.voucherId))
    .innerJoin(teams, eq(teams.id, voucherRedemptions.teamId))
    .innerJoin(users, eq(users.id, voucherRedemptions.redeemedByUserId))
    .where(where)
    .orderBy(desc(voucherRedemptions.createdAt))
    .limit(limit);
}

export type VoucherWallet = {
  /** Vouchers assigned to the viewer's teams, plus open vouchers those teams have used. */
  wallet: VoucherSummary[];
  redemptions: VoucherRedemptionItem[];
  /** Organisations the viewer can issue for, with what they issued. */
  issuing: {
    organizations: { slug: string; name: string; tier: string }[];
    vouchers: VoucherSummary[];
    redemptions: VoucherRedemptionItem[];
  };
};

export async function loadVoucherWallet(viewer: {
  userId: string;
  playerId: string;
}): Promise<VoucherWallet> {
  const db = getDb();
  const myTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(and(eq(teamMembers.playerId, viewer.playerId), activeMembership()));
  const teamIds = myTeams.map((t) => t.teamId);

  let wallet: VoucherSummary[] = [];
  let redemptions: VoucherRedemptionItem[] = [];
  if (teamIds.length > 0) {
    const used = await db
      .selectDistinct({ id: voucherRedemptions.voucherId })
      .from(voucherRedemptions)
      .where(inArray(voucherRedemptions.teamId, teamIds));
    const usedIds = used.map((u) => u.id);
    const rows = await db
      .select()
      .from(vouchers)
      .where(
        usedIds.length > 0
          ? or(inArray(vouchers.teamId, teamIds), inArray(vouchers.id, usedIds))
          : inArray(vouchers.teamId, teamIds),
      )
      .orderBy(desc(vouchers.createdAt));
    wallet = await summarise(rows);
    redemptions = await listRedemptions(inArray(voucherRedemptions.teamId, teamIds));
  }

  const managed = await listManagedOrganizations(viewer.userId);
  let issued: VoucherSummary[] = [];
  let issuedRedemptions: VoucherRedemptionItem[] = [];
  if (managed.length > 0) {
    const orgIds = managed.map((o) => o.id);
    const rows = await db
      .select()
      .from(vouchers)
      .where(inArray(vouchers.issuerOrganizationId, orgIds))
      .orderBy(desc(vouchers.createdAt))
      .limit(100);
    issued = await summarise(rows);
    if (rows.length > 0) {
      issuedRedemptions = await listRedemptions(
        inArray(
          voucherRedemptions.voucherId,
          rows.map((r) => r.id),
        ),
      );
    }
  }

  return {
    wallet,
    redemptions,
    issuing: {
      organizations: managed.map(({ slug, name, tier }) => ({ slug, name, tier })),
      vouchers: issued,
      redemptions: issuedRedemptions,
    },
  };
}

/** Voucher lookup for the issuer (full detail) — null unless the user manages the issuer. */
export async function loadIssuedVoucher(
  code: string,
  userId: string,
): Promise<VoucherSummary | null> {
  const normal = normalizeVoucherCode(code);
  if (!normal) return null;
  const db = getDb();
  const [v] = await db.select().from(vouchers).where(eq(vouchers.code, normal)).limit(1);
  if (!v) return null;
  const managed = await listManagedOrganizations(userId);
  if (!managed.some((o) => o.id === v.issuerOrganizationId)) return null;
  const [s] = await summarise([v]);
  return s ?? null;
}

/** Teams and venues an issuer can scope a voucher to (issue form pickers). */
export async function listVoucherScopeOptions(): Promise<{
  teams: { slug: string; name: string }[];
  venues: { slug: string; name: string }[];
}> {
  const db = getDb();
  const [ts, vs] = await Promise.all([
    db.select({ slug: teams.slug, name: teams.name }).from(teams).orderBy(teams.name),
    db.select({ slug: venues.slug, name: venues.name }).from(venues).orderBy(venues.name),
  ]);
  return { teams: ts, venues: vs };
}
