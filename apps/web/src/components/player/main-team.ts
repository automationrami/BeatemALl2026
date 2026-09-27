import type { PlayerTeam } from '@beat-em-all/db/queries';
import type { ProfileTeam } from '@/components/PlayerProfileView';

/** The team a profile leads with: listPlayerTeams already sorts captaincies first. */
export function mainTeam(teams: readonly PlayerTeam[]): ProfileTeam | null {
  const t = teams[0];
  return t
    ? { slug: t.teamSlug, name: t.teamName, tag: t.tag, color: t.accentColor, role: t.role }
    : null;
}
