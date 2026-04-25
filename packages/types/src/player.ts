import type { GameId } from './game';

/** Pentagon axes per game — game-specific 5-stat decomposition for the signature pentagon viz. */
export type PentagonAxis = {
  /** Short label shown inside the pentagon, e.g. "AIM", "TEAM", "CLUTCH". */
  label: string;
  /** 0–100. */
  value: number;
};

export type PentagonStats = {
  game: GameId;
  axes: [PentagonAxis, PentagonAxis, PentagonAxis, PentagonAxis, PentagonAxis];
  /** 0.0–10.0. Calculated from pentagon area in real impl; mock supplies it directly. */
  overallRating: number;
  /** How many matches feed this calc. */
  sampleSize: number;
};

export type PlayerStats = {
  /** Win rate over the last 90 days, 0–100. */
  winRate90d: number;
  /** Current Elo / rating value. */
  rating: number;
  /** Rating delta over the last 30 days. */
  ratingDelta30d: number;
  /** Total competitive matches played, all time. */
  totalMatches: number;
  wins: number;
  losses: number;
  /**
   * Current streak as a positive integer + a tag.
   * `streakType: 'W'` means N consecutive wins; `'L'` means N consecutive losses.
   */
  currentStreak: { count: number; streakType: 'W' | 'L' };
  /** Last 6 results, most-recent first, used by streak chips. */
  recentResults: ('W' | 'L')[];
  prizeWonKWD: number;
  tournamentsWon: number;
  top3Finishes: number;
};

export type MatchSummary = {
  id: string;
  /** Game played. */
  game: GameId;
  /** Display label like "NSR vs FAZ". */
  opponentLabel: string;
  /** Score string, e.g. "13-9", "2-1". */
  scoreLabel: string;
  /** Outcome from the active player's perspective. */
  result: 'W' | 'L' | 'D';
  /** Relative date label, e.g. "2d", "5d", "1w". */
  relativeDate: string;
  /** Whether this was a tournament match (vs a casual challenge). */
  isTournament: boolean;
};

export type Achievement = {
  id: string;
  name: string;
  /** Single-character glyph used in the badge tile (★, ✦, ◆, ▲, ●, ✱, etc.). */
  glyph: string;
  /** Hex color tinted into the badge gradient. */
  color: string;
  unlocked: boolean;
};

export type LinkedAccountProvider = 'steam' | 'riot' | 'psn' | 'xbox';

export type LinkedAccount = {
  provider: LinkedAccountProvider;
  /** Public display id, e.g. "@nsr_kw" or "NSR#KWT". */
  externalId: string;
  /** Per-provider rank label, e.g. "LE · 13,400" or "Immortal 2". */
  rankLabel?: string;
  /** Last sync, relative date label. */
  lastSync?: string;
};

export type PlayerProfile = {
  /** Stable persona / user id. */
  personaId: string;
  displayName: string;
  /** URL-safe public slug, e.g. "khaled-al-mutairi". */
  slug: string;
  /** Bio paragraph, max 160 chars. */
  bio: string;
  /** Country code (ISO-style alpha-2 used elsewhere). */
  country: string;
  city: string;
  joinedLabel: string;
  /** Public handle, e.g. "@khaled_kw". */
  handle: string;
  civilIdVerified: boolean;
  /** Avatar accent hex used for the initials gradient and the verified ring. */
  avatarColor: string;
  /** Active game IDs the player competes in. */
  games: GameId[];
  stats: PlayerStats;
  pentagon: PentagonStats;
  recentMatches: MatchSummary[];
  achievements: Achievement[];
  linkedAccounts: LinkedAccount[];
  /** Pills shown next to the name: "Captain · NSR", "★ KEC Sanctioned", etc. */
  badges: {
    label: string;
    tone?: 'violet' | 'amber' | 'lime' | 'coral' | 'cyan';
    /** When set, the badge renders as a link to this href (e.g. captain badge → team page). */
    href?: string;
  }[];
};
