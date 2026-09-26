/**
 * Venue-owner queries: apply for a venue (V-01/V-02), manage it (V-03/V-04), act on its
 * bookings (V-05/V-06), and the team's own cancellation (T-08).
 *
 * Permission model (DOMAIN_MODEL §3.2, §6): a venue belongs to a venue-tier organisation;
 * that organisation's owners and admins manage it. A new application creates the
 * organisation (pending), the applicant's owner membership and the venue (pending) in
 * one transaction; Beat'Em All staff approve it from `/admin` (see `admin.ts`).
 */

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { roundKwd } from '@beat-em-all/utils';
import { getDb } from '../client';
import { organizations, type OrganizationRow } from '../schema/organizations';
import { memberships } from '../schema/memberships';
import { venues, type VenueRow } from '../schema/venues';
import { venueGames } from '../schema/venue_games';
import { games } from '../schema/games';
import { venueBookings, type VenueBookingRow } from '../schema/venue_bookings';
import { vouchers, voucherRedemptions } from '../schema/vouchers';
import { hydrateBookings, loadBookingById, type BookingWithRelations } from './booking';
import { isUuid } from './ids';
import { notify, organizationManagerUserIds, teamUserIds } from './notifications';
import {
  PLATFORM_ORGANIZATION_SLUG,
  isTeamLeaderRole,
  listManagedVenueIds,
  loadTeamRole,
} from './roles';
import type { Tx } from './voucher';

export class VenueOwnerError extends Error {
  constructor(
    public code:
      | 'not_found'
      | 'forbidden'
      | 'name_taken'
      | 'unknown_game'
      | 'invalid_hours'
      | 'invalid_state'
      | 'reason_required'
      | 'captain_only'
      | 'cancel_window_passed'
      | 'insert_failed',
    message: string,
  ) {
    super(message);
    this.name = 'VenueOwnerError';
  }
}

// ---------------------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------------------

/** Paths under `/venues/` and `/api/venues/` that a venue slug must never shadow. */
const RESERVED_VENUE_SLUGS = new Set(['register', 'applications', 'new', 'manage']);

function slugBase(name: string, fallback: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return s.length >= 2 ? s : fallback;
}

/** `base`, else `base-2`, `base-3`… — the first one `taken` doesn't contain. */
function firstFreeSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function takenSlugs(table: 'venues' | 'organizations', base: string): Promise<Set<string>> {
  const db = getDb();
  const pattern = `${base}%`;
  const rows =
    table === 'venues'
      ? await db
          .select({ slug: venues.slug })
          .from(venues)
          .where(sql`${venues.slug} like ${pattern}`)
      : await db
          .select({ slug: organizations.slug })
          .from(organizations)
          .where(sql`${organizations.slug} like ${pattern}`);
  const out = new Set(rows.map((r) => r.slug));
  if (table === 'venues') for (const r of RESERVED_VENUE_SLUGS) out.add(r);
  return out;
}

// ---------------------------------------------------------------------------------------
// Shared input validation
// ---------------------------------------------------------------------------------------

export type VenueGameSeats = { gameSlug: string; seatsCount: number };

