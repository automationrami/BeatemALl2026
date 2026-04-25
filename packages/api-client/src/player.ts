/**
 * Player-profile read-side. Phase 1 reads from @beat-em-all/mock-data.
 * Phase 9 swaps these bodies for Supabase queries — same return shapes, callers don't change.
 */

import type { PlayerProfile } from '@beat-em-all/types';
import { getPlayerProfileByPersona, getPlayerProfileBySlug } from '@beat-em-all/mock-data';

export function getPlayerProfileForPersona(personaId: string): PlayerProfile {
  return getPlayerProfileByPersona(personaId);
}

export function getPlayerProfileForSlug(slug: string): PlayerProfile | null {
  return getPlayerProfileBySlug(slug);
}
