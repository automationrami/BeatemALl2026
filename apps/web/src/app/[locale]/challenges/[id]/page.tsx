import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { loadChallengeById, loadChallengeNegotiations } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { ChallengeActions } from '@/components/challenge/ChallengeActions';
import { getCurrentUser } from '@/lib/current-user';

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function statusTone(status: string): 'amber' | 'lime' | 'coral' | 'cyan' | 'default' {
  if (status === 'pending') return 'amber';
  if (status === 'negotiating') return 'cyan';
  if (status === 'accepted' || status === 'booked') return 'lime';
  if (status === 'rejected' || status === 'expired' || status === 'cancelled') return 'coral';
  return 'default';
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await loadChallengeById(id);
  if (!data) notFound();

  const negotiations = await loadChallengeNegotiations(id);
  const me = await getCurrentUser();
  const t = await getTranslations('challenge');

  const myTeamIds = new Set(me.teamMemberships.map((m) => m.teamId));
  const isChallenged = myTeamIds.has(data.challenge.challengedTeamId);
  const isPending = ['pending', 'negotiating'].includes(data.challenge.status);
  const canAct = isChallenged && isPending;

  const statusLabel = t(
    `status${data.challenge.status.charAt(0).toUpperCase() + data.challenge.status.slice(1)}` as
      | 'statusPending'
      | 'statusNegotiating'
      | 'statusAccepted'
      | 'statusRejected'
      | 'statusExpired'
      | 'statusCancelled'
      | 'statusBooked',
  );

  // Format dates server-side using the runtime timezone so the displayed time matches what
  // the founder typed in `datetime-local` (the previous toISOString() output was always UTC).
  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuwait',
  });
  const dateRange = `${dateFormat.format(data.challenge.proposedDateRangeStart)} → ${dateFormat.format(data.challenge.proposedDateRangeEnd)}`;

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

      <Link
        href={`/${locale}/challenges`}
        className="inline-block bx-eyebrow mb-6 hover:text-white transition-colors"
      >
        ← {t('inboxTitle')}
      </Link>

      <section className="bx-card p-7 mb-4">
        <p className="bx-eyebrow mb-3">
          {t('detailEyebrow')} · {data.game.name.toUpperCase()}
        </p>
        <h1 className="font-display font-medium text-[36px] md:text-[48px] leading-[0.95] tracking-[-0.035em] mb-3">
          {t('detailVs', {
            challenger: data.challengerTeam.name,
            challenged: data.challengedTeam.name,
          })}
        </h1>
        <div className="flex flex-wrap gap-2 mb-5">
          <Pill tone={statusTone(data.challenge.status)}>{statusLabel}</Pill>
          <Pill>{data.challenge.proposedFormat.toUpperCase()}</Pill>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <p className="bx-eyebrow mb-3">{t('currentProposal')}</p>
            <p className="font-display font-medium text-[16px] mb-1">
              {data.challenge.proposedFormat.toUpperCase()} · {data.game.name}
            </p>
            <p className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.06em]">{dateRange}</p>
            {data.challenge.proposedVenueSlug ? (
              <p className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.06em]">
                📍 {data.challenge.proposedVenueSlug}
              </p>
            ) : null}
            {data.challenge.message ? (
              <p className="text-[var(--t-3)] text-[14px] leading-relaxed mt-3 max-w-md">
                {data.challenge.message}
              </p>
            ) : null}
          </div>
          <ChallengeActions
            challengeId={data.challenge.id}
            canAct={canAct}
            // Always surface a reason when canAct is false so the action area isn't silently
            // empty. Three cases: terminal status (accepted/rejected/etc.) → show the status
            // label; pending but not on the challenged team → tell user to switch persona.
            cannotActReason={!isPending ? statusLabel : !isChallenged ? t('youCannotAct') : null}
          />
        </div>

        {data.challenge.matchId ? (
          <p
            className="mt-5 px-4 py-3 rounded-xl border border-[var(--lime)] bg-[rgba(190,242,100,0.08)] text-[var(--lime)] font-display text-[13px] leading-relaxed"
            data-testid="accepted-notice"
          >
            {t('acceptedNotice')}
          </p>
        ) : null}
      </section>

      {negotiations.length > 0 ? (
        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
          <p className="bx-eyebrow mb-4">{t('negotiationHistory')}</p>
          <ol className="space-y-3">
            {negotiations.map((n) => {
              const proposedByName =
                n.proposedByTeamId === data.challengerTeam.id
                  ? data.challengerTeam.name
                  : data.challengedTeam.name;
              return (
                <li
                  key={n.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--bg-1)] p-3"
                >
                  <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase">
                    {t('proposedBy', { team: proposedByName })} ·{' '}
                    {n.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </p>
                  <p className="font-display text-[13px] mt-1">
                    {n.proposedFormat.toUpperCase()} ·{' '}
                    {n.proposedDateRangeStart.toISOString().slice(0, 10)} →{' '}
                    {n.proposedDateRangeEnd.toISOString().slice(0, 10)}
                    {n.proposedVenueSlug ? ` · ${n.proposedVenueSlug}` : ''}
                  </p>
                  {n.message ? (
                    <p className="text-[var(--t-3)] text-[12px] mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