export type VenueHoursInput = {
  /** 'HH:MM' Kuwait local; ignored when `isOpen24h`. */
  opensAtTime?: string | null;
  closesAtTime?: string | null;
  isOpen24h: boolean;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function resolveHours(input: VenueHoursInput): {
  opensAtTime: string;
  closesAtTime: string;
  isOpen24h: boolean;
} {
  if (input.isOpen24h) return { opensAtTime: '00:00', closesAtTime: '00:00', isOpen24h: true };
  const open = input.opensAtTime ?? '';
  const close = input.closesAtTime ?? '';
  if (!HHMM.test(open) || !HHMM.test(close)) {
    throw new VenueOwnerError('invalid_hours', 'Opening hours must be HH:MM, or open 24 hours.');
  }
  if (open === close) {
    throw new VenueOwnerError(
      'invalid_hours',
      'Opening and closing time are the same. Pick different times or open 24 hours.',
    );
  }
  return { opensAtTime: open, closesAtTime: close, isOpen24h: false };
}

async function resolveGames(
  list: VenueGameSeats[],
): Promise<{ gameId: string; seatsCount: number }[]> {
  const slugs = [...new Set(list.map((g) => g.gameSlug))];
  if (slugs.length === 0 || slugs.length !== list.length) {
    throw new VenueOwnerError('unknown_game', 'List each game once, with at least one game.');
  }
  const rows = await getDb()
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(and(inArray(games.slug, slugs), eq(games.isActive, true)));
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const missing = slugs.filter((s) => !idBySlug.has(s));
  if (missing.length > 0) {
    throw new VenueOwnerError('unknown_game', `Unknown game(s): ${missing.join(', ')}.`);
  }
  return list.map((g) => ({
    gameId: idBySlug.get(g.gameSlug) as string,
    seatsCount: g.seatsCount,
  }));
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

/** Games a venue can list (active catalogue). */
export async function listVenueGameOptions(): Promise<{ slug: string; name: string }[]> {
  return getDb()
    .select({ slug: games.slug, name: games.name })
    .from(games)
    .where(eq(games.isActive, true))
    .orderBy(asc(games.name));
}

// ---------------------------------------------------------------------------------------
// V-01 — venue application
// ---------------------------------------------------------------------------------------

export type VenueApplicationInput = {
  byUserId: string;
  businessName: string;
  venueName: string;
  city: string;
  countryCode: string;
  address: string;
  phoneNumber: string;
  email?: string | null;
  description?: string | null;
  games: VenueGameSeats[];
  hourlyRateKwd: number;
  cancellationWindowHours: number;
  acceptsWalkIns: boolean;
} & VenueHoursInput;

/** User ids of Beat'Em All staff (owners/admins of the platform organisation). */
export async function platformReviewerUserIds(): Promise<string[]> {
  const [org] = await getDb()
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, PLATFORM_ORGANIZATION_SLUG))
    .limit(1);
  return org ? organizationManagerUserIds(org.id) : [];
}

export async function submitVenueApplication(
  input: VenueApplicationInput,
): Promise<{ venueSlug: string; organizationSlug: string }> {
  const db = getDb();
  const businessName = input.businessName.trim();
  const venueName = input.venueName.trim();
  const hours = resolveHours(input);
  const gameRows = await resolveGames(input.games);
  const totalSeats = input.games.reduce((sum, g) => sum + g.seatsCount, 0);

  const [clash] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(sql`lower(${organizations.name}) = lower(${businessName})`)
    .limit(1);
  if (clash) {
    throw new VenueOwnerError(
      'name_taken',
      `An organisation called "${businessName}" already exists on Beat'Em All.`,
    );
  }

  const orgBase = slugBase(businessName, 'org');
  const venueBase = slugBase(venueName, 'venue');
  const orgSlug = firstFreeSlug(orgBase, await takenSlugs('organizations', orgBase));
  const venueSlug = firstFreeSlug(venueBase, await takenSlugs('venues', venueBase));

  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      const [org] = await tx
        .insert(organizations)
        .values({
          name: businessName,
          slug: orgSlug,
          tier: 'venue',
          countryCode: input.countryCode,
          description: input.description?.trim() || null,
          contactEmail: input.email?.trim() || null,
          contactPhone: input.phoneNumber.trim(),
          verificationStatus: 'pending',
          isPublic: true,
        })
        .returning({ id: organizations.id });
      if (!org) throw new VenueOwnerError('insert_failed', 'Organisation insert returned no row.');

      await tx.insert(memberships).values({
        userId: input.byUserId,
        organizationId: org.id,
        role: 'owner',
        acceptedAt: now,
      });

      const [venue] = await tx
        .insert(venues)
        .values({
          organizationId: org.id,
          name: venueName,
          slug: venueSlug,
          description: input.description?.trim() || null,
          countryCode: input.countryCode,
          city: input.city.trim(),
          address: input.address.trim(),
          phoneNumber: input.phoneNumber.trim(),
          email: input.email?.trim() || null,
          totalSeats,
          verificationStatus: 'pending',
          isActive: true,
          defaultHourlyRateKwd: roundKwd(input.hourlyRateKwd),
          cancellationWindowHours: input.cancellationWindowHours,
          acceptsWalkIns: input.acceptsWalkIns,
          ...hours,
        })
        .returning({ id: venues.id });
      if (!venue) throw new VenueOwnerError('insert_failed', 'Venue insert returned no row.');

      await tx
        .insert(venueGames)
        .values(
          gameRows.map((g) => ({ venueId: venue.id, gameId: g.gameId, seatsCount: g.seatsCount })),
        );
    });
  } catch (err) {
    if (err instanceof VenueOwnerError) throw err;
    if (isUniqueViolation(err)) {
      throw new VenueOwnerError(
        'name_taken',
        'That organisation or venue name was just taken. Try a slightly different name.',
      );
    }
    throw err;
  }

  await notify({
    recipientUserIds: await platformReviewerUserIds(),
    type: 'application_submitted',
    title: `New venue application: ${venueName}`,
    data: { href: '/admin', name: venueName, organization: businessName, kind: 'venue' },
  });
  return { venueSlug, organizationSlug: orgSlug };
}

