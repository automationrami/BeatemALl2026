/**
 * `players` table — competitive identity 1:1 with `users`. Per DOMAIN_MODEL.md §2.2.
 *
 * Note on `geo_location`: DOMAIN_MODEL.md prescribes a PostGIS Point. The Neon Postgres
 * compute does support PostGIS via `CREATE EXTENSION postgis`. We defer adding the column
 * until E5 (geographic team discovery) — it's not on E1's critical path and keeps the
 * first migration conceptually simple. Distance math in Phase 1 still runs against
 * mock-data via `@beat-em-all/utils/geo.haversineKm`.
 */

import { sql } from 'drizzle-orm';
import { boolean, date, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const players = pgTable(
  'players',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** ISO 3166-1 alpha-2 — `KW`, `SA`, `AE`, etc. Two chars. */
    countryCode: text('country_code').notNull(),
    city: text('city'),

    dateOfBirth: date('date_of_birth'),

    /** Set when KEC (or another federation) verifies civil ID for sanctioned tournaments. */
    civilIdVerifiedAt: timestamp('civil_id_verified_at', { withTimezone: true }),
    civilIdProvider: text('civil_id_provider'),

    bio: text('bio'),
    timezone: text('timezone').notNull().default('Asia/Kuwait'),
    preferredPosition: text('preferred_position'),

    isOpenToTeamInvites: boolean('is_open_to_team_invites').notNull().default(true),
    isProfilePublic: boolean('is_profile_public').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    userIdIdx: uniqueIndex('players_user_id_idx').on(table.userId),
  }),
);

export type PlayerRow = typeof players.$inferSelect;
export type PlayerInsert = typeof players.$inferInsert;
