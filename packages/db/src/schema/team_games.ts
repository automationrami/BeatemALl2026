/**
 * `team_games` — M:N between teams and games. Per DOMAIN_MODEL.md §4.3.
 */

import { sql } from 'drizzle-orm';
import { boolean, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { games } from './games';

export const teamGames = pgTable(
  'team_games',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),

    /** Main game the team is known for. Used for "primary" annotation on the profile pill row. */
    isPrimary: boolean('is_primary').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    teamGameIdx: uniqueIndex('team_games_team_id_game_id_idx').on(table.teamId, table.gameId),
  }),
);

export type TeamGameRow = typeof teamGames.$inferSelect;
export type TeamGameInsert = typeof teamGames.$inferInsert;
