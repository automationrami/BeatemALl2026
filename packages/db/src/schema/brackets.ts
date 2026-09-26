/**
 * Tournament structure — DOMAIN_MODEL.md §9.3 Bracket, §9.4 Round, §7.4 MatchResult.
 *
 * Single elimination at MVP launch. The bracket tree lives in `bracketData` (slots per
 * round); a `matches` row is created for a pairing only once both teams are known, so
 * `matches.home_team_id` / `away_team_id` stay required. Byes advance automatically.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tournaments, tournamentFormatEnum } from './tournaments';
import { teams } from './teams';
import { users } from './users';
import { matches } from './matches';

export const roundStatusEnum = pgEnum('round_status', [
  'pending',
  'ready',
  'in_progress',
  'completed',
]);

/** One slot in the bracket tree. `teamId` null = still to be decided (or a bye in round 1). */
export type BracketSlot = { teamId: string | null; seed: number | null; bye?: boolean };
/** `rounds[r][m]` is the pairing for match m of round r (0-based): two slots + outcome. */
export type BracketPairing = {
  slots: [BracketSlot, BracketSlot];
  matchId: string | null;
  winnerTeamId: string | null;
};
export type BracketData = { rounds: BracketPairing[][] };

export const brackets = pgTable(
  'brackets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    bracketType: tournamentFormatEnum('bracket_type').notNull(),
    totalRounds: integer('total_rounds').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().default(sql`now()`),
    seedData: jsonb('seed_data').$type<{ teamId: string; seed: number }[]>().notNull(),
    bracketData: jsonb('bracket_data').$type<BracketData>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    tournamentIdx: uniqueIndex('brackets_tournament_idx').on(table.tournamentId),
  }),
);

export const tournamentRounds = pgTable(
  'tournament_rounds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bracketId: uuid('bracket_id')
      .notNull()
      .references(() => brackets.id, { onDelete: 'cascade' }),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    roundNumber: integer('round_number').notNull(),
    roundLabel: text('round_label').notNull(),
    isLosersBracket: boolean('is_losers_bracket').notNull().default(false),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    status: roundStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    roundIdx: uniqueIndex('tournament_rounds_bracket_round_idx').on(
      table.bracketId,
      table.roundNumber,
    ),
  }),
);

export const matchResults = pgTable(
  'match_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    winnerTeamId: uuid('winner_team_id').references(() => teams.id, { onDelete: 'set null' }),
    isDraw: boolean('is_draw').notNull().default(false),
    homeTeamScore: integer('home_team_score').notNull(),
    awayTeamScore: integer('away_team_score').notNull(),
    /** Team that reported (challenge matches); null when an organiser records it. */
    reportedByTeamId: uuid('reported_by_team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    reportedByUserId: uuid('reported_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().default(sql`now()`),
    confirmedByTeamId: uuid('confirmed_by_team_id').references(() => teams.id, {
      onDelete: 'set null',
    }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    matchIdx: uniqueIndex('match_results_match_idx').on(table.matchId),
    winnerIdx: index('match_results_winner_idx').on(table.winnerTeamId),
  }),
);

export type BracketRow = typeof brackets.$inferSelect;
export type TournamentRoundRow = typeof tournamentRounds.$inferSelect;
export type MatchResultRow = typeof matchResults.$inferSelect;
