/**
 * `vouchers` + `voucher_redemptions` — prepaid payment option for bookings and tournament
 * entry fees (founder request 2026-09-26; not yet in DOMAIN_MODEL.md, pending sign-off).
 *
 * An Organization (any tier: federation, venue, brand…) issues a voucher. Two kinds:
 *   - `unlimited`     covers any amount, as many times as allowed (`maxRedemptions` null = no cap)
 *   - `stored_value`  holds a KWD balance; each redemption draws it down
 *
 * Optional scope: a single team (`teamId`), a single venue (`venueId`), an expiry.
 * A redemption pays for exactly one booking or one tournament registration in full;
 * partial payment and split payment stay with Tap Payments (P-2 / E4-S2).
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
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { teams } from './teams';
import { venues } from './venues';
import { venueBookings } from './venue_bookings';
import { tournamentRegistrations } from './tournament_registrations';

export const voucherKindEnum = pgEnum('voucher_kind', ['unlimited', 'stored_value']);
export const voucherStatusEnum = pgEnum('voucher_status', ['active', 'revoked']);
export const voucherPurposeEnum = pgEnum('voucher_purpose', ['booking', 'tournament_entry']);

export const vouchers = pgTable(
  'vouchers',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Stored upper-case; matched case-insensitively. */
    code: text('code').notNull(),

    issuerOrganizationId: uuid('issuer_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    issuedByUserId: uuid('issued_by_user_id').references(() => users.id, { onDelete: 'set null' }),

    kind: voucherKindEnum('kind').notNull(),
    /** Face value for `stored_value`; null for `unlimited`. */
    valueKwd: doublePrecision('value_kwd'),
    /** Remaining balance for `stored_value`; null for `unlimited`. */
    balanceKwd: doublePrecision('balance_kwd'),
    currency: text('currency').notNull().default('KWD'),

    /** Only this team may redeem. Null = anyone holding the code. */
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    /** Only bookings at this venue. Null = any venue and tournament entries. */
    venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }),

    /** Null = no cap. */
    maxRedemptions: integer('max_redemptions'),
    redemptionCount: integer('redemption_count').notNull().default(0),

    expiresAt: timestamp('expires_at', { withTimezone: true }),
    status: voucherStatusEnum('status').notNull().default('active'),
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    codeIdx: uniqueIndex('vouchers_code_idx').on(table.code),
    teamIdx: index('vouchers_team_idx').on(table.teamId),
    issuerIdx: index('vouchers_issuer_idx').on(table.issuerOrganizationId),
  }),
);

export const voucherRedemptions = pgTable(
  'voucher_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    voucherId: uuid('voucher_id')
      .notNull()
      .references(() => vouchers.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    redeemedByUserId: uuid('redeemed_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    purpose: voucherPurposeEnum('purpose').notNull(),
    bookingId: uuid('booking_id').references(() => venueBookings.id, { onDelete: 'cascade' }),
    registrationId: uuid('registration_id').references(() => tournamentRegistrations.id, {
      onDelete: 'cascade',
    }),

    amountKwd: doublePrecision('amount_kwd').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    voucherIdx: index('voucher_redemptions_voucher_idx').on(table.voucherId, table.createdAt),
    /** A booking is paid once. */
    bookingIdx: uniqueIndex('voucher_redemptions_booking_idx').on(table.bookingId),
    registrationIdx: index('voucher_redemptions_registration_idx').on(table.registrationId),
  }),
);

export type VoucherRow = typeof vouchers.$inferSelect;
export type VoucherInsert = typeof vouchers.$inferInsert;
export type VoucherRedemptionRow = typeof voucherRedemptions.$inferSelect;
