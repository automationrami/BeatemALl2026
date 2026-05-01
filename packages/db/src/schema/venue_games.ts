/** `venue_games` — M:N venues ↔ games with seat count. Per DOMAIN_MODEL.md §6.3. */

import { sql } from 'drizzle-orm';
import { integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { venues } from './venues';
import { games } from './games';

export const venueGames = pgTable(
  'venue_games',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),

    seatsCount: integer('seats_count').notNull().default(1),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    venueGameIdx: uniqueIndex('venue_games_venue_id_game_id_idx').on(table.venueId, table.gameId),
  }),
);

export type VenueGameRow = typeof venueGames.$inferSelect;
export type VenueGameInsert = typeof venueGames.$inferInsert;
