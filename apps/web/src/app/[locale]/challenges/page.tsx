import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Pill, Wordmark } from '@beat-em-all/ui';
import {
  listChallengesForPlayer,
  type ChallengeDirection,
  type ChallengeWithRelations,
} from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { getCurrentUser } from '@/lib/current-user';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ direction?: string }>;
};

const VALID_DIRECTIONS: ChallengeDirection[] = ['incoming', 'outgoing', 'all'];

function statusTone(status: string): 'amber' | 'lime' | 'coral' | 'cyan' | 'default' {
  if (status === 'pending') return 'amber';
  if (status === 'negotiating') return 'cyan';
  if (status === 'accepted' || status === 'booked') return 'lime';
  if (status === 'rejected' || status === 'expired' || status === 'cancelled') return 'coral';
  return 'default';
}

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

  const tabs: ChallengeDirection[] = ['incoming', 'outgoing', 'all'];

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-10">
        <Link href={`/${locale}`}>
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      <section className="mb-8">
        <p className="bx-eyebrow mb-3">{t('inboxEyebrow')}</p>
        <h1 className="font-display font-medium text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.035em] mb-4">
          {t('inboxTitle')}
        </h1>
        <p className="text-[var(--t-3)] max-w-xl text-base leading-relaxed">
          {primaryTeam ? t('inboxSubtitle', { teamName: primaryTeam.teamName }) : t('inboxNoTeam')}
        </p>
      </section>

      <nav className="flex gap-2 mb-6 border-b border-[var(--line)]">
        {tabs.map((tab) => {
          const active = tab === direction;
          const labelKey = `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as
            | 'tabIncoming'
            | 'tabOutgoing'
            | 'tabAll';
          return (
            <Link
              key={tab}
              href={`/${locale}/challenges?direction=${tab}`}
              className={[
                'px-4 py-2 text-sm font-display font-medium transition-colors border-b-2',
                active
                  ? 'border-[var(--violet-2)] text-white'
                  : 'border-transparent text-[var(--t-4)] hover:text-white',
              ].join(' ')}
            >
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>

      {!primaryTeam ? (
        <p className="text-[var(--t-3)] text-sm leading-relaxed py-8 text-center">
          {t('inboxNoTeam')}
        </p>
      ) : challenges.length === 0 ? (
        <p className="text-[var(--t-3)] text-sm leading-relaxed py-8 text-center">
          {direction === 'incoming'
            ? t('emptyIncoming')
            : direction === 'outgoing'
              ? t('emptyOutgoing')
              : t('emptyAll')}
        </p>
      ) : (
        <section className="space-y-3" data-testid="challenge-rows">
          {challenges.map(({ challenge, challengerTeam, challengedTeam, game }) => {
            const isOutgoing = myTeamIds.has(challenge.challengerTeamId);
            const otherTeam = isOutgoing ? challengedTeam : challengerTeam;
            const directionLabel = isOutgoing
              ? t('rowTo', { team: otherTeam.name })
              : t('rowFrom', { team: otherTeam.name });
            return (
              <Link
                key={challenge.id}
                href={`/${locale}/challenges/${challenge.id}`}
                className="flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-4 hover:bg-[var(--bg-3)] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-display font-medium text-[15px] truncate">{directionLabel}</p>
                  <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-0.5">
                    {t('rowFormat', {
                      format: challenge.proposedFormat.toUpperCase(),
                      game: game.name,
                    })}
                  </p>
                </div>
                <Pill tone={statusTone(challenge.status)}>
                  {t(
                    `status${challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}` as
                      | 'statusPending'
                      | 'statusNegotiating'
                      | 'statusAccepted'
                      | 'statusRejected'
                      | 'statusExpired'
                      | 'statusCancelled'
                      | 'statusBooked',
                  )}
                </Pill>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
