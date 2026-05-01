/**
 * Team-profile read-side.
 *
 * **Server contexts:** import from `@beat-em-all/db/queries` directly — `loadTeamBySlug`.
 * **Client contexts:** call `getTeamForSlug` (this file) which fetches `/api/teams/[slug]`.
 */

import type { Team } from '@beat-em-all/types';
import { TEAMS_LIST } from '@beat-em-all/mock-data';

/**
 * Async fetch against `/api/teams/[slug]`. Returns `null` on 404.
 */
export async function getTeamForSlug(slug: string): Promise<Team | null> {
  if (!slug) return null;
  try {
    const res = await fetch(`/api/teams/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('[api-client] getTeamForSlug failed', res.status);
      return null;
    }
    const json = (await res.json()) as { team: Team };
    return json.team;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api-client] getTeamForSlug threw', err);
    return null;
  }
}

/** Sync mock list — Phase-1 dev fallback. Used by Discover screens until E5 wires real data. */
export function listAllTeams(): Team[] {
  return TEAMS_LIST;
}