// ---------------------------------------------------------------------------------------
// V-02/V-03 — managed venue read + edit
// ---------------------------------------------------------------------------------------

export type ManagedVenue = {
  venue: VenueRow;
  organization: Pick<
    OrganizationRow,
    'id' | 'slug' | 'name' | 'verificationStatus' | 'reviewNotes'
  > | null;
  games: { slug: string; name: string; seatsCount: number }[];
};

/** Does the user own or administer the organisation that runs this venue? */
export async function canManageVenue(userId: string, venueId: string): Promise<boolean> {
  return (await listManagedVenueIds(userId)).includes(venueId);
}

/** The venue in any review state, only for its managers (null otherwise → 404). */
export async function loadManagedVenue(slug: string, userId: string): Promise<ManagedVenue | null> {
  const db = getDb();
  const [venue] = await db
    .select()
    .from(venues)
    .where(and(eq(venues.slug, slug), isNull(venues.deletedAt)))
    .limit(1);
  if (!venue || !(await canManageVenue(userId, venue.id))) return null;

  const [org] = venue.organizationId
    ? await db
        .select({
          id: organizations.id,
          slug: organizations.slug,
          name: organizations.name,
          verificationStatus: organizations.verificationStatus,
          reviewNotes: organizations.reviewNotes,
        })
        .from(organizations)
        .where(eq(organizations.id, venue.organizationId))
        .limit(1)
    : [];
  const gameRows = await db
    .select({ slug: games.slug, name: games.name, seatsCount: venueGames.seatsCount })
    .from(venueGames)
    .innerJoin(games, eq(games.id, venueGames.gameId))
    .where(eq(venueGames.venueId, venue.id))
    .orderBy(asc(games.name));
  return { venue, organization: org ?? null, games: gameRows };
}

export type VenueUpdateInput = {
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
  email?: string | null;
  description?: string | null;
  hourlyRateKwd: number;
  games: VenueGameSeats[];
  cancellationWindowHours: number;
  acceptsWalkIns: boolean;
  /** "Accepting bookings" switch. */
  isActive: boolean;
} & VenueHoursInput;

