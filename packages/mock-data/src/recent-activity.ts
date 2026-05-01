import type { ActivityMatch } from '@beat-em-all/types';

/**
 * Recent-activity seeds, indexed by team slug. The Home Feed Recent Activity rail
 * pulls from the active persona's primary team via getRecentActivityForTeam(slug).
 *
 * For Phase 1 we only have entries for `sandstorm` (Khaled's team). Other teams resolve
 * to an empty array, which intentionally exercises the empty state in the rail.
 */
export const RECENT_ACTIVITY_BY_TEAM: Record<string, ActivityMatch[]> = {
  sandstorm: [
    {
      id: 'act-snd-1',
      game: 'valorant',
      opponentLabel: 'Sandstorm vs Falcon Squad',
      scoreLabel: '13–9',
      result: 'W',
      relativeDate: '2d',
      isTournament: false,
      venueLabel: 'GG Arena · Salmiya',
    },
    {
      id: 'act-snd-2',
      game: 'eafc',
      opponentLabel: 'Sandstorm vs Desert Dragons',
      scoreLabel: '2–1',
      result: 'W',
      relativeDate: '5d',
      isTournament: true,
      venueLabel: 'Q-Mark · Farwaniya',
    },
    {
      id: 'act-snd-3',
      game: 'valorant',
      opponentLabel: 'Sandstorm vs Kingdom GG',
      scoreLabel: '11–13',
      result: 'L',
      relativeDate: '1w',
      isTournament: false,
      venueLabel: 'ARC Esports · Kuwait City',
    },
  ],
};

export function getRecentActivityForTeam(slug: string | null): ActivityMatch[] {
  if (!slug) return [];
  return RECENT_ACTIVITY_BY_TEAM[slug] ?? [];
}
