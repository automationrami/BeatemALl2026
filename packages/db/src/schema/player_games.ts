/**
 * `player_games` — M:N between players and games with per-game data. Per DOMAIN_MODEL.md §2.3.
 */

import { sql } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { games } from './games';
import { players } from './players';
import { proficiencyLevelEnum } from './enums';

export const playerGames = pgTable(
  'player_games',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),

    /** e.g. Riot ID `KHL#KWT`, Activision ID, Steam ID — game-specific in-game identifier. */
    inGameId: text('in_game_id'),
    /** Synced from publisher API where possible (Riot RSO, Steam OpenID). */
    inGameRank: text('in_game_rank'),

    proficiencyLevel: proficiencyLevelEnum('proficiency_level').notNull().default('intermediate'),
    yearsPlaying: integer('years_playing'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    playerGameIdx: uniqueIndex('player_games_player_id_game_id_idx').on(
      table.playerId,
      table.gameId,
    ),
  }),
);

export type PlayerGameRow = typeof playerGames.$inferSelect;
export type PlayerGameInsert = typeof playerGames.$inferInsert;
