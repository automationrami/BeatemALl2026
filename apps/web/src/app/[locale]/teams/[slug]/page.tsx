import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Gamepad2, MapPin, ShieldCheck, UserPlus, Users } from 'lucide-react';
import {
  Button,
  EmptyState,
  MatchCard,
  ProfileHeader,
  RosterList,
  SectionTitle,
  Tag,
  TeamCrest,
} from '@beat-em-all/ui';
import { loadTeamBySlug } from '@beat-em-all/db/queries';
import { GAMES } from '@beat-em-all/mock-data';
import type { TeamMember, TeamRole } from '@beat-em-all/types';
import { ChallengeButton } from '@/components/challenge/ChallengeButton';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

/** Mock labels sometimes carry a pictograph prefix (e.g. a pin); the UI uses Lucide icons only. */
function stripPictographs(s: string): string {
  return s.replace(/\p{Extended_Pictographic}️?\s*/gu, '').trim();
}

const ROLE_ORDER: Record<TeamRole, number> = {
  captain: 0,
  co_captain: 1,
  starter: 2,
  sub: 3,
  coach: 4,
};

export default async function TeamPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // DB-backed team profile (Phase 1 hybrid: real identity + members + games from
  // Postgres, mock-data overlay for stats / upcomingMatch / mock-only roster members).
  const team = await loadTeamBySlug(slug);
  if (!team) notFound();

  const t = await getTranslations('team');

  const ratingDeltaSign = team.stats.ratingDelta30d >= 0 ? '+' : '';
  const ratingDelta = `${ratingDeltaSign}${team.stats.ratingDelta30d}`;

  const roleLabel: Record<TeamRole, string> = {
    captain: t('captain'),
    co_captain: t('coCaptain'),
    starter: t('starter'),
    sub: t('subRole'),
    coach: t('coach'),
  };

  const roleTag = (m: TeamMember) => {
    if (m.role === 'captain') return { text: roleLabel.captain, tone: 'gold' as const };
    if (m.role === 'co_captain') return { text: roleLabel.co_captain, tone: 'ink' as const };
    if (m.role === 'sub' || m.role === 'coach') return { text: roleLabel[m.role] };
    return undefined;
  };

  const members = [...team.members].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  // Status tags: verification, streak and recruiting come from structured data; any other
  // free-form badge from the overlay is shown as a neutral tag.
  const isVerified = team.badges.some((b) => b.label.toLowerCase() === 'verified');
  const extraBadges = team.badges.filter(
    (b) => !/^(verified|recruiting)$/i.test(b.label) && !/streak/i.test(b.label),
  );
  const streak = team.stats.streak;

  const tags = (
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
      text: t('membersCount', { count: team.members.length }),
    },
  ];

  const upcoming = team.upcomingMatch;

  return (
    <main className="bx-page">
      <ProfileHeader
        mark={<TeamCrest tag={team.tag} color={team.accentColor} size={120} />}
        name={team.name}
        tags={tags}
        meta={meta}
        bio={team.bio || undefined}
        actions={
          <>
            <ChallengeButton
              targetTeamSlug={team.slug}
              targetTeamName={team.name}
              targetTeamGames={team.games}
              gameLabels={Object.fromEntries(team.games.map((g) => [g, GAMES[g]?.shortName ?? g]))}
            />
            {team.recruiting && (
              <Button variant="ink">
                <UserPlus className="bx-icon" aria-hidden />
                {t('applyToJoin')}
              </Button>
            )}
          </>
        }
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
        </section>

        <section className="bx-stack min-w-0" aria-labelledby="team-roster">
          <SectionTitle
            id="team-roster"
            title={t('rosterTitle')}
            eyebrow={t('rosterCount', { count: team.members.length })}
          />
          <RosterList
            members={members.map((m) => ({
              id: m.playerSlug,
              name: m.displayName,
              role: m.inGameRole || roleLabel[m.role],
              rating: m.rating.toLocaleString('en-US'),
              tag: roleTag(m),
              href: `/${locale}/players/${m.playerSlug}`,
            }))}
          />
        </section>
      </div>
    </main>
  );
}
