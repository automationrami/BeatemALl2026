import type { GameId } from './game';

export type TeamRole = 'captain' | 'co_captain' | 'starter' | 'sub' | 'coach';

export type TeamMember = {
  /** Player slug — links to /players/[slug]. */
  playerSlug: string;
  displayName: string;
  /** In-game role label, free-form, e.g. "AWP", "IGL", "Striker". */
  inGameRole: string;
  role: TeamRole;
  /** Individual rating on the active game. */
  rating: number;
  /** Avatar accent colour. */
  avatarColor: string;
};

export type TeamStats = {
  /** Win rate over the last 90 days, 0–100. */
  winRate: number;
  totalMatches: number;
  trophies: number;
  /** Aggregate team rating (Elo-style). */
  rating: number;
  /** Rating delta over last 30 days. */
  ratingDelta30d: number;
  /** Current streak (positive integer, with W/L tag). */
  streak: { count: number; streakType: 'W' | 'L' };
};

export type UpcomingMatch = {
  /** Tournament name or ladder, e.g. "KEC Spring '26 · QF M2". Empty for casual challenges. */
  contextLabel: string;
  /** ISO time-from-now label, e.g. "in 2d 14h". */
  startsInLabel: string;
  opponent: {
    /** Short tag, e.g. "FAZ". */
    tag: string;
    /** Full team display name. */
    name: string;
    country: string;
    /** Hex accent for the opposing crest. */
    accentColor: string;
  };
  /** Venue display label like "GG Arena · Salmiya · 7:00 PM". */
  venueLabel: string;
  /** Status pill text, e.g. "QF". Optional. */
  statusPill?: string;
};

export type Team = {
  id: string;
  slug: string;
  /** Short tag, 2–6 chars, e.g. "SND". */
  tag: string;
  name: string;
  country: string;
  city: string;
  /** Hex colour used for the team crest gradient. */
  accentColor: string;
  /** Active games this team competes in. */
  games: GameId[];
  /** Whether the team is currently looking for new members. */
  recruiting: boolean;
  /** Free-form bio, max ~160 chars. */
  bio: string;
  joinedLabel: string;
  badges: { label: string; tone?: 'violet' | 'amber' | 'lime' | 'coral' | 'cyan' }[];
  members: TeamMember[];
  stats: TeamStats;
  upcomingMatch: UpcomingMatch | null;
};
