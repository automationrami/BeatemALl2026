/**
 * `challenges` + `challenge_negotiations` per DOMAIN_MODEL.md §7.1, §7.2.
 *
 * Phase 1 simplifications:
 *   - `proposed_venue_ids` deferred (no booking flow yet); use `proposed_venue_slug` text instead
 *     to keep the form lightweight while still showing intent on the detail page.
 *   - `expires_at` defaults to created_at + 7 days per spec; cron-based expiry deferred.
 */

import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { games } from './games';

export const challengeStatusEnum = pgEnum('challenge_status', [
  'pending',
  'negotiating',
  'accepted',
  'rejected',
  'expired',
  'cancelled',
  'booked',
]);

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),

  challengerTeamId: uuid('challenger_team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  challengedTeamId: uuid('challenged_team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'restrict' }),

  /** `bo1` | `bo3` | `bo5`. */
  proposedFormat: text('proposed_format').notNull(),
  proposedDateRangeStart: timestamp('proposed_date_range_start', { withTimezone: true }).notNull(),
  proposedDateRangeEnd: timestamp('proposed_date_range_end', { withTimezone: true }).notNull(),
  proposedVenueSlug: text('proposed_venue_slug'),
  message: text('message'),

  status: challengeStatusEnum('status').notNull().default('pending'),

  /** 7-day default expiry per DOMAIN_MODEL.md §7.1. */
  expiresAt: timestamp('expires_at', { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '7 days'`),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  matchId: uuid('match_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type ChallengeRow = typeof challenges.$inferSelect;
export type ChallengeInsert = typeof challenges.$inferInsert;

export const challengeNegotiations = pgTable('challenge_negotiations', {
  id: uuid('id').primaryKey().defaultRandom(),

  challengeId: uuid('challenge_id')
    .notNull()
    .references(() => challenges.id, { onDelete: 'cascade' }),
  proposedByTeamId: uuid('proposed_by_team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),

  proposedFormat: text('proposed_format').notNull(),
  proposedDateRangeStart: timestamp('proposed_date_range_start', { withTimezone: true }).notNull(),
  proposedDateRangeEnd: timestamp('proposed_date_range_end', { withTimezone: true }).notNull(),
  proposedVenueSlug: text('proposed_venue_slug'),
  message: text('message'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type ChallengeNegotiationRow = typeof challengeNegotiations.$inferSelect;
export type ChallengeNegotiationInsert = typeof challengeNegotiations.$inferInsert;
