import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Ban, Gamepad2, MapPin, PencilLine, ShieldCheck, UserPlus, Users } from 'lucide-react';
import {
  Button,
  EmptyState,
  MatchCard,
  Notice,
  ProfileHeader,
  SectionTitle,
  Tag,
  TeamCrest,
  buttonClass,
} from '@beat-em-all/ui';
import {
  isTeamLeaderRole,
  latestRankingSeason,
  listPendingTeamInvites,
  listTeamResults,
  listTeamRoster,
  loadTeamBySlug,
  loadTeamRankings,
  type TeamResult,
  type TeamRankings,
} from '@beat-em-all/db/queries';
import { GAMES } from '@beat-em-all/mock-data';
import { ResultsCard, type ResultsCardGroup } from '@/components/cards/ResultsCard';
import { ScoreboardCard } from '@/components/cards/ScoreboardCard';
import { StandingsCard } from '@/components/cards/StandingsCard';
import { ChallengeButton } from '@/components/challenge/ChallengeButton';
import { InvitePanel } from '@/components/team/InvitePanel';
import { LeaveTeamButton } from '@/components/team/LeaveTeamButton';
import { TeamRosterPanel } from '@/components/team/TeamRosterPanel';
import { dateLocale } from '@/components/booking/format';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

/** The federation whose ranking the team page shows, same default as /rankings. */
const RANKING_ORG = 'kec';

async function loadRanking(): Promise<TeamRankings | null> {
  const season = await latestRankingSeason(RANKING_ORG);
  if (!season) return null;
  return loadTeamRankings({ season, organizationSlug: RANKING_ORG, gameSlug: null });
}

/** Mock labels sometimes carry a pictograph prefix (e.g. a pin); the UI uses Lucide icons only. */
function stripPictographs(s: string): string {
  return s.replace(/\p{Extended_Pictographic}️?\s*/gu, '').trim();
}

