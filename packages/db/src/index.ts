/**
 * @beat-em-all/db — public surface.
 *
 * Consumers (Vercel Functions, scripts) import from here. The actual driver is created lazily
 * on first use so importing this module is side-effect-free at type-check time.
 */

export { getDb, getSql } from './client';
export * as schema from './schema';

/** Re-export every table so callers can do `import { users, players } from '@beat-em-all/db'`. */
export { users } from './schema/users';
export { players } from './schema/players';
export { playerGames } from './schema/player_games';
export { games } from './schema/games';
export { localeEnum, proficiencyLevelEnum, linkedAccountProviderEnum } from './schema/enums';

export type {
  UserRow,
  UserInsert,
} from './schema/users';
export type {
  PlayerRow,
  PlayerInsert,
} from './schema/players';
export type {
  PlayerGameRow,
  PlayerGameInsert,
} from './schema/player_games';
export type {
  GameRow,
  GameInsert,
} from './schema/games';

export const DB_VERSION = '0.0.1';
