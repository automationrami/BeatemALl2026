/**
 * `venue_bookings` per DOMAIN_MODEL.md §7.6.
 *
 * Phase-1 simplifications:
 *   - Cost-split (BookingParticipant) deferred. We record one `bookedByTeamId` and one
 *     `totalAmountKwd` — the booking team pays the whole thing. Splits land in E4-S2.
 *   - Tap Payments not wired. Bookings begin in `pending_payment` per spec but admin can
 *     flip to `confirmed` directly until E4-S3 ships. No `payment_id` FK yet.
 *   - `match_id` / `tournament_id` columns omitted; the auto-link from accepted-challenge
 *     to a created booking is its own follow-up story.
 *   - Per-slot `VenueAvailability` rows omitted — overlap math runs against rolling
 *     `venue_games.seats_count` capacity.
 */

import { sql } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { venues } from './venues';
import { users } from './users';
import { teams } from './teams';
import { games } from './games';

export const venueBookingStatusEnum = pgEnum('venue_booking_status', [
  'pending_payment',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
]);

export const venueBookings = pgTable(
  'venue_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'restrict' }),

    bookedByUserId: uuid('booked_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    /** Team the booking is for. Required in Phase 1: cost-split is deferred so a single team owns the slot. */
    bookedByTeamId: uuid('booked_by_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'restrict' }),

    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),

    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),

    seatsCount: integer('seats_count').notNull(),

    totalAmountKwd: doublePrecision('total_amount_kwd').notNull(),
    currency: text('currency').notNull().default('KWD'),

    status: venueBookingStatusEnum('status').notNull().default('pending_payment'),
    notes: text('notes'),

    cancellationReason: text('cancellation_reason'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    /** Hot path: overlap query filters by venue + game + status + time window. */
    venueOverlapIdx: index('venue_bookings_venue_game_time_idx').on(
      table.venueId,
      table.gameId,
      table.startAt,
      table.endAt,
    ),
    /** "My bookings" inbox query. */
    bookerIdx: index('venue_bookings_booker_idx').on(table.bookedByUserId, table.createdAt),
  }),
);

export type VenueBookingRow = typeof venueBookings.$inferSelect;
export type VenueBookingInsert = typeof venueBookings.$inferInsert;
