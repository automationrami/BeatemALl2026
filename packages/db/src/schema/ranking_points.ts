/**
 * RankingPoint — DOMAIN_MODEL.md §11.3 (Federation feature, FED-1).
 *
 * Points awarded to a Player or Team for a placement in a sanctioned tournament.
 * Only Federation-tier organizations award them (enforced in the award path, not here,
 * because tier lives on `organizations`). A leaderboard is the sum of points per
 * recipient per season, optionally scoped to the awarding organization — so KEC and a
 * future SEF each get their own ranking from the same table.
 */

import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { games } from './games';
import { organizations } from './organizations';
import { tournaments } from './tournaments';

export const rankingRecipientTypeEnum = pgEnum('ranking_recipient_type', ['player', 'team']);

export const rankingPoints = pgTable(
  'ranking_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    awardedByOrganizationId: uuid('awarded_by_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    recipientType: rankingRecipientTypeEnum('recipient_type').notNull(),
    /** players.id or teams.id depending on recipient_type (polymorphic, no FK). */
    recipientId: uuid('recipient_id').notNull(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'restrict' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    points: integer('points').notNull(),
    placement: integer('placement').notNull(),
    /** e.g. `2026-spring`, `2026-summer`. */
    season: text('season').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    /** One award per recipient per tournament. */
    tournamentRecipientIdx: uniqueIndex('ranking_points_tournament_recipient_idx').on(
      table.tournamentId,
      table.recipientType,
      table.recipientId,
    ),
    /** Leaderboard query: season + org + recipient type. */
    seasonOrgIdx: index('ranking_points_season_org_idx').on(
      table.season,
      table.awardedByOrganizationId,
      table.recipientType,
    ),
  }),
);

export type RankingPointRow = typeof rankingPoints.$inferSelect;
export type RankingPointInsert = typeof rankingPoints.$inferInsert;
