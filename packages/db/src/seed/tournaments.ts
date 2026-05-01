/**
 * Tournament seeds — mirrors `packages/mock-data/src/tournaments.ts`.
 *
 * 6 tournaments across `published`, `registration_open`, `in_progress` states. 4 owned by
 * KEC (sanctioned), 1 by Zain Kuwait (brand-funded), 1 by Hawally Hornets (community).
 */

import type { TournamentInsert } from '../schema/tournaments';

export type TournamentSeed = Omit<
  TournamentInsert,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'organizationId' | 'gameId' | 'createdByUserId'
> & {
  /** Reference to organizations.slug — resolved at seed time. */
  organizationSlug: string;
  /** Reference to games.slug — resolved at seed time. */
  gameSlug: string;
};

export const TOURNAMENT_SEEDS: TournamentSeed[] = [
  {
    slug: 'kec-spring-26',
    name: 'KEC Spring ’26',
    organizationSlug: 'kec',
    gameSlug: 'valorant',
    format: 'double_elimination',
    matchFormat: 'bo3',
    teamSize: 5,
    minTeams: 8,
    maxTeams: 32,
    isOfficialSanctioned: true,
    awardsRankingPoints: true,
    prizePoolKwd: 25000,
    startsInLabel: 'In progress · QF this week',
    registrationLabel: 'Registration closed',
    status: 'in_progress',
    description:
      "KEC's flagship spring 2026 Valorant championship. Sanctioned by the Kuwait Esports Club.",
  },
  {
    slug: 'kec-summer-series',
    name: 'KEC Summer Series',
    organizationSlug: 'kec',
    gameSlug: 'valorant',
    format: 'single_elimination',
    matchFormat: 'bo3',
    teamSize: 5,
    minTeams: 8,
    maxTeams: 16,
    isOfficialSanctioned: true,
    awardsRankingPoints: true,
    prizePoolKwd: 12000,
    startsInLabel: 'Starts in 32d',
    registrationLabel: 'Registration opens in 5d',
    status: 'published',
  },
  {
    slug: 'kec-tekken-trophy',
    name: 'KEC Tekken Trophy',
    organizationSlug: 'kec',
    gameSlug: 'tekken8',
    format: 'double_elimination',
    matchFormat: 'bo5',
    teamSize: 1,
    minTeams: 8,
    maxTeams: 32,
    isOfficialSanctioned: true,
    awardsRankingPoints: true,
    prizePoolKwd: 4000,
    startsInLabel: 'Starts in 12d',
    registrationLabel: 'Registration open · 14 / 32 teams',
    status: 'registration_open',
  },
  {
    slug: 'kec-mobile-showdown',
    name: 'KEC Mobile Showdown',
    organizationSlug: 'kec',
    gameSlug: 'codm',
    format: 'single_elimination',
    matchFormat: 'bo3',
    teamSize: 5,
    minTeams: 8,
    maxTeams: 16,
    isOfficialSanctioned: true,
    awardsRankingPoints: true,
    prizePoolKwd: 1500,
    startsInLabel: 'Live · Group stage day 2',
    registrationLabel: 'Registration closed',
    status: 'in_progress',
  },
  {
    slug: 'zain-dxe-eafc-cup',
    name: 'Zain × DXE EAFC Cup',
    organizationSlug: 'zain-kuwait',
    gameSlug: 'eafc',
    format: 'single_elimination',
    matchFormat: 'bo3',
    teamSize: 1,
    minTeams: 16,
    maxTeams: 64,
    isOfficialSanctioned: false,
    awardsRankingPoints: false,
    prizePoolKwd: 2000,
    startsInLabel: 'Starts in 8d',
    registrationLabel: 'Registration open · 22 / 64 players',
    status: 'registration_open',
  },
  {
    slug: 'hawally-hornets-open',
    name: 'Hawally Hornets Open',
    organizationSlug: 'beat-em-all-admin',
    gameSlug: 'codm',
    format: 'single_elimination',
    matchFormat: 'bo3',
    teamSize: 5,
    minTeams: 4,
    maxTeams: 16,
    isOfficialSanctioned: false,
    awardsRankingPoints: false,
    prizePoolKwd: 0,
    startsInLabel: 'Starts in 21d',
    registrationLabel: 'Registration opens in 3d',
    status: 'published',
  },
];
