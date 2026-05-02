import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { loadRegistrationById } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { WithdrawRegistrationButton } from '@/components/tournament/WithdrawRegistrationButton';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; id: string }> };

function statusTone(status: string): 'amber' | 'lime' | 'coral' | 'cyan' | 'default' {
  if (status === 'pending_payment') return 'amber';
  if (status === 'confirmed' || status === 'checked_in') return 'lime';
  if (status === 'disqualified' || status === 'withdrawn') return 'coral';
  return 'default';
}

export default async function RegistrationDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await loadRegistrationById(id);
  if (!data) notFound();

  // Auth: registrant or teammate. Use notFound (not 403) so existence isn't leaked.
  const me = await getCurrentUser();
  const isRegistrant = data.registration.registeredByUserId === me.userId;
  const isTeammate = me.teamMemberships.some((m) => m.teamId === data.registration.teamId);
  if (!isRegistrant && !isTeammate) notFound();

  const t = await getTranslations('registration');

  const statusKey = `status${data.registration.status
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')}` as
    | 'statusPendingPayment'
    | 'statusConfirmed'
    | 'statusCheckedIn'
    | 'statusDisqualified'
    | 'statusWithdrawn';

  const canWithdraw =
    data.registration.status === 'pending_payment' || data.registration.status === 'confirmed';

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
        href={`/${locale}/registrations`}
        className="inline-block bx-eyebrow mb-6 hover:text-white transition-colors"
      >
        ← {t('inboxTitle')}
      </Link>

      <section className="bx-card p-7 mb-4">
        <p className="bx-eyebrow mb-3">
          {t('detailEyebrow')} · {data.game.name.toUpperCase()}
        </p>
        <h1
          className="font-display font-medium text-[36px] md:text-[48px] leading-[0.95] tracking-[-0.035em] mb-3"
          data-testid="registration-title"
        >
          {t('detailHeadline', { tournament: data.tournament.name, team: data.team.name })}
        </h1>
        <div className="flex flex-wrap gap-2 mb-5">
          <Pill tone={statusTone(data.registration.status)}>{t(statusKey)}</Pill>
          {data.registration.seedNumber != null && data.registration.seedNumber > 0 ? (
            <Pill>{t('seedLabel', { seed: data.registration.seedNumber })}</Pill>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="bx-eyebrow mb-2">{t('tournamentEyebrow')}</p>
            <Link
              href={`/${locale}/tournaments/${data.tournament.slug}`}
              className="font-display font-medium text-[16px] hover:text-[var(--violet-2)] transition-colors"
            >
              {data.tournament.name}
            </Link>
            {data.tournament.startsInLabel ? (
              <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-1">
                {data.tournament.startsInLabel}
              </p>
            ) : null}
          </div>
          <div>
            <p className="bx-eyebrow mb-2">{t('teamEyebrow')}</p>
            <Link
              href={`/${locale}/teams/${data.team.slug}`}
              className="font-display font-medium text-[16px] hover:text-[var(--violet-2)] transition-colors"
            >
              {data.team.name}
            </Link>
            <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-1">
              {data.team.tag}
            </p>
          </div>
          <div>
            <p className="bx-eyebrow mb-2">{t('registeredByEyebrow')}</p>
            <p className="font-display font-medium text-[14px]">{data.registeredByDisplayName}</p>
            <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-1">
              {data.registration.createdAt.toISOString().slice(0, 10)}
            </p>
          </div>
          {data.tournament.entryFeeKwd > 0 ? (
            <div>
              <p className="bx-eyebrow mb-2">{t('entryFeeEyebrow')}</p>
              <p className="font-display font-medium text-[16px]">
                {t('entryFeeKwd', { amount: data.tournament.entryFeeKwd.toFixed(2) })}
              </p>
            </div>
          ) : null}
        </div>

        {data.registration.status === 'pending_payment' ? (
          <p
            className="mt-5 px-4 py-3 rounded-xl border border-[var(--amber)] bg-[rgba(251,191,36,0.08)] text-[var(--amber)] font-display text-[13px] leading-relaxed"
            data-testid="pending-notice"
          >
            {t('pendingPaymentNotice')}
          </p>
        ) : null}
        {data.registration.status === 'confirmed' ? (
          <p
            className="mt-5 px-4 py-3 rounded-xl border border-[var(--lime)] bg-[rgba(190,242,100,0.08)] text-[var(--lime)] font-display text-[13px] leading-relaxed"
            data-testid="confirmed-notice"
          >
            {t('confirmedNotice')}
          </p>
        ) : null}
        {data.registration.status === 'withdrawn' ? (
          <p
            className="mt-5 px-4 py-3 rounded-xl border border-[var(--coral)] bg-[rgba(251,113,133,0.08)] text-[var(--coral-2)] font-display text-[13px] leading-relaxed"
            data-testid="withdrawn-notice"
          >
            {t('withdrawnNotice')}
          </p>
        ) : null}

        {canWithdraw ? (
          <div className="mt-5 pt-5 border-t border-[var(--line)]">
            <WithdrawRegistrationButton registrationId={data.registration.id} locale={locale} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
