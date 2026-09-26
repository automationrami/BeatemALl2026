/**
 * In-app notifications (DOMAIN_MODEL §11.1).
 *
 * Callers pass a `type` and the values its message needs; the UI renders the text from
 * `notifications.types.<type>` in the reader's language. `title` is an English fallback for
 * future push/SMS channels. Failures to notify never fail the action that triggered them.
 */

import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '../client';
import { notifications, type NotificationRow } from '../schema/notifications';
import { teamMembers } from '../schema/team_members';
import { players } from '../schema/players';
import { memberships } from '../schema/memberships';

export type NotificationType =
  | 'team_invite'
  | 'team_invite_accepted'
  | 'team_invite_declined'
  | 'team_member_removed'
  | 'team_role_changed'
  | 'team_captaincy_transferred'
  | 'team_disbanded'
  | 'challenge_received'
  | 'challenge_countered'
  | 'challenge_accepted'
  | 'challenge_rejected'
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_checked_in'
  | 'registration_received'
  | 'registration_disqualified'
  | 'registration_reinstated'
  | 'tournament_started'
  | 'tournament_match_ready'
  | 'tournament_completed'
  | 'tournament_cancelled'
  | 'application_submitted'
  | 'venue_approved'
  | 'venue_rejected'
  | 'organization_approved'
  | 'organization_rejected';

export type NotifyInput = {
  recipientUserIds: string[];
  type: NotificationType;
  /** English fallback line (other channels, logs). */
  title: string;
  /** `href` (deep link, locale-less, e.g. `/bookings/…`) plus message values. */
  data?: Record<string, string | number | null>;
};

/** Best-effort: never throws. Deduplicates recipients. */
export async function notify(input: NotifyInput): Promise<void> {
  const ids = [...new Set(input.recipientUserIds.filter(Boolean))];
  if (ids.length === 0) return;
  try {
    await getDb()
      .insert(notifications)
      .values(
        ids.map((recipientUserId) => ({
          recipientUserId,
          type: input.type,
          title: input.title,
          data: input.data ?? {},
        })),
      );
  } catch (err) {
    console.error('[notify] failed', input.type, err);
  }
}

/** User ids of a team's leaders (captain + co-captain), or of every active member. */
export async function teamUserIds(teamId: string, leadersOnly = false): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ userId: players.userId, role: teamMembers.role })
    .from(teamMembers)
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        isNull(teamMembers.leftAt),
        eq(teamMembers.invitationStatus, 'accepted'),
      ),
    );
  return rows
    .filter((r) => !leadersOnly || r.role === 'captain' || r.role === 'co_captain')
    .map((r) => r.userId);
}

/** User ids of an organisation's owners and admins. */
export async function organizationManagerUserIds(organizationId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        isNull(memberships.revokedAt),
        inArray(memberships.role, ['owner', 'admin']),
      ),
    );
  return rows.map((r) => r.userId);
}

export async function listNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  return getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/** Mark some (or, with no ids, all) of the user's notifications read. */
export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt),
        ids && ids.length > 0 ? inArray(notifications.id, ids) : undefined,
      ),
    );
}
