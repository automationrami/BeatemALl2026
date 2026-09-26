import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { EmptyState, MatchCard, PageHead, SegmentedTabs, Tag, buttonClass } from '@beat-em-all/ui';
import {
  listChallengesForPlayer,
  type ChallengeDirection,
  type ChallengeWithRelations,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import {
  challengeStatusKey,
  challengeStatusTone,
  formatDayRange,
} from '@/components/challenge/challengeStatus';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ direction?: string }>;
};

const VALID_DIRECTIONS: ChallengeDirection[] = ['incoming', 'outgoing', 'all'];

export default async function ChallengesIndexPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { direction: rawDirection } = await searchParams;
  setRequestLocale(locale);

  // Default to 'all' so the user lands on a tab that surfaces their just-sent challenge
  // regardless of whether they're the challenger or challenged. Fixes the silent-empty
  // state when Khaled sends a challenge and then visits /challenges (the original
  // 'incoming' default would have shown emptyIncoming).
  const direction: ChallengeDirection = VALID_DIRECTIONS.includes(
    rawDirection as ChallengeDirection,
  )
    ? (rawDirection as ChallengeDirection)
    : 'all';

  const me = await getCurrentUser();
  const t = await getTranslations('challenge');

  const primaryTeam = me.teamMemberships[0];
  let challenges: ChallengeWithRelations[] = [];
  if (primaryTeam) {
    challenges = await listChallengesForPlayer(me.playerId, direction);
  }

  const myTeamIds = new Set(me.teamMemberships.map((m) => m.teamId));

  const tabs: { value: ChallengeDirection; label: string }[] = [
    { value: 'incoming', label: t('tabIncoming') },
    { value: 'outgoing', label: t('tabOutgoing') },
    { value: 'all', label: t('tabAll') },
  ];

  const emptyText =
    direction === 'incoming'
      ? t('emptyIncoming')
      : direction === 'outgoing'
        ? t('emptyOutgoing')
        : t('emptyAll');

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[t('inboxEyebrow'), ...(primaryTeam ? [primaryTeam.teamName] : [])]}
        title={t('inboxTitle')}
        description={
          primaryTeam ? t('inboxSubtitle', { teamName: primaryTeam.teamName }) : undefined
        }
      >
        {primaryTeam ? (
          <div className="px-5 pb-5 min-[900px]:px-8 min-[900px]:pb-8">
            <SegmentedTabs
              label={t('inboxTitle')}
              value={direction}
              items={tabs.map((tab) => ({
                ...tab,
                href: `/${locale}/challenges?direction=${tab.value}`,
              }))}
            />
          </div>
        ) : null}
      </PageHead>

      {!primaryTeam ? (
        <EmptyState
          title={t('inboxNoTeam')}
          action={
            <Link href={`/${locale}/teams/new`} className={buttonClass('gold')}>
              {t('createTeamCta')}
            </Link>
          }
        />
      ) : challenges.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <section className="grid gap-4" data-testid="challenge-rows">
          {challenges.map(({ challenge, challengerTeam, challengedTeam, game }) => {
            const isOutgoing = myTeamIds.has(challenge.challengerTeamId);
            const otherTeam = isOutgoing ? challengedTeam : challengerTeam;
            return (
              <Link
                key={challenge.id}
                href={`/${locale}/challenges/${challenge.id}`}
                aria-label={
                  isOutgoing
                    ? t('rowTo', { team: otherTeam.name })
                    : t('rowFrom', { team: otherTeam.name })
                }
                className="block rounded-md transition-[filter] hover:brightness-110 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
              >
                <MatchCard
                  home={{
                    name: challengerTeam.name,
                    sub: challengerTeam.city ?? challengerTeam.countryCode,
                    crest: { tag: challengerTeam.tag },
                  }}
                  away={{
                    name: challengedTeam.name,
                    sub: challengedTeam.city ?? challengedTeam.countryCode,
                    crest: { tag: challengedTeam.tag },
                  }}
                  game={game.name}
                  when={formatDayRange(
                    locale,
                    challenge.proposedDateRangeStart,
                    challenge.proposedDateRangeEnd,
                  )}
                  round={challenge.proposedFormat.toUpperCase()}
                  venue={challenge.proposedVenueSlug ?? t('inboxVenueTbd')}
                  status={
                    <span className="flex flex-wrap items-center justify-end gap-2">
                      <Tag>{isOutgoing ? t('tabOutgoing') : t('tabIncoming')}</Tag>
                      <Tag tone={challengeStatusTone(challenge.status)}>
                        {t(challengeStatusKey(challenge.status))}
                      </Tag>
                    </span>
                  }
                />
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
