/**
 * Drizzle schema barrel — every table registered here is included in migrations
 * and available on the typed `db.query.<table>` API.
 *
 * Add new tables here as epics ship: ORG-1 → organizations + memberships, E2 → teams +
 * team_members + team_games, E3/E4 → venues + bookings + payments, etc.
 */

export * from './challenges';
export * from './enums';
export * from './games';
export * from './matches';
export * from './memberships';
export * from './organizations';
export * from './players';
export * from './player_games';
export * from './teams';
export * from './team_games';
export * from './team_members';
export * from './tournaments';
export * from './users';
export * from './venues';
export * from './venue_games';
