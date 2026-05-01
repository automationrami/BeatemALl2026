/**
 * Player-profile read-side.
 *
 * **Server contexts:** import from `@beat-em-all/db/queries` directly — `loadPlayerProfileBySlug`.
 * Skipping the HTTP roundtrip is faster and keeps Server Components zero-fetch.
 *
 * **Client contexts:** call `getPlayerProfileForSlug` (this file) which fetches `/api/players/[slug]`.
 *
 * The persona-by-id path stays mock-driven for now since the persona switcher is a dev-only
 * UI helper that resolves to a slug, then the slug-keyed flow takes over.
 */

import type { PlayerProfile } from '@beat-em-all/types';
import { getPlayerProfileByPersona } from '@beat-em-all/mock-data';

/**
 * Async fetch against `/api/players/[slug]` — for client components that don't get the
 * profile passed down as a prop. Returns `null` on 404.
 */
export async function getPlayerProfileForSlug(slug: string): Promise<PlayerProfile | null> {
  if (!slug) return null;
  try {
    const res = await fetch(`/api/players/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error('[api-client] getPlayerProfileForSlug failed', res.status);
      return null;
    }
    const json = (await res.json()) as { profile: PlayerProfile };
    return json.profile;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api-client] getPlayerProfileForSlug threw', err);
    return null;
  }
}

/**
 * Sync persona-by-id lookup. Phase-1 dev-only — used by the persona switcher to surface
 * a "what would Khaled see" view. In Phase-9 real-auth this is replaced by the session.
 */
export function getPlayerProfileForPersona(personaId: string): PlayerProfile {
  return getPlayerProfileByPersona(personaId);
}
