/**
 * `tournaments` — competitions organized by an Organization. Per DOMAIN_MODEL.md §9.1.
 *
 * For Phase-1 we model the core fields needed by the Home Feed and tournament list/detail
 * pages. Bracket / Round / TournamentRegistration tables come in TM-2/TM-3.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { games } from './games';
import { users } from './users';

export const tournamentFormatEnum = pgEnum('tournament_format', [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss',
  'gsl',
  'league',
  'custom',
]);

export const tournamentStatusEnum = pgEnum('tournament_status', [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const tournaments = pgTable(
  'tournaments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),

    format: tournamentFormatEnum('format').notNull().default('single_elimination'),
    matchFormat: text('match_format').notNull().default('bo3'),

    teamSize: integer('team_size').notNull().default(5),
    minTeams: integer('min_teams').notNull().default(4),
    maxTeams: integer('max_teams').notNull().default(32),

    seedingStrategy: text('seeding_strategy').notNull().default('manual'),
    entryFeeKwd: doublePrecision('entry_fee_kwd').notNull().default(0),
    entryFeePerTeamOrPlayer: text('entry_fee_per_team_or_player').notNull().default('team'),

    isOfficialSanctioned: boolean('is_official_sanctioned').notNull().default(false),
    awardsRankingPoints: boolean('awards_ranking_points').notNull().default(false),
    isOnlineOnly: boolean('is_online_only').notNull().default(false),

    /** Optional cached display label for "starts in 2 weeks" — populated by app or cron. */
    startsInLabel: text('starts_in_label'),
    /** Cached registration label, e.g. "Registration open · 14 / 32 teams". */
    registrationLabel: text('registration_label'),

    /** Total prize pool in KWD. Mirrors PrizePool.total_amount_kwd for query convenience. */
    prizePoolKwd: doublePrecision('prize_pool_kwd').notNull().default(0),

    registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }),
    registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),

    status: tournamentStatusEnum('status').notNull().default('draft'),
    eligibilityRules: jsonb('eligibility_rules'),
    rulesUrl: text('rules_url'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugIdx: uniqueIndex('tournaments_slug_idx').on(table.slug),
  }),
);

export type TournamentRow = typeof tournaments.$inferSelect;
export type TournamentInsert = typeof tournaments.$inferInsert;
