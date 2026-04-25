import type { PlayerProfile } from '@beat-em-all/types';

const ACHIEVEMENT_SEED: Omit<PlayerProfile['achievements'][number], 'id' | 'unlocked'>[] = [
  { name: 'First Win', glyph: '★', color: '#FBBF24' },
  { name: 'First Tournament', glyph: '✦', color: '#8B5CF6' },
  { name: 'Top 3 Finish', glyph: '◆', color: '#FB7185' },
  { name: 'Win Streak (5)', glyph: '▲', color: '#BEF264' },
  { name: 'Clutch Master', glyph: '●', color: '#22D3EE' },
  { name: 'KEC Qualifier', glyph: '✱', color: '#FBBF24' },
  { name: 'MVP of Match', glyph: '◉', color: '#A78BFA' },
  { name: 'Hat-trick Day', glyph: '⬢', color: '#22D3EE' },
  { name: 'Dust2 Master', glyph: '◇', color: '#FB7185' },
  { name: 'Comeback Win', glyph: '✶', color: '#BEF264' },
  { name: 'Tournament Winner', glyph: '♛', color: '#FBBF24' },
  { name: 'Sanctioned Veteran', glyph: '✸', color: '#A78BFA' },
];

function makeAchievements(unlockedCount: number): PlayerProfile['achievements'] {
  return ACHIEVEMENT_SEED.map((seed, i) => ({
    id: `ach-${i + 1}`,
    ...seed,
    unlocked: i < unlockedCount,
  }));
}

/**
 * Khaled — the canonical "rich data" persona. Every other persona mirrors this shape with
 * sparser numbers so empty-states stay reachable.
 */
const KHALED: PlayerProfile = {
  personaId: 'khaled',
  displayName: 'Khaled Al-Mutairi',
  slug: 'khaled-al-mutairi',
  bio: 'Valorant IGL · Sandstorm captain · KEC Spring ’26 finalist. Clutch is a habit.',
  country: 'KW',
  city: 'Salmiya',
  joinedLabel: 'Mar 2024',
  handle: '@khaled_kw',
  civilIdVerified: true,
  avatarColor: '#8B5CF6',
  games: ['valorant', 'eafc'],
  badges: [
    { label: 'Verified', tone: 'violet' },
    { label: '★ KEC Sanctioned', tone: 'amber' },
    { label: 'Captain · Sandstorm' },
  ],
  stats: {
    winRate90d: 68,
    rating: 1842,
    ratingDelta30d: 38,
    totalMatches: 127,
    wins: 86,
    losses: 41,
    currentStreak: { count: 7, streakType: 'W' },
    recentResults: ['W', 'W', 'L', 'W', 'W', 'W'],
    prizeWonKWD: 1200,
    tournamentsWon: 1,
    top3Finishes: 4,
  },
  pentagon: {
    game: 'valorant',
    axes: [
      { label: 'AIM', value: 84 },
      { label: 'GAME', value: 72 },
      { label: 'TEAM', value: 90 },
      { label: 'CLUTCH', value: 62 },
      { label: 'CONS.', value: 78 },
    ],
    overallRating: 7.6,
    sampleSize: 30,
  },
  recentMatches: [
    {
      id: 'm-1',
      game: 'valorant',
      opponentLabel: 'Sandstorm vs Falcon Squad',
      scoreLabel: '13–9',
      result: 'W',
      relativeDate: '2d',
      isTournament: false,
    },
    {
      id: 'm-2',
      game: 'eafc',
      opponentLabel: 'Sandstorm vs Desert Dragons',
      scoreLabel: '2–1',
      result: 'W',
      relativeDate: '5d',
      isTournament: true,
    },
    {
      id: 'm-3',
      game: 'valorant',
      opponentLabel: 'Sandstorm vs Kingdom GG',
      scoreLabel: '11–13',
      result: 'L',
      relativeDate: '1w',
      isTournament: false,
    },
    {
      id: 'm-4',
      game: 'valorant',
      opponentLabel: 'Sandstorm vs Elite KW',
      scoreLabel: '13–6',
      result: 'W',
      relativeDate: '2w',
      isTournament: false,
    },
    {
      id: 'm-5',
      game: 'eafc',
      opponentLabel: 'Sandstorm vs Phoenix',
      scoreLabel: '3–1',
      result: 'W',
      relativeDate: '3w',
      isTournament: false,
    },
  ],
  achievements: makeAchievements(8),
  linkedAccounts: [
    { provider: 'riot', externalId: 'KHL#KWT', rankLabel: 'Immortal 2', lastSync: '1h ago' },
    { provider: 'steam', externalId: '@khaled_kw', rankLabel: 'LE · 13,400', lastSync: '2m ago' },
  ],
};

const SARA: PlayerProfile = {
  personaId: 'sara',
  displayName: 'Sara Al-Awadhi',
  slug: 'sara-al-awadhi',
  bio: 'PUBG Mobile squad lead · Hawally · Women-only league regular.',
  country: 'KW',
  city: 'Hawally',
  joinedLabel: 'Nov 2024',
  handle: '@sara_kw',
  civilIdVerified: false,
  avatarColor: '#FB7185',
  games: ['codm'],
  badges: [{ label: 'Recruiting', tone: 'lime' }],
  stats: {
    winRate90d: 54,
    rating: 1402,
    ratingDelta30d: 18,
    totalMatches: 32,
    wins: 17,
    losses: 15,
    currentStreak: { count: 2, streakType: 'W' },
    recentResults: ['W', 'W', 'L', 'L', 'W', 'L'],
    prizeWonKWD: 0,
    tournamentsWon: 0,
    top3Finishes: 0,
  },
  pentagon: {
    game: 'codm',
    axes: [
      { label: 'AIM', value: 64 },
      { label: 'MOVE', value: 71 },
      { label: 'SENSE', value: 60 },
      { label: 'MAP', value: 55 },
      { label: 'ADAPT', value: 68 },
    ],
    overallRating: 5.1,
    sampleSize: 12,
  },
  recentMatches: [
    {
      id: 's-1',
      game: 'codm',
      opponentLabel: 'Hawally Hornets vs Salmiya Stars',
      scoreLabel: '38–32',
      result: 'W',
      relativeDate: '1d',
      isTournament: false,
    },
    {
      id: 's-2',
      game: 'codm',
      opponentLabel: 'Hawally Hornets vs Doha Drift',
      scoreLabel: '41–39',
      result: 'W',
      relativeDate: '4d',
      isTournament: false,
    },
  ],
  achievements: makeAchievements(2),
  linkedAccounts: [],
};

