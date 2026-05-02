/**
 * `matches` per DOMAIN_MODEL.md §7.3.
 *
 * Phase 1 scope: matches are created when a challenge is accepted. Booking + scheduling
 * + result reporting come in subsequent stories. We model the row so the FK from challenges
 * works and the team profile's "Upcoming match" card can read from real DB.
 */

import { sql } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { games } from './games';
import { challenges } from './challenges';

export const matchTypeEnum = pgEnum('match_type', ['challenge', 'tournament_match', 'friendly']);

export const matchStatusEnum = pgEnum('match_status', [
  'scheduled',
  'in_progress',
  'awaiting_result',
  'result_disputed',
  'completed',
  'cancelled',
  'forfeited',
]);

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),

  matchType: matchTypeEnum('match_type').notNull().default('challenge'),
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),

  homeTeamId: uuid('home_team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'restrict' }),
  awayTeamId: uuid('away_team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'restrict' }),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'restrict' }),

  format: text('format').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  actualStartedAt: timestamp('actual_started_at', { withTimezone: true }),
  actualEndedAt: timestamp('actual_ended_at', { withTimezone: true }),

  isOnline: boolean('is_online').notNull().default(false),
  status: matchStatusEnum('status').notNull().default('scheduled'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

export type MatchRow = typeof matches.$inferSelect;
export type MatchInsert = typeof matches.$inferInsert;