/** V-03: edit details, price, games + seats (replaces the set), hours, window, switch. */
export async function updateManagedVenue(
  slug: string,
  userId: string,
  input: VenueUpdateInput,
): Promise<VenueRow> {
  const managed = await loadManagedVenue(slug, userId);
  if (!managed) throw new VenueOwnerError('not_found', 'Venue not found.');
  const hours = resolveHours(input);
  const gameRows = await resolveGames(input.games);
  const totalSeats = input.games.reduce((sum, g) => sum + g.seatsCount, 0);
  const venueId = managed.venue.id;

  return getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(venues)
      .set({
        name: input.name.trim(),
        city: input.city.trim(),
        address: input.address.trim(),
        phoneNumber: input.phoneNumber.trim(),
        email: input.email?.trim() || null,
        description: input.description?.trim() || null,
        defaultHourlyRateKwd: roundKwd(input.hourlyRateKwd),
        cancellationWindowHours: input.cancellationWindowHours,
        acceptsWalkIns: input.acceptsWalkIns,
        isActive: input.isActive,
        totalSeats,
        ...hours,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, venueId))
      .returning();
    if (!updated) throw new VenueOwnerError('not_found', 'Venue not found.');
    await tx.delete(venueGames).where(eq(venueGames.venueId, venueId));
    await tx
      .insert(venueGames)
      .values(gameRows.map((g) => ({ venueId, gameId: g.gameId, seatsCount: g.seatsCount })));
    return updated;
  });
}

// ---------------------------------------------------------------------------------------
// V-04 — dashboard
// ---------------------------------------------------------------------------------------

const KUWAIT_OFFSET_MS = 3 * 3_600_000;

