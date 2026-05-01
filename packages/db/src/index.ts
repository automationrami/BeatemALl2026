/**
 * @beat-em-all/db — public surface.
 *
 * Consumers (Vercel Functions, scripts) import from here. The actual driver is created lazily
 * on first use so importing this module is side-effect-free at type-check time.
 */

export { getDb, getSql } from './client';
export * as schema from './schema';

/**
 * Note: server-only query helpers live at `@beat-em-all/db/queries`. Importing them from
 * a `'use client'` component is a build-time error (`server-only` package guard).
 */

/** Re-export every table so callers can do `import { users, players } from '@beat-em-all/db'`. */
export { users } from './schema/users';
export { players } from './schema/players';
export { playerGames } from './schema/player_games';
export { games } from './schema/games';
export { teams } from './schema/teams';
export { teamMembers } from './schema/team_members';
export { teamGames } from './schema/team_games';
export {
  organizations,
  organizationTierEnum,
  verificationStatusEnum,
} from './schema/organizations';
export { memberships, membershipRoleEnum } from './schema/memberships';
export { venues, cancellationPolicyEnum } from './schema/venues';
export { venueGames } from './schema/venue_games';
export { tournaments, tournamentFormatEnum, tournamentStatusEnum } from './schema/tournaments';
export {
  localeEnum,
  proficiencyLevelEnum,
  linkedAccountProviderEnum,
  teamMemberRoleEnum,
  teamInvitationStatusEnum,
} from './schema/enums';

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
export type {
  TeamRow,
  TeamInsert,
} from './schema/teams';
export type {
  TeamMemberRow,
  TeamMemberInsert,
} from './schema/team_members';
export type {
  TeamGameRow,
  TeamGameInsert,
} from './schema/team_games';

export const DB_VERSION = '0.0.1';
