/**
 * Tournament queries — DB-backed reads for the Tournaments list + detail surfaces.
 *
 * Returns the canonical `TournamentSummary` shape (plus the raw lifecycle status and start
 * date, which the public pages render labels from). Joins to `games` for the game slug and
 * to `organizations` for the organizer name + accent.
 *
 * Drafts are private to their organisation (TM-1 US-TM1.1): they never appear in the list
 * and the detail lookup only returns them to a member of the owning organisation.
 */

import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { GameId, TournamentStatus, TournamentSummary } from '@beat-em-all/types';
import type { CountryCode } from '@beat-em-all/types';
import {
  isPairingLocked,
  roundLabel,
  standings as bracketStandings,
  type RoundLabelKey,
} from '@beat-em-all/utils';
import { getDb } from '../client';
import { tournaments, type TournamentRow } from '../schema/tournaments';
import { games } from '../schema/games';
import { organizations } from '../schema/organizations';
import { memberships } from '../schema/memberships';
import { brackets, matchResults } from '../schema/brackets';
import { matches, type MatchRow } from '../schema/matches';
import { teams } from '../schema/teams';

const SURFACEABLE_STATUSES: TournamentRow['status'][] = [
  'published',
  'registration_open',
  'registration_closed',
  'in_progress',
];

/** Public summary: the shared shape plus the real lifecycle status and start time. */
export type PublicTournamentSummary = TournamentSummary & {
  /** Full status enum (`TournamentSummary.status` only models the surfaceable subset). */
  lifecycle: TournamentRow['status'];
  startsAt: Date | null;
  registrationClosesAt: Date | null;
  organizationId: string;
  organizationSlug: string;
  entryFeeKwd: number;
  teamSize: number;
  maxTeams: number;
  matchFormat: string;
  description: string | null;
  rulesUrl: string | null;
};

const summaryColumns = {
  id: tournaments.id,
  slug: tournaments.slug,
  name: tournaments.name,
  status: tournaments.status,
  startsInLabel: tournaments.startsInLabel,
  registrationLabel: tournaments.registrationLabel,
  prizePoolKwd: tournaments.prizePoolKwd,
  isOfficialSanctioned: tournaments.isOfficialSanctioned,
  startsAt: tournaments.startsAt,
  registrationClosesAt: tournaments.registrationClosesAt,
  entryFeeKwd: tournaments.entryFeeKwd,
  teamSize: tournaments.teamSize,
  maxTeams: tournaments.maxTeams,
  matchFormat: tournaments.matchFormat,
  description: tournaments.description,
  rulesUrl: tournaments.rulesUrl,
  gameSlug: games.slug,
  organizationId: organizations.id,
  organizationSlug: organizations.slug,
  organizerName: organizations.name,
  organizerAccent: organizations.accentColor,
  organizerCountry: organizations.countryCode,
  coverImageUrl: tournaments.coverImageUrl,
};

function summaryQuery() {
  return getDb()
    .select(summaryColumns)
    .from(tournaments)
    .innerJoin(games, eq(games.id, tournaments.gameId))
    .innerJoin(organizations, eq(organizations.id, tournaments.organizationId));
}

type SummaryRow = Awaited<ReturnType<typeof summaryQuery>>[number];

function toSummary(r: SummaryRow): PublicTournamentSummary {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    game: r.gameSlug as GameId,
    // The shared type only lists the surfaceable subset; `lifecycle` carries the real one.
    status: r.status as TournamentStatus,
    lifecycle: r.status,
    startsInLabel: r.startsInLabel ?? '',
    registrationLabel: r.registrationLabel ?? '',
    prizePoolKWD: r.prizePoolKwd,
    isSanctioned: r.isOfficialSanctioned,
    organizer: r.organizerName,
    organizerAccent: r.organizerAccent ?? '#A78BFA',
    country: r.organizerCountry as CountryCode,
    coverImageUrl: r.coverImageUrl,
    startsAt: r.startsAt,
    registrationClosesAt: r.registrationClosesAt,
    organizationId: r.organizationId,
    organizationSlug: r.organizationSlug,
    entryFeeKwd: r.entryFeeKwd,
    teamSize: r.teamSize,
    maxTeams: r.maxTeams,
    matchFormat: r.matchFormat,
    description: r.description,
    rulesUrl: r.rulesUrl,
  };
}

/** `organizationSlug` narrows to one organizer (matched by id, not by display name). */
export async function listSurfaceableTournaments(
  filter: { organizationSlug?: string } = {},
): Promise<PublicTournamentSummary[]> {
  const rows = await summaryQuery().where(
    and(
      inArray(tournaments.status, SURFACEABLE_STATUSES),
      isNull(tournaments.deletedAt),
      filter.organizationSlug ? eq(organizations.slug, filter.organizationSlug) : undefined,
    ),
  );

  return rows.map(toSummary);
}

/** Any accepted, unrevoked membership of the organisation (draft visibility). */
export async function isOrganizationMember(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId),
        isNull(memberships.revokedAt),
        isNotNull(memberships.acceptedAt),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * One tournament by slug, any status. Drafts come back only when `viewerUserId` belongs to
 * the owning organisation; everyone else gets null (a 404), same as a missing slug.
 */
