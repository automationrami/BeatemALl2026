/**
 * `games` table — competitive titles supported by the platform. Per DOMAIN_MODEL.md §5.1.
 *
 * Seeded by Beat'Em All admin with a fixed catalog (PRODUCT_VISION.md §8). The slug column
 * matches the GameId union in `@beat-em-all/types` so frontend ↔ DB round-trip without
 * translation layers.
 *
 * For E1 we only need this table to exist as the FK target for `player_games`. Full field
 * set is included up front so we don't migrate twice.
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Stable slug: `valorant`, `eafc`, `codm`, `tekken8`, `cs2`, `lol`. Matches GameId. */
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    publisher: text('publisher').notNull(),

    /** `fps` | `moba` | `battle_royale` | `fighting` | `sports` | `racing` | `rts` | `card` | `other`. */
    category: text('category').notNull(),

    teamSizeDefault: integer('team_size_default').notNull(),
    teamSizeMin: integer('team_size_min').notNull(),
    teamSizeMax: integer('team_size_max').notNull(),

    /** `bo1` | `bo3` | `bo5`. */
    defaultMatchFormat: text('default_match_format').notNull().default('bo3'),
    defaultDurationMinutes: integer('default_duration_minutes').notNull().default(60),

    iconUrl: text('icon_url'),
    coverImageUrl: text('cover_image_url'),

    supportsInGameId: boolean('supports_in_game_id').notNull().default(true),
    inGameIdLabel: text('in_game_id_label'),

    isActive: boolean('is_active').notNull().default(true),
    launchedAt: date('launched_at'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    slugIdx: uniqueIndex('games_slug_idx').on(table.slug),
  }),
);

export type GameRow = typeof games.$inferSelect;
export type GameInsert = typeof games.$inferInsert;
