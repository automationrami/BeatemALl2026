/**
 * `team_members` — M:N between teams and players with a role. Per DOMAIN_MODEL.md §4.2.
 *
 * Rules from the doc:
 *   - Every team must have at least one captain at all times (enforced app-side).
 *   - A player can be a member of multiple teams across different games.
 *   - Invitations expire after 7 days if not accepted (enforced by app cron post-MVP).
 */

import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { players } from './players';
import { teamMemberRoleEnum, teamInvitationStatusEnum } from './enums';

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),

    role: teamMemberRoleEnum('role').notNull().default('starter'),

    /** In-game role label (e.g. "AWP", "IGL", "Striker"). Free-form per game. */
    inGameRole: text('in_game_role'),

    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().default(sql`now()`),
    leftAt: timestamp('left_at', { withTimezone: true }),

    invitedByPlayerId: uuid('invited_by_player_id').references(() => players.id, {
      onDelete: 'set null',
    }),
    invitationStatus: teamInvitationStatusEnum('invitation_status').notNull().default('accepted'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    // Prevent duplicate active memberships. The "WHERE left_at IS NULL" partial index in
    // DOMAIN_MODEL.md §4.2 — Drizzle expresses this with a regular index for now; the
    // app-side check enforces uniqueness pending future composite-PK refactor.
    teamPlayerIdx: uniqueIndex('team_members_team_id_player_id_idx').on(
      table.teamId,
      table.playerId,
    ),
  }),
);

export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type TeamMemberInsert = typeof teamMembers.$inferInsert;
