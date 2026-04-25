/**
 * Team-profile read-side. Phase 1 reads from @beat-em-all/mock-data.
 * Phase 9 swaps these bodies for Supabase queries — same return shapes, callers don't change.
 */

import type { Team } from '@beat-em-all/types';
import { TEAMS_LIST, getTeamBySlug } from '@beat-em-all/mock-data';

export function getTeamForSlug(slug: string): Team | null {
  return getTeamBySlug(slug);
}

export function listAllTeams(): Team[] {
  return TEAMS_LIST;
}
