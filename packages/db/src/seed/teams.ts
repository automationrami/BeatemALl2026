/**
 * Team seeds + team_members linking persona slugs to team roles.
 *
 * Mirrors `packages/mock-data/src/teams.ts` so the existing `/teams/[slug]` UI lights up
 * with real DB data. Each team's full mock roster (with non-persona members like Saleh,
 * Bader etc.) is overlaid by the hybrid query `loadTeamProfileBySlug` — only the persona
 * members are seeded as real `team_members` rows.
 */

import type { TeamInsert } from '../schema/teams';

export type TeamSeed = {
  /** TeamInsert without auto fields. */
  team: Omit<TeamInsert, 'id' | 'createdAt' | 'updatedAt'>;
  /** Game slugs the team competes in. First entry becomes `is_primary = true`. */
  gameSlugs: string[];
  /**
   * Members keyed by persona slug → role. We only seed the personas that exist in
   * `personas.ts`; the rest of the roster is overlaid from mock-data at read time.
   */
  members: {
    personaSlug: string;
    role: 'captain' | 'co_captain' | 'starter' | 'substitute' | 'coach' | 'manager';
    inGameRole?: string;
  }[];
};

export const TEAM_SEEDS: TeamSeed[] = [
  {
    team: {
      slug: 'sandstorm',
      name: 'Sandstorm',
      tag: 'SND',
      countryCode: 'KW',
      city: 'Salmiya',
      bio: 'Founded 2024. Valorant + EAFC. Currently chasing the KEC Spring ’26 trophy.',
      isPublic: true,
      isRecruiting: false,
      foundedAt: '2024-03-01',
    },
    gameSlugs: ['valorant', 'eafc'],
    members: [{ personaSlug: 'khaled-al-mutairi', role: 'captain', inGameRole: 'IGL' }],
  },
  {
    team: {
      slug: 'falcon-squad',
      name: 'Falcon Squad',
      tag: 'FAZ',
      countryCode: 'KW',
      city: 'Hawally',
      bio: 'Hawally-based Valorant outfit. Recruiting an Initiator main for KEC qualifiers.',
      isPublic: true,
      isRecruiting: true,
      foundedAt: '2024-07-01',
    },
    gameSlugs: ['valorant'],
    // No personas on this team — full roster comes from mock-data overlay.
    members: [],
  },
  {
    team: {
      slug: 'desert-dragons',
      name: 'Desert Dragons',
      tag: 'DRG',
      countryCode: 'KSA',
      city: 'Riyadh',
      bio: 'Riyadh’s most consistent EAFC roster. Three back-to-back DXE Fuel ladders.',
      isPublic: true,
      isRecruiting: false,
      foundedAt: '2024-09-01',
    },
    gameSlugs: ['eafc'],
    // No personas on this team — full roster comes from mock-data overlay.
    members: [],
  },
];