const AHMAD: PlayerProfile = {
  personaId: 'ahmad',
  displayName: 'Ahmad Al-Rashed',
  slug: 'ahmad-al-rashed',
  bio: 'KEC Tournament Manager. Runs sanctioned Valorant, EAFC, and Tekken cups across Kuwait.',
  country: 'KW',
  city: 'Kuwait City',
  joinedLabel: 'Jun 2023',
  handle: '@ahmad_kec',
  civilIdVerified: true,
  avatarColor: '#22D3EE',
  games: [],
  badges: [
    { label: 'Verified', tone: 'violet' },
    { label: 'KEC Staff', tone: 'cyan' },
  ],
  stats: {
    winRate90d: 0,
    rating: 0,
    ratingDelta30d: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    currentStreak: { count: 0, streakType: 'W' },
    recentResults: [],
    prizeWonKWD: 0,
    tournamentsWon: 0,
    top3Finishes: 0,
  },
  pentagon: {
    game: 'valorant',
    axes: [
      { label: 'AIM', value: 0 },
      { label: 'GAME', value: 0 },
      { label: 'TEAM', value: 0 },
      { label: 'CLUTCH', value: 0 },
      { label: 'CONS.', value: 0 },
    ],
    overallRating: 0,
    sampleSize: 0,
  },
  recentMatches: [],
  achievements: makeAchievements(0),
  linkedAccounts: [],
};

const OMAR: PlayerProfile = {
  personaId: 'omar',
  displayName: 'Omar Al-Saud',
  slug: 'omar-al-saud',
  bio: 'DXE Fuel owner · Riyadh · EAFC casual. Books, doesn’t play — mostly.',
  country: 'KSA',
  city: 'Riyadh',
  joinedLabel: 'Jan 2024',
  handle: '@dxefuel',
  civilIdVerified: true,
  avatarColor: '#BEF264',
  games: ['eafc'],
  badges: [
    { label: 'Venue Owner', tone: 'lime' },
    { label: 'Verified', tone: 'violet' },
  ],
  stats: {
    winRate90d: 47,
    rating: 1180,
    ratingDelta30d: -4,
    totalMatches: 18,
    wins: 8,
    losses: 10,
    currentStreak: { count: 1, streakType: 'L' },
    recentResults: ['L', 'W', 'W', 'L', 'L', 'L'],
    prizeWonKWD: 0,
    tournamentsWon: 0,
    top3Finishes: 0,
  },
  pentagon: {
    game: 'eafc',
    axes: [
      { label: 'ATK', value: 58 },
      { label: 'DEF', value: 42 },
      { label: 'POS', value: 50 },
      { label: 'SET', value: 35 },
      { label: 'COMP', value: 47 },
    ],
    overallRating: 4.3,
    sampleSize: 8,
  },
  recentMatches: [
    {
      id: 'o-1',
      game: 'eafc',
      opponentLabel: 'Omar vs Khaled',
      scoreLabel: '1–3',
      result: 'L',
      relativeDate: '3d',
      isTournament: false,
    },
  ],
  achievements: makeAchievements(1),
  linkedAccounts: [],
};

const FATIMA: PlayerProfile = {
  personaId: 'fatima',
  displayName: 'Fatima Al-Mansour',
  slug: 'fatima-al-mansour',
  bio: 'Zain Kuwait marketing. Sponsors prize pools — one day I’ll qualify for one.',
  country: 'KW',
  city: 'Kuwait City',
  joinedLabel: 'Feb 2026',
  handle: '@fatima_zain',
  civilIdVerified: false,
  avatarColor: '#FBBF24',
  games: [],
  badges: [{ label: 'Brand', tone: 'amber' }],
  stats: {
    winRate90d: 0,
    rating: 0,
    ratingDelta30d: 0,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    currentStreak: { count: 0, streakType: 'W' },
    recentResults: [],
    prizeWonKWD: 0,
    tournamentsWon: 0,
    top3Finishes: 0,
  },
  pentagon: {
    game: 'valorant',
    axes: [
      { label: 'AIM', value: 0 },
      { label: 'GAME', value: 0 },
      { label: 'TEAM', value: 0 },
      { label: 'CLUTCH', value: 0 },
      { label: 'CONS.', value: 0 },
    ],
    overallRating: 0,
    sampleSize: 0,
  },
  recentMatches: [],
  achievements: makeAchievements(0),
  linkedAccounts: [],
};

export const PLAYER_PROFILES: Record<string, PlayerProfile> = {
  khaled: KHALED,
  sara: SARA,
  ahmad: AHMAD,
  omar: OMAR,
  fatima: FATIMA,
};

export function getPlayerProfileByPersona(personaId: string): PlayerProfile {
  return PLAYER_PROFILES[personaId] ?? KHALED;
}

export function getPlayerProfileBySlug(slug: string): PlayerProfile | null {
  return Object.values(PLAYER_PROFILES).find((p) => p.slug === slug) ?? null;
}