/** Start of today and of this month in Kuwait, as UTC instants. */
export function kuwaitDayAndMonth(now = new Date()) {
  const local = new Date(now.getTime() + KUWAIT_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const todayStart = new Date(Date.UTC(y, m, d) - KUWAIT_OFFSET_MS);
  return {
    now,
    todayStart,
    todayEnd: new Date(todayStart.getTime() + 24 * 3_600_000),
    monthStart: new Date(Date.UTC(y, m, 1) - KUWAIT_OFFSET_MS),
    monthEnd: new Date(Date.UTC(y, m + 1, 1) - KUWAIT_OFFSET_MS),
  };
}

export type VenueDashboardStats = {
  upcoming: number;
  today: number;
  monthBookings: number;
  monthSeatHours: number;
  monthRevenueKwd: number;
};

export async function loadVenueDashboardStats(venueId: string): Promise<VenueDashboardStats> {
  const { todayStart, todayEnd, monthStart, monthEnd } = kuwaitDayAndMonth();
  const b = venueBookings;
  const ts = (d: Date) => sql`${d.toISOString()}::timestamptz`;
  const inMonth = sql`${b.startAt} >= ${ts(monthStart)} and ${b.startAt} < ${ts(monthEnd)}`;
  const live = sql`${b.status} in ('pending_payment','confirmed','checked_in','completed')`;
  const paid = sql`${b.status} in ('confirmed','checked_in','completed')`;
  const hours = sql`extract(epoch from (${b.endAt} - ${b.startAt})) / 3600.0`;

  const [row] = await getDb()
    .select({
      upcoming:
        sql`count(*) filter (where ${b.startAt} > now() and ${b.status} in ('pending_payment','confirmed'))`.mapWith(
          Number,
        ),
      today:
        sql`count(*) filter (where ${b.startAt} >= ${ts(todayStart)} and ${b.startAt} < ${ts(todayEnd)} and ${live})`.mapWith(
          Number,
        ),
      monthBookings: sql`count(*) filter (where ${inMonth} and ${live})`.mapWith(Number),
      monthSeatHours:
        sql`coalesce(sum(${b.seatsCount} * ${hours}) filter (where ${inMonth} and ${live}), 0)`.mapWith(
          Number,
        ),
      monthRevenueKwd:
        sql`coalesce(sum(${b.totalAmountKwd}) filter (where ${inMonth} and ${paid}), 0)`.mapWith(
          Number,
        ),
    })
    .from(b)
    .where(eq(b.venueId, venueId));
  return {
    upcoming: row?.upcoming ?? 0,
    today: row?.today ?? 0,
    monthBookings: row?.monthBookings ?? 0,
    monthSeatHours: Math.round((row?.monthSeatHours ?? 0) * 10) / 10,
    monthRevenueKwd: roundKwd(row?.monthRevenueKwd ?? 0),
  };
}

/** Every booking at the venue, newest start first (the page splits upcoming / past). */
export async function listVenueBookingsForManager(
  venueId: string,
  limit = 200,
): Promise<BookingWithRelations[]> {
  const rows = await getDb()
    .select()
    .from(venueBookings)
    .where(eq(venueBookings.venueId, venueId))
    .orderBy(desc(venueBookings.startAt))
    .limit(limit);
  return hydrateBookings(rows);
}

// ---------------------------------------------------------------------------------------
// V-05/V-06/T-08 — booking status changes
// ---------------------------------------------------------------------------------------

/**
 * Give back any voucher payment on a booking: restore a stored-value balance, free the use,
 * delete the redemption row. Mirrors `refundRegistrationRedemptionsInTx`.
 */
export async function refundBookingRedemptionsInTx(tx: Tx, bookingId: string): Promise<number> {
  const rows = await tx
    .select()
    .from(voucherRedemptions)
    .where(eq(voucherRedemptions.bookingId, bookingId));
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

export type VenueBookingAction = 'check_in' | 'complete' | 'no_show' | 'cancel';

/** Which statuses each venue action may start from, and where it leads. */
const VENUE_TRANSITIONS: Record<
  VenueBookingAction,
  { from: readonly VenueBookingRow['status'][]; to: VenueBookingRow['status'] }
> = {
  check_in: { from: ['confirmed'], to: 'checked_in' },
  complete: { from: ['checked_in'], to: 'completed' },
  no_show: { from: ['confirmed', 'checked_in'], to: 'no_show' },
  cancel: { from: ['pending_payment', 'confirmed'], to: 'cancelled' },
};

/** Actions the venue can take on a booking in this status (for the UI). */
export function venueActionsFor(status: VenueBookingRow['status']): VenueBookingAction[] {
  return (Object.keys(VENUE_TRANSITIONS) as VenueBookingAction[]).filter((a) =>
    VENUE_TRANSITIONS[a].from.includes(status),
  );
}

/** Lock the booking, check the transition, apply it (refunding vouchers on cancel). */
async function transitionBooking(
  bookingId: string,
  allowedFrom: readonly VenueBookingRow['status'][],
  to: VenueBookingRow['status'],
  reason: string | null,
): Promise<VenueBookingRow> {
  return getDb().transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(venueBookings)
      .where(eq(venueBookings.id, bookingId))
      .for('update')
      .limit(1);
    if (!locked) throw new VenueOwnerError('not_found', 'Booking not found.');
    if (!allowedFrom.includes(locked.status)) {
      throw new VenueOwnerError(
        'invalid_state',
        `This booking is ${locked.status.replace('_', ' ')}.`,
      );
    }
    const now = new Date();
    const [updated] = await tx
      .update(venueBookings)
      .set({
        status: to,
        updatedAt: now,
        ...(to === 'cancelled' ? { cancelledAt: now, cancellationReason: reason } : {}),
      })
      .where(eq(venueBookings.id, bookingId))
      .returning();
    if (to === 'cancelled') await refundBookingRedemptionsInTx(tx, bookingId);
    return updated ?? locked;
  });
}

/** V-05/V-06: the venue checks a team in, completes, marks a no-show, or cancels. */
export async function actOnBookingAsVenue(input: {
  bookingId: string;
  byUserId: string;
  action: VenueBookingAction;
  reason?: string | null;
}): Promise<VenueBookingRow> {
  const detail = isUuid(input.bookingId) ? await loadBookingById(input.bookingId) : null;
  if (!detail || !(await canManageVenue(input.byUserId, detail.venue.id))) {
    throw new VenueOwnerError('not_found', 'Booking not found.');
  }
  const reason = input.reason?.trim() || null;
  if (input.action === 'cancel' && !reason) {
    throw new VenueOwnerError('reason_required', 'Give the team a reason for cancelling.');
  }
  const rule = VENUE_TRANSITIONS[input.action];
  const updated = await transitionBooking(detail.booking.id, rule.from, rule.to, reason);

  const data = {
    href: `/bookings/${detail.booking.id}`,
    team: detail.team.name,
    venue: detail.venue.name,
  };
  if (input.action === 'check_in') {
    await notify({
      recipientUserIds: await teamUserIds(detail.team.id),
      type: 'booking_checked_in',
      title: `${detail.team.name} checked in at ${detail.venue.name}`,
      data,
    });
  } else if (input.action === 'cancel') {
    await notify({
      recipientUserIds: await teamUserIds(detail.team.id, true),
      type: 'booking_cancelled',
      title: `${detail.venue.name} cancelled ${detail.team.name}'s booking`,
      data: { ...data, by: detail.venue.name, reason },
    });
  }
  return updated;
}