export default async function TeamPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Identity, games, status and roster come from Postgres; stats / badges / upcoming match
  // are a mock overlay for seeded teams until match history is modelled.
  const team = await loadTeamBySlug(slug);
  if (!team) notFound();

  const [t, tr, tc, trk, me, roster, results, ranking] = await Promise.all([
    getTranslations('team'),
    getTranslations('roster'),
    getTranslations('cards'),
    getTranslations('rankings'),
    getCurrentUser().catch(() => null),
    listTeamRoster(team.id),
    // Results and ranking are extras: a failure hides the card, never the team page.
    listTeamResults([team.id], 6).catch((): TeamResult[] => []),
    loadRanking().catch(() => null),
  ]);

  const disbanded = team.disbandedAt !== null;
  const myRow = me ? roster.find((m) => m.playerId === me.playerId) : undefined;
  const myRole = !disbanded && myRow ? myRow.role : null;
  const isLeader = isTeamLeaderRole(myRole);
  const invites = isLeader ? await listPendingTeamInvites(team.id) : [];

  const date = new Intl.DateTimeFormat(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuwait',
  });

  const ratingDeltaSign = team.stats.ratingDelta30d >= 0 ? '+' : '';
  const ratingDelta = `${ratingDeltaSign}${team.stats.ratingDelta30d}`;

  // Status tags: verification, streak and recruiting come from structured data; any other
  // free-form badge from the overlay is shown as a neutral tag.
  const isVerified = team.badges.some((b) => b.label.toLowerCase() === 'verified');
  const extraBadges = team.badges.filter(
    (b) => !/^(verified|recruiting)$/i.test(b.label) && !/streak/i.test(b.label),
  );
  const streak = team.stats.streak;

  const tags = disbanded ? (
    <Tag tone="outline" icon={<Ban className="bx-icon" aria-hidden />}>
      {tr('disbandedTag')}
    </Tag>
  ) : (
    <>
      {isVerified && (
        <Tag tone="org" icon={<ShieldCheck className="bx-icon" aria-hidden />}>
          {t('verified')}
        </Tag>
      )}
      {streak.count > 0 && (
        <Tag tone="soft">
          {streak.streakType === 'W'
            ? t('streakWin', { count: streak.count })
            : t('streakLoss', { count: streak.count })}
        </Tag>
      )}
      {team.recruiting && <Tag>{t('recruiting')}</Tag>}
      {extraBadges.map((b) => (
        <Tag key={b.label}>{b.label}</Tag>
      ))}
    </>
  );

  const gameNames = team.games.map((g) => GAMES[g]?.title ?? g).join(' · ');
  const meta = [
    ...(team.city || team.country
      ? [
          {
            icon: <MapPin className="bx-icon" aria-hidden />,
            text: team.city
              ? t('location', { city: team.city, country: team.country })
              : team.country,
          },
        ]
      : []),
    ...(gameNames ? [{ icon: <Gamepad2 className="bx-icon" aria-hidden />, text: gameNames }] : []),
    {
      icon: <Users className="bx-icon" aria-hidden />,
      text: t('membersCount', { count: roster.length }),
    },
  ];

  const actions = disbanded ? undefined : (
    <>
      {!myRole && (
        <ChallengeButton
          targetTeamSlug={team.slug}
          targetTeamName={team.name}
          targetTeamGames={team.games}
          gameLabels={Object.fromEntries(team.games.map((g) => [g, GAMES[g]?.shortName ?? g]))}
        />
      )}
      {!myRole && team.recruiting && (
        <Button variant="ink">
          <UserPlus className="bx-icon" aria-hidden />
          {t('applyToJoin')}
        </Button>
      )}
      {isLeader && (
        <Link
          href={`/${locale}/teams/${team.slug}/edit`}
          className={buttonClass('ink')}
          data-testid="edit-team"
        >
          <PencilLine className="bx-icon" aria-hidden />
          {tr('editTeamCta')}
        </Link>
      )}
    </>
  );

  const upcoming = team.upcomingMatch;

  const teamHref = (s: string) => `/${locale}/teams/${s}`;
  const tourHref = (s: string) => `/${locale}/tournaments/${s}`;
  const lastResult = results[0];
  const resultGroups: ResultsCardGroup[] = [];
  for (const r of results) {
    const title = r.tournament?.name ?? tc('challenges');
    let group = resultGroups.find((g) => g.title === title);
    if (!group) {
      group = { title, href: r.tournament ? tourHref(r.tournament.slug) : undefined, events: [] };
      resultGroups.push(group);
    }
    group.events.push({
      id: r.matchId,
      home: {
        name: r.home.name,
        tag: r.home.tag,
        color: r.home.accentColor,
        score: r.home.score,
        href: teamHref(r.home.slug),
      },
      away: {
        name: r.away.name,
        tag: r.away.tag,
        color: r.away.accentColor,
        score: r.away.score,
        href: teamHref(r.away.slug),
      },
      note: r.playedAt ? date.format(r.playedAt) : undefined,
    });
  }

  // Top five of the federation ranking, plus this team's own row when it sits lower.
  const rankRows = ranking?.rows ?? [];
  const mine = rankRows.find((r) => r.teamId === team.id);
  const shownRows = rankRows.slice(0, 5);
  if (mine && !shownRows.includes(mine)) shownRows.push(mine);
  const rankingName = ranking?.organization?.name ?? RANKING_ORG.toUpperCase();
  // "2026-autumn" → "Autumn 2026", the same wording as /rankings.
  const [seasonYear, seasonTerm] = (ranking?.season ?? '').split('-');
  const seasonLabel =
    seasonTerm && ['spring', 'summer', 'autumn', 'winter'].includes(seasonTerm)
      ? trk('seasonLabel', { term: trk(`term.${seasonTerm}`), year: seasonYear ?? '' })
      : (ranking?.season ?? '');

  return (
    <main className="bx-page">
      {disbanded && team.disbandedAt ? (
        <div data-testid="disbanded-notice">
          <Notice tone="neutral" icon={<Ban className="bx-icon" aria-hidden />}>
            {tr('disbandedNotice', { date: date.format(new Date(team.disbandedAt)) })}
          </Notice>
        </div>
      ) : null}

      <ProfileHeader
        mark={<TeamCrest tag={team.tag} color={team.accentColor} size={120} />}
        name={team.name}
        tags={tags}
        meta={meta}
        bio={team.bio ? <span dir="auto">{team.bio}</span> : undefined}
        actions={actions}
        stats={[
          { label: t('statTrophies'), value: team.stats.trophies.toLocaleString('en-US') },
          { label: t('statMatches'), value: team.stats.totalMatches.toLocaleString('en-US') },
          { label: t('statWinRate'), value: `${team.stats.winRate}%`, tone: 'gold' },
          {
            label: t('statRatingWithDelta', { delta: ratingDelta }),
            value: team.stats.rating.toLocaleString('en-US'),
            tone: 'gold',
          },
        ]}
      />

      <div className="bx-two">
        <section className="bx-stack min-w-0" aria-labelledby="team-matches">
          <SectionTitle id="team-matches" title={t('matchHistory')} eyebrow={t('upcoming')} />
          {upcoming ? (
            <MatchCard
              home={{
                name: team.name,
                crest: { tag: team.tag, color: team.accentColor },
                sub: team.city || team.country,
              }}
              away={{
                name: upcoming.opponent.name,
                crest: { tag: upcoming.opponent.tag, color: upcoming.opponent.accentColor },
                sub: upcoming.opponent.country,
              }}
              game={team.games[0] ? (GAMES[team.games[0]]?.title ?? team.games[0]) : undefined}
              when={upcoming.startsInLabel}
              round={upcoming.contextLabel}
              venue={stripPictographs(upcoming.venueLabel)}
              vsLabel={t('vs')}
              status={
                upcoming.statusPill ? <Tag tone="gold">{upcoming.statusPill}</Tag> : undefined
              }
            />
          ) : (
            <EmptyState title={t('upcomingEmptyTitle')} body={t('noUpcomingMatch')} />
          )}
          {lastResult ? (
            <div className="bx-stack" data-testid="team-last-result">
              <span className="bx-eyebrow">{t('lastResult')}</span>
              <ScoreboardCard
                home={{
                  name: lastResult.home.name,
                  tag: lastResult.home.tag,
                  color: lastResult.home.accentColor,
                  score: lastResult.home.score,
                  href: teamHref(lastResult.home.slug),
                }}
                away={{
                  name: lastResult.away.name,
                  tag: lastResult.away.tag,
                  color: lastResult.away.accentColor,
                  score: lastResult.away.score,
                  href: teamHref(lastResult.away.slug),
                }}
                competition={lastResult.tournament?.name ?? tc('challenges')}
                competitionHref={
                  lastResult.tournament ? tourHref(lastResult.tournament.slug) : undefined
                }
                when={lastResult.playedAt ? date.format(lastResult.playedAt) : undefined}
                status={tc('statusFinal')}
                vs={tc('vs')}
              />
            </div>
          ) : null}
        </section>

        <section className="bx-stack min-w-0" aria-labelledby="team-roster">
          <SectionTitle
            id="team-roster"
            title={t('rosterTitle')}
            eyebrow={t('rosterCount', { count: roster.length })}
          />
          {disbanded ? (
            <EmptyState title={tr('disbandedRosterTitle')} body={tr('disbandedRosterBody')} />
          ) : (
            <TeamRosterPanel
              locale={locale}
              teamSlug={team.slug}
              members={roster.map((m) => ({
                playerSlug: m.playerSlug,
                displayName: m.displayName,
                role: m.role,
                inGameRole: m.inGameRole,
              }))}
              viewerRole={myRole}
              viewerSlug={me?.playerSlug ?? null}
            />
          )}
          {myRole ? <LeaveTeamButton teamSlug={team.slug} teamName={team.name} /> : null}
        </section>
      </div>

      <div className="bx-two">
        <section
          className="bx-stack min-w-0"
          aria-labelledby="team-results"
          data-testid="team-results"
        >
          <SectionTitle id="team-results" title={t('resultsTitle')} />
          {resultGroups.length > 0 ? (
            <ResultsCard groups={resultGroups} />
          ) : (
            <EmptyState title={t('resultsEmptyTitle')} body={t('resultsEmptyBody')} />
          )}
        </section>

        {ranking && shownRows.length > 0 ? (
          <section
            className="bx-stack min-w-0"
            aria-labelledby="team-ranking"
            data-testid="team-ranking"
          >
            <SectionTitle
              id="team-ranking"
              title={t('rankingTitle', { org: rankingName })}
              actions={
                <Link href={`/${locale}/rankings`} className="bx-label text-gold-text no-underline">
                  {t('rankingLink')}
                </Link>
              }
            />
            <StandingsCard
              title={
                mine
                  ? t('rankingSub', { season: seasonLabel, team: team.name, rank: mine.rank })
                  : t('rankingSubUnranked', { season: seasonLabel, team: team.name })
              }
              rows={shownRows.map((r) => ({
                id: r.teamId,
                rank: r.rank,
                delta: r.delta,
                name: r.name,
                tag: r.tag,
                color: r.accentColor,
                sub: r.city,
                points: r.points,
                medals: r.medals,
                events: r.tournaments,
                href: teamHref(r.slug),
                highlight: r.teamId === team.id,
              }))}
              labels={{
                team: tc('standings.team'),
                events: tc('standings.events'),
                medals: tc('standings.medals'),
                points: tc('standings.points'),
                move: tc('standings.move'),
                up: (n) => tc('standings.up', { n }),
                down: (n) => tc('standings.down', { n }),
                same: tc('standings.same'),
              }}
            />
          </section>
        ) : null}
      </div>

      {isLeader ? (
        <section className="bx-stack" aria-labelledby="team-invites">
          <SectionTitle id="team-invites" title={tr('invitesTitle')} />
          <InvitePanel
            teamSlug={team.slug}
            invites={invites.map((i) => ({
              playerSlug: i.playerSlug,
              displayName: i.displayName,
              expiresLabel: date.format(i.expiresAt),
            }))}
          />
        </section>
      ) : null}
    </main>
  );
}