export async function loadTournamentBySlug(
  slug: string,
  opts: { viewerUserId?: string | null } = {},
): Promise<PublicTournamentSummary | null> {
  const rows = await summaryQuery()
    .where(and(eq(tournaments.slug, slug), isNull(tournaments.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.status === 'draft') {
    if (!opts.viewerUserId) return null;
    if (!(await isOrganizationMember(opts.viewerUserId, row.organizationId))) return null;
  }
  return toSummary(row);
}

// ---------------------------------------------------------------------------------------
// Bracket read model (public page + organiser console)
// ---------------------------------------------------------------------------------------

export type BracketViewTeam = { id: string; slug: string; name: string; tag: string };

export type BracketViewSide = {
  team: BracketViewTeam | null;
  seed: number | null;
  bye: boolean;
  score: number | null;
  /** true = won, false = lost, null = undecided. */
  winner: boolean | null;
};

export type BracketViewMatch = {
  round: number;
  index: number;
  matchId: string | null;
  status: MatchRow['status'] | null;
  scheduledAt: Date | null;
  home: BracketViewSide;
  away: BracketViewSide;
  winnerTeamId: string | null;
  /** Both teams known, match created, no result yet. */
  playable: boolean;
  /** A result exists and the next match has been decided, so it can't be corrected. */
  locked: boolean;
  isBye: boolean;
};

export type BracketView = {
  bracketId: string;
  totalRounds: number;
  rounds: { index: number; label: RoundLabelKey; matches: BracketViewMatch[] }[];
  finalDecided: boolean;
  standings: {
    first: BracketViewTeam | null;
    second: BracketViewTeam | null;
    thirdFourth: BracketViewTeam[];
  };
};

/** The tournament's bracket with team names and scores, or null before it starts. */
export async function loadBracketView(tournamentId: string): Promise<BracketView | null> {
  const db = getDb();
  const [bracket] = await db
    .select()
    .from(brackets)
    .where(eq(brackets.tournamentId, tournamentId))
    .limit(1);
  if (!bracket) return null;
  const data = bracket.bracketData;

  const teamIds = new Set<string>();
  const matchIds: string[] = [];
  for (const round of data.rounds) {
    for (const p of round) {
      for (const s of p.slots) if (s.teamId) teamIds.add(s.teamId);
      if (p.matchId) matchIds.push(p.matchId);
    }
  }

  const [teamRows, matchRows, resultRows] = await Promise.all([
    teamIds.size
      ? db
          .select({ id: teams.id, slug: teams.slug, name: teams.name, tag: teams.tag })
          .from(teams)
          .where(inArray(teams.id, [...teamIds]))
      : Promise.resolve([]),
    matchIds.length
      ? db
          .select({ id: matches.id, status: matches.status, scheduledAt: matches.scheduledAt })
          .from(matches)
          .where(inArray(matches.id, matchIds))
      : Promise.resolve([]),
    matchIds.length
      ? db
          .select({
            matchId: matchResults.matchId,
            home: matchResults.homeTeamScore,
            away: matchResults.awayTeamScore,
          })
          .from(matchResults)
          .where(inArray(matchResults.matchId, matchIds))
      : Promise.resolve([]),
  ]);
  const teamById = new Map(teamRows.map((t) => [t.id, t]));
  const matchById = new Map(matchRows.map((m) => [m.id, m]));
  const resultByMatch = new Map(resultRows.map((r) => [r.matchId, r]));

  const team = (id: string | null) => (id ? (teamById.get(id) ?? null) : null);

  const rounds = data.rounds.map((round, r) => ({
    index: r,
    label: roundLabel(r, data.rounds.length),
    matches: round.map<BracketViewMatch>((p, i) => {
      const m = p.matchId ? matchById.get(p.matchId) : undefined;
      const res = p.matchId ? resultByMatch.get(p.matchId) : undefined;
      const side = (k: 0 | 1): BracketViewSide => {
        const s = p.slots[k];
        return {
          team: team(s.teamId),
          seed: s.seed,
          bye: !!s.bye,
          score: res ? (k === 0 ? res.home : res.away) : null,
          winner: p.winnerTeamId ? !!s.teamId && s.teamId === p.winnerTeamId : null,
        };
      };
      const both = !!p.slots[0].teamId && !!p.slots[1].teamId;
      return {
        round: r,
        index: i,
        matchId: p.matchId,
        status: m?.status ?? null,
        scheduledAt: m?.scheduledAt ?? null,
        home: side(0),
        away: side(1),
        winnerTeamId: p.winnerTeamId,
        playable: both && !!p.matchId && !p.winnerTeamId,
        locked: !!p.winnerTeamId && isPairingLocked(data, r, i),
        isBye: !!(p.slots[0].bye || p.slots[1].bye),
      };
    }),
  }));

  const st = bracketStandings(data);
  return {
    bracketId: bracket.id,
    totalRounds: data.rounds.length,
    rounds,
    finalDecided: !!st.first,
    standings: {
      first: team(st.first),
      second: team(st.second),
      thirdFourth: st.thirdFourth.map(team).filter((t): t is BracketViewTeam => !!t),
    },
  };
}
