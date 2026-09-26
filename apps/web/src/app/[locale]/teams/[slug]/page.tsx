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
  listPendingTeamInvites,
  listTeamRoster,
  loadTeamBySlug,
} from '@beat-em-all/db/queries';
import { GAMES } from '@beat-em-all/mock-data';
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

  const [t, tr, me, roster] = await Promise.all([
    getTranslations('team'),
    getTranslations('roster'),
    getCurrentUser().catch(() => null),
    listTeamRoster(team.id),
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
