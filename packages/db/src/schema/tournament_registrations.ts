/**
 * `tournament_registrations` per DOMAIN_MODEL.md §9.2.
 *
 * A team's entry into a tournament. Phase-1 simplifications:
 *   - `roster_player_ids` deferred (need a roster-picker UI). For now we just record which
 *     team is registered; the bracket-seeding flow in TM-3 will revisit roster locking.
 *   - `seed_number` populated by bracket generation (TM-3). Nullable here.
 *   - `entry_payment_id` deferred until Tap Payments lands (P-2). Bookings begin in
 *     `pending_payment` if the tournament has an entry fee, else `confirmed` immediately.
 *   - `disqualification_reason` + `final_placement` populated post-MVP.
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
import { tournaments } from './tournaments';
import { teams } from './teams';
import { users } from './users';

export const tournamentRegistrationStatusEnum = pgEnum('tournament_registration_status', [
  'pending_payment',
  'confirmed',
  'checked_in',
  'disqualified',
  'withdrawn',
]);

export const tournamentRegistrations = pgTable(
  'tournament_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'restrict' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'restrict' }),
    registeredByUserId: uuid('registered_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    seedNumber: integer('seed_number'),
    status: tournamentRegistrationStatusEnum('status').notNull().default('confirmed'),

    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    disqualificationReason: text('disqualification_reason'),
    finalPlacement: integer('final_placement'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    /** A team can only register once per tournament (DOMAIN_MODEL.md §9.2 constraint). */
    tournamentTeamIdx: uniqueIndex('tournament_registrations_tournament_id_team_id_idx').on(
      table.tournamentId,
      table.teamId,
    ),
    /** Capacity-count + listing query: filter by tournament + status. */
    tournamentStatusIdx: index('tournament_registrations_tournament_status_idx').on(
      table.tournamentId,
      table.status,
    ),
    /** Inbox query: by registrant. */
    registeredByIdx: index('tournament_registrations_registered_by_idx').on(
      table.registeredByUserId,
      table.createdAt,
    ),
  }),
);

export type TournamentRegistrationRow = typeof tournamentRegistrations.$inferSelect;
export type TournamentRegistrationInsert = typeof tournamentRegistrations.$inferInsert;
