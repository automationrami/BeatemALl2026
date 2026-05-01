import type { TournamentSummary } from '@beat-em-all/types';

/**
 * Phase 1 tournament seeds. Six entries spanning the three statuses the Home Feed surfaces:
 *   - registration_open  (KEC Spring '26, KEC Tekken Trophy, Zain × DXE EAFC Cup)
 *   - in_progress        (KEC Mobile Showdown)
 *   - published          (KEC Summer Series, Hawally Hornets Open)
 *
 * Two tournaments are flagged `isSanctioned: true` and own-by KEC — these get the cyan accent
 * and appear with a thin cyan left border per FED-1 visual language.
 */
export const TOURNAMENTS: Record<string, TournamentSummary> = {
  'kec-spring-26': {
    id: 'tour-kec-spring-26',
    slug: 'kec-spring-26',
    name: 'KEC Spring ’26',
    game: 'valorant',
    status: 'in_progress',
    startsInLabel: 'In progress · QF this week',
    registrationLabel: 'Registration closed',
    prizePoolKWD: 25000,
    isSanctioned: true,
    organizer: 'Kuwait Esports Club',
    organizerAccent: '#22D3EE',
    country: 'KW',
    coverImageUrl: null,
  },

  'kec-summer-series': {
    id: 'tour-kec-summer-series',
    slug: 'kec-summer-series',
    name: 'KEC Summer Series',
    game: 'valorant',
    status: 'published',
    startsInLabel: 'Starts in 32d',
    registrationLabel: 'Registration opens in 5d',
    prizePoolKWD: 12000,
    isSanctioned: true,
    organizer: 'Kuwait Esports Club',
    organizerAccent: '#22D3EE',
    country: 'KW',
    coverImageUrl: null,
  },

  'kec-tekken-trophy': {
    id: 'tour-kec-tekken-trophy',
    slug: 'kec-tekken-trophy',
    name: 'KEC Tekken Trophy',
    game: 'tekken8',
    status: 'registration_open',
    startsInLabel: 'Starts in 12d',
    registrationLabel: 'Registration open · 14 / 32 teams',
    prizePoolKWD: 4000,
    isSanctioned: true,
    organizer: 'Kuwait Esports Club',
    organizerAccent: '#22D3EE',
    country: 'KW',
    coverImageUrl: null,
  },

  'kec-mobile-showdown': {
    id: 'tour-kec-mobile-showdown',
    slug: 'kec-mobile-showdown',
    name: 'KEC Mobile Showdown',
    game: 'codm',
    status: 'in_progress',
    startsInLabel: 'Live · Group stage day 2',
    registrationLabel: 'Registration closed',
    prizePoolKWD: 1500,
    isSanctioned: true,
    organizer: 'Kuwait Esports Club',
    organizerAccent: '#22D3EE',
    country: 'KW',
    coverImageUrl: null,
  },

  'zain-dxe-eafc-cup': {
    id: 'tour-zain-dxe-eafc-cup',
    slug: 'zain-dxe-eafc-cup',
    name: 'Zain × DXE EAFC Cup',
    game: 'eafc',
    status: 'registration_open',
    startsInLabel: 'Starts in 8d',
    registrationLabel: 'Registration open · 22 / 64 players',
    prizePoolKWD: 2000,
    isSanctioned: false,
    organizer: 'Zain Kuwait',
    organizerAccent: '#A78BFA',
    country: 'KW',
    coverImageUrl: null,
  },

  'hawally-hornets-open': {
    id: 'tour-hawally-hornets-open',
    slug: 'hawally-hornets-open',
    name: 'Hawally Hornets Open',
    game: 'codm',
    status: 'published',
    startsInLabel: 'Starts in 21d',
    registrationLabel: 'Registration opens in 3d',
    prizePoolKWD: 0,
    isSanctioned: false,
    organizer: 'Hawally Hornets',
    organizerAccent: '#FBBF24',
    country: 'KW',
    coverImageUrl: null,
  },
};

export const TOURNAMENTS_LIST: TournamentSummary[] = Object.values(TOURNAMENTS);

export function getTournamentBySlug(slug: string): TournamentSummary | null {
  return TOURNAMENTS[slug] ?? null;
}
