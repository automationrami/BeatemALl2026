/**
 * Venue-booking queries.
 *
 * Spec: DOMAIN_MODEL.md §7.6 + epic E4 (Booking, Payment & Cancellation).
 *
 * Phase-1 simplifications (rationale lives in `schema/venue_bookings.ts`):
 *   - Single team books and pays. No cost-split, no Tap Payments.
 *   - Capacity check is a rolling sum against `venue_games.seats_count` for that
 *     (venue, game) — overlapping non-cancelled bookings can't push the total over
 *     capacity. We don't model per-slot `VenueAvailability` rows yet.
 */

import { and, asc, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { venueBookings } from '../schema/venue_bookings';
import type { VenueBookingRow } from '../schema/venue_bookings';
import { venues } from '../schema/venues';
import type { VenueRow } from '../schema/venues';
import { venueGames } from '../schema/venue_games';
import { games } from '../schema/games';
import type { GameRow } from '../schema/games';
import { teams } from '../schema/teams';
import type { TeamRow } from '../schema/teams';
import { teamMembers } from '../schema/team_members';
import { users } from '../schema/users';

export type BookingWithRelations = {
  booking: VenueBookingRow;
  venue: Pick<
    VenueRow,
    'id' | 'slug' | 'name' | 'city' | 'countryCode' | 'address' | 'defaultHourlyRateKwd'
  >;
  game: Pick<GameRow, 'id' | 'slug' | 'name'>;
  team: Pick<TeamRow, 'id' | 'slug' | 'name' | 'tag'>;
  bookerDisplayName: string;
};

const ACTIVE_STATUSES = ['pending_payment', 'confirmed', 'checked_in', 'completed'] as const;

/**
 * Create a booking. Caller must have already resolved the active persona's `userId` +
 * `teamId` from the persona-cookie layer. We re-check authorisation (player belongs to
 * the team) here so the API surface can't bypass it by sending a different teamId.
 */
export async function createBooking(input: {
  venueSlug: string;
  byUserId: string;
  byPlayerId: string;
  byTeamId: string;
  gameSlug: string;
  startAt: Date;
  endAt: Date;
  seatsCount: number;
  notes?: string | null;
}): Promise<BookingWithRelations> {
  if (input.seatsCount < 1) {
    throw new BookingError('invalid_seats', 'seats_count must be at least 1.');
  }
  if (input.endAt <= input.startAt) {
    throw new BookingError('invalid_date_range', 'end_at must be strictly after start_at.');
  }
  if (input.endAt.getTime() - input.startAt.getTime() < 30 * 60_000) {
    throw new BookingError('invalid_date_range', 'Bookings must be at least 30 minutes long.');
  }
  if (input.startAt.getTime() < Date.now() - 60_000) {
    throw new BookingError('invalid_date_range', "start_at can't be in the past.");
  }

  const db = getDb();

  // Resolve venue + verify active/verified.
  const [venue] = await db.select().from(venues).where(eq(venues.slug, input.venueSlug)).limit(1);
  if (!venue) throw new BookingError('venue_not_found', 'Venue not found.');
  if (!venue.isActive || venue.verificationStatus !== 'verified') {
    throw new BookingError('venue_unavailable', 'This venue is not currently accepting bookings.');
  }

  // Resolve game.
  const [game] = await db.select().from(games).where(eq(games.slug, input.gameSlug)).limit(1);
  if (!game) throw new BookingError('game_not_found', 'Game not found.');

  // Verify the venue supports this game + read its per-game capacity.
  const [vg] = await db
    .select()
    .from(venueGames)
    .where(and(eq(venueGames.venueId, venue.id), eq(venueGames.gameId, game.id)))
    .limit(1);
  if (!vg) {
    throw new BookingError(
      'game_not_supported',
      `${venue.name} does not host ${game.name} matches.`,
    );
  }
  if (input.seatsCount > vg.seatsCount) {
    throw new BookingError(
      'over_capacity',
      `${venue.name} only has ${vg.seatsCount} ${game.name} seat(s).`,
    );
  }

  // Authorisation: persona must belong to the team they're booking on behalf of.
  const memberRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(and(eq(teamMembers.playerId, input.byPlayerId), eq(teamMembers.teamId, input.byTeamId)))
    .limit(1);
  if (memberRows.length === 0) {
    throw new BookingError(
      'forbidden',
      "You must be a member of the team you're booking on behalf of.",
    );
  }

  // Compute total. Hours rounded to nearest 0.25h to keep prices clean.
  const hours = Math.round(((input.endAt.getTime() - input.startAt.getTime()) / 3_600_000) * 4) / 4;
  const total = Math.round(hours * input.seatsCount * venue.defaultHourlyRateKwd * 100) / 100;

  // Race-safe overlap-then-insert: take a Postgres advisory transaction lock keyed on
  // (venue, game) so concurrent POSTs for the same slot serialise. Other (venue, game)
  // pairs continue in parallel. The lock is released automatically on COMMIT/ROLLBACK.
  const row = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${venue.id} || '|' || ${game.id}))`,
    );

    const overlapping = await tx
      .select({ seatsCount: venueBookings.seatsCount })
      .from(venueBookings)
      .where(
        and(
          eq(venueBookings.venueId, venue.id),
          eq(venueBookings.gameId, game.id),
          inArray(venueBookings.status, [...ACTIVE_STATUSES]),
          lt(venueBookings.startAt, input.endAt),
          gt(venueBookings.endAt, input.startAt),
        ),
      );
    const used = overlapping.reduce((sum, r) => sum + r.seatsCount, 0);
    if (used + input.seatsCount > vg.seatsCount) {
      throw new BookingError(
        'slot_unavailable',
        `${vg.seatsCount - used} ${game.name} seat(s) free in that window — you asked for ${input.seatsCount}.`,
      );
    }

    const inserted = await tx
      .insert(venueBookings)
      .values({
        venueId: venue.id,
        bookedByUserId: input.byUserId,
        bookedByTeamId: input.byTeamId,
        gameId: game.id,
        startAt: input.startAt,
        endAt: input.endAt,
        seatsCount: input.seatsCount,
        totalAmountKwd: total,
        currency: 'KWD',
        status: 'pending_payment',
        notes: input.notes ?? null,
      })
      .returning();
    const r = inserted[0];
    if (!r) throw new BookingError('insert_failed', 'Booking insert returned no row.');
    return r;
  });

  const detail = await loadBookingById(row.id);
  if (!detail) throw new BookingError('insert_failed', 'Booking inserted but could not be loaded.');
  return detail;
}

export async function loadBookingById(id: string): Promise<BookingWithRelations | null> {
  const db = getDb();
  const [b] = await db.select().from(venueBookings).where(eq(venueBookings.id, id)).limit(1);
  if (!b) return null;

  const [v] = await db.select().from(venues).where(eq(venues.id, b.venueId)).limit(1);
  const [g] = await db.select().from(games).where(eq(games.id, b.gameId)).limit(1);
  const [tm] = await db.select().from(teams).where(eq(teams.id, b.bookedByTeamId)).limit(1);
  const [u] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, b.bookedByUserId))
    .limit(1);
  if (!v || !g || !tm) return null;

  return {
    booking: b,
    venue: {
      id: v.id,
      slug: v.slug,
      name: v.name,
      city: v.city,
      countryCode: v.countryCode,
      address: v.address,
      defaultHourlyRateKwd: v.defaultHourlyRateKwd,
    },
    game: { id: g.id, slug: g.slug, name: g.name },
    team: { id: tm.id, slug: tm.slug, name: tm.name, tag: tm.tag },
    bookerDisplayName: u?.displayName ?? '—',
  };
}

/**
 * "My bookings" — bookings made by this user OR made by anyone for a team they're on.
 * This way Sara sees a booking Khaled made for Sandstorm too, since she's a member.
 */
export async function listBookingsForPlayer(
  playerId: string,
  userId: string,
): Promise<BookingWithRelations[]> {
  const db = getDb();
  const myTeamRows = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.playerId, playerId));
  const myTeamIds = myTeamRows.map((r) => r.teamId);

  const where =
    myTeamIds.length > 0
      ? or(
          eq(venueBookings.bookedByUserId, userId),
          inArray(venueBookings.bookedByTeamId, myTeamIds),
        )
      : eq(venueBookings.bookedByUserId, userId);

  const rows = await db
    .select()
    .from(venueBookings)
    .where(where)
    .orderBy(desc(venueBookings.startAt))
    .limit(50);
  if (rows.length === 0) return [];

  const venueIds = new Set(rows.map((r) => r.venueId));
  const gameIds = new Set(rows.map((r) => r.gameId));
  const teamIds = new Set(rows.map((r) => r.bookedByTeamId));
  const userIds = new Set(rows.map((r) => r.bookedByUserId));

  const [vs, gs, ts, us] = await Promise.all([
    db.select().from(venues).where(inArray(venues.id, [...venueIds])),
    db.select().from(games).where(inArray(games.id, [...gameIds])),
    db.select().from(teams).where(inArray(teams.id, [...teamIds])),
    db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, [...userIds])),
  ]);
  const venueById = new Map(vs.map((v) => [v.id, v]));
  const gameById = new Map(gs.map((g) => [g.id, g]));
  const teamById = new Map(ts.map((t) => [t.id, t]));
  const userById = new Map(us.map((u) => [u.id, u.displayName]));

  const out: BookingWithRelations[] = [];
  for (const b of rows) {
    const v = venueById.get(b.venueId);
    const g = gameById.get(b.gameId);
    const tm = teamById.get(b.bookedByTeamId);
    if (!v || !g || !tm) continue;
    out.push({
      booking: b,
      venue: {
        id: v.id,
        slug: v.slug,
        name: v.name,
        city: v.city,
        countryCode: v.countryCode,
        address: v.address,
        defaultHourlyRateKwd: v.defaultHourlyRateKwd,
      },
      game: { id: g.id, slug: g.slug, name: g.name },
      team: { id: tm.id, slug: tm.slug, name: tm.name, tag: tm.tag },
      bookerDisplayName: userById.get(b.bookedByUserId) ?? '—',
    });
  }
  return out;
}

/** List a venue's supported games + per-game capacity in one query. Used by BookingModal. */
export async function listVenueSupportedGames(
  venueSlug: string,
): Promise<{ slug: string; name: string; seatsCount: number; defaultDurationMinutes: number }[]> {
  const db = getDb();
  const [v] = await db.select().from(venues).where(eq(venues.slug, venueSlug)).limit(1);
  if (!v) return [];
  return db
    .select({
      slug: games.slug,
      name: games.name,
      seatsCount: venueGames.seatsCount,
      defaultDurationMinutes: games.defaultDurationMinutes,
    })
    .from(venueGames)
    .innerJoin(games, eq(games.id, venueGames.gameId))
    .where(eq(venueGames.venueId, v.id))
    .orderBy(asc(games.name));
}

export class BookingError extends Error {
  constructor(
    public code:
      | 'venue_not_found'
      | 'venue_unavailable'
      | 'game_not_found'
      | 'game_not_supported'
      | 'forbidden'
      | 'invalid_seats'
      | 'invalid_date_range'
      | 'over_capacity'
      | 'slot_unavailable'
      | 'insert_failed',
    message: string,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}
