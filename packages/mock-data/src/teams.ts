import type { Team } from '@beat-em-all/types';

const SANDSTORM: Team = {
  id: 'team-sandstorm',
  slug: 'sandstorm',
  tag: 'SND',
  name: 'Sandstorm',
  country: 'KW',
  city: 'Salmiya',
  accentColor: '#8B5CF6',
  games: ['valorant', 'eafc'],
  recruiting: false,
  bio: 'Founded 2024. Valorant + EAFC. Currently chasing the KEC Spring ’26 trophy.',
  joinedLabel: 'Mar 2024',
  badges: [
    { label: 'Verified', tone: 'violet' },
    { label: 'W7 streak', tone: 'lime' },
    { label: '#3 KW · VAL', tone: 'cyan' },
  ],
  members: [
    {
      playerSlug: 'khaled-al-mutairi',
      displayName: 'Khaled Al-Mutairi',
      inGameRole: 'IGL',
      role: 'captain',
      rating: 1842,
      avatarColor: '#8B5CF6',
    },
    {
      playerSlug: 'saleh-al-mutairi',
      displayName: 'Saleh Al-Mutairi',
      inGameRole: 'Duelist',
      role: 'starter',
      rating: 1768,
      avatarColor: '#22D3EE',
    },
    {
      playerSlug: 'bader-al-sabah',
      displayName: 'Bader Al-Sabah',
      inGameRole: 'Initiator',
      role: 'starter',
      rating: 1721,
      avatarColor: '#FB7185',
    },
    {
      playerSlug: 'yousef-al-ajmi',
      displayName: 'Yousef Al-Ajmi',
      inGameRole: 'Sentinel',
      role: 'starter',
      rating: 1693,
      avatarColor: '#BEF264',
    },
    {
      playerSlug: 'faisal-al-otaibi',
      displayName: 'Faisal Al-Otaibi',
      inGameRole: 'Controller',
      role: 'sub',
      rating: 1654,
      avatarColor: '#FBBF24',
    },
  ],
  stats: {
    winRate: 72,
    totalMatches: 89,
    trophies: 4,
    rating: 1842,
    ratingDelta30d: 38,
    streak: { count: 7, streakType: 'W' },
  },
  upcomingMatch: {
    contextLabel: 'KEC Spring ’26 · QF M2',
    startsInLabel: 'in 2d 14h',
    opponent: {
      tag: 'FAZ',
      name: 'Falcon Squad',
      country: 'KW',
      accentColor: '#22D3EE',
    },
    venueLabel: '📍 GG Arena · Salmiya · 7:00 PM',
    statusPill: 'QF',
  },
};

const FALCON_SQUAD: Team = {
  id: 'team-falcon-squad',
  slug: 'falcon-squad',
  tag: 'FAZ',
  name: 'Falcon Squad',
  country: 'KW',
  city: 'Hawally',
  accentColor: '#22D3EE',
  games: ['valorant'],
  recruiting: true,
  bio: 'Hawally-based Valorant outfit. Recruiting an Initiator main for KEC qualifiers.',
  joinedLabel: 'Jul 2024',
  badges: [
    { label: 'Verified', tone: 'violet' },
    { label: 'Recruiting', tone: 'lime' },
  ],
  members: [
    {
      playerSlug: 'mohammed-al-baker',
      displayName: 'Mohammed Al-Baker',
      inGameRole: 'IGL',
      role: 'captain',
      rating: 1761,
      avatarColor: '#22D3EE',
    },
    {
      playerSlug: 'turki-al-saleh',
      displayName: 'Turki Al-Saleh',
      inGameRole: 'Duelist',
      role: 'starter',
      rating: 1702,
      avatarColor: '#FB7185',
    },
    {
      playerSlug: 'ali-al-jasem',
      displayName: 'Ali Al-Jasem',
      inGameRole: 'Sentinel',
      role: 'starter',
      rating: 1655,
      avatarColor: '#BEF264',
    },
    {
      playerSlug: 'hamad-al-fadhli',
      displayName: 'Hamad Al-Fadhli',
      inGameRole: 'Controller',
      role: 'starter',
      rating: 1611,
      avatarColor: '#FBBF24',
    },
  ],
  stats: {
    winRate: 64,
    totalMatches: 42,
    trophies: 1,
    rating: 1761,
    ratingDelta30d: 12,
    streak: { count: 2, streakType: 'W' },
  },
  upcomingMatch: {
    contextLabel: 'KEC Spring ’26 · QF M2',
    startsInLabel: 'in 2d 14h',
    opponent: {
      tag: 'SND',
      name: 'Sandstorm',
      country: 'KW',
      accentColor: '#8B5CF6',
    },
    venueLabel: '📍 GG Arena · Salmiya · 7:00 PM',
    statusPill: 'QF',
  },
};

const DESERT_DRAGONS: Team = {
  id: 'team-desert-dragons',
  slug: 'desert-dragons',
  tag: 'DRG',
  name: 'Desert Dragons',
  country: 'KSA',
  city: 'Riyadh',
  accentColor: '#FB7185',
  games: ['eafc'],
  recruiting: false,
  bio: 'Riyadh’s most consistent EAFC roster. Three back-to-back DXE Fuel ladders.',
  joinedLabel: 'Sep 2024',
  badges: [{ label: 'Verified', tone: 'violet' }],
  members: [
    {
      playerSlug: 'sultan-al-rasheed',
      displayName: 'Sultan Al-Rasheed',
      inGameRole: 'Striker',
      role: 'captain',
      rating: 1620,
      avatarColor: '#FB7185',
    },
    {
      playerSlug: 'majed-al-otaibi',
      displayName: 'Majed Al-Otaibi',
      inGameRole: 'Midfielder',
      role: 'starter',
      rating: 1560,
      avatarColor: '#A78BFA',
    },
    {
      playerSlug: 'abdullah-al-zahrani',
      displayName: 'Abdullah Al-Zahrani',
      inGameRole: 'Defender',
      role: 'starter',
      rating: 1502,
      avatarColor: '#22D3EE',
    },
  ],
  stats: {
    winRate: 58,
    totalMatches: 34,
    trophies: 0,
    rating: 1620,
    ratingDelta30d: -6,
    streak: { count: 1, streakType: 'L' },
  },
  upcomingMatch: null,
};

export const TEAMS: Record<string, Team> = {
  sandstorm: SANDSTORM,
  'falcon-squad': FALCON_SQUAD,
  'desert-dragons': DESERT_DRAGONS,
};

export const TEAMS_LIST: Team[] = Object.values(TEAMS);

export function getTeamBySlug(slug: string): Team | null {
  return TEAMS[slug] ?? null;
}