/** Last moment the team may cancel: start time minus the venue's cancellation window. */
export function teamCancelDeadline(startAt: Date, cancellationWindowHours: number): Date {
  return new Date(startAt.getTime() - cancellationWindowHours * 3_600_000);
}

/** The team's cancellation deadline and whether it's still ahead (for the booking page). */
export function teamCancelStatus(
  startAt: Date,
  cancellationWindowHours: number,
): { deadline: Date; open: boolean } {
  const deadline = teamCancelDeadline(startAt, cancellationWindowHours);
  return { deadline, open: Date.now() <= deadline.getTime() };
}

/** Cancellation window (hours) of the venue a booking is at. */
export async function loadVenueCancellationWindow(venueId: string): Promise<number> {
  const [v] = await getDb()
    .select({ hours: venues.cancellationWindowHours })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
  return v?.hours ?? 24;
}

/** T-08: the booking team's captain or co-captain cancels before the venue's window. */
export async function cancelBookingByTeam(input: {
  bookingId: string;
  byUserId: string;
  byPlayerId: string;
  reason?: string | null;
}): Promise<VenueBookingRow> {
  const detail = isUuid(input.bookingId) ? await loadBookingById(input.bookingId) : null;
  if (!detail) throw new VenueOwnerError('not_found', 'Booking not found.');
  const role = await loadTeamRole(input.byPlayerId, detail.team.id);
  if (!role) {
    // Only the booker (who may have left the team) or members may even see it.
    if (detail.booking.bookedByUserId !== input.byUserId) {
      throw new VenueOwnerError('not_found', 'Booking not found.');
    }
    throw new VenueOwnerError('captain_only', 'Only the captain or co-captain can cancel.');
  }
  if (!isTeamLeaderRole(role)) {
    throw new VenueOwnerError('captain_only', 'Only the captain or co-captain can cancel.');
  }
  if (!['pending_payment', 'confirmed'].includes(detail.booking.status)) {
    throw new VenueOwnerError(
      'invalid_state',
      `This booking is ${detail.booking.status.replace('_', ' ')}.`,
    );
  }
  const windowHours = await loadVenueCancellationWindow(detail.venue.id);
  if (Date.now() > teamCancelDeadline(detail.booking.startAt, windowHours).getTime()) {
    throw new VenueOwnerError(
      'cancel_window_passed',
      `${detail.venue.name} takes cancellations up to ${windowHours} hour(s) before the start.`,
    );
  }

  const reason = input.reason?.trim() || null;
  const updated = await transitionBooking(
    detail.booking.id,
    ['pending_payment', 'confirmed'],
    'cancelled',
    reason,
  );

  const [venue] = await getDb()
    .select({ organizationId: venues.organizationId })
    .from(venues)
    .where(eq(venues.id, detail.venue.id))
    .limit(1);
  if (venue?.organizationId) {
    await notify({
      recipientUserIds: await organizationManagerUserIds(venue.organizationId),
      type: 'booking_cancelled',
      title: `${detail.team.name} cancelled their booking at ${detail.venue.name}`,
      data: {
        href: `/bookings/${detail.booking.id}`,
        team: detail.team.name,
        venue: detail.venue.name,
        by: detail.team.name,
        reason,
      },
    });
  }
  return updated;
}
