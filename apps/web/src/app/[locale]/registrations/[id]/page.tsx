import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleAlert, CircleCheck, Clock, TicketPercent } from 'lucide-react';
import { Notice, Tag, TeamCrest } from '@beat-em-all/ui';
import {
  isTeamLeaderRole,
  loadRegistrationById,
  loadRegistrationVoucherPayment,
} from '@beat-em-all/db/queries';
import { PayWithVoucher } from '@/components/voucher/PayWithVoucher';
import { WithdrawRegistrationButton } from '@/components/tournament/WithdrawRegistrationButton';
import {
  formatAmount,
  registrationStatusKey,
  registrationStatusTone,
  teamCrestColor,
} from '@/components/tournament/display';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; id: string }> };

export default async function RegistrationDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await loadRegistrationById(id);
  if (!data) notFound();

  // Auth: registrant or teammate. Use notFound (not 403) so existence isn't leaked.
  const me = await getCurrentUser();
  const isRegistrant = data.registration.registeredByUserId === me.userId;
  const membership = me.teamMemberships.find((m) => m.teamId === data.registration.teamId);
  if (!isRegistrant && !membership) notFound();
  const isLeader = isTeamLeaderRole(membership?.role);

  const t = await getTranslations('registration');
  const tTour = await getTranslations('tournament');
  const tv = await getTranslations('vouchers');
  const payment = await loadRegistrationVoucherPayment(id);
  const feeLabel = tTour('moneyKwd', { amount: formatAmount(data.tournament.entryFeeKwd) });

  const status = data.registration.status;
  const canWithdraw = status === 'pending_payment' || status === 'confirmed';
  const statusTone = registrationStatusTone(status);

  const factLabel = 'bx-eyebrow text-on-band-muted';
  const factValue = 'font-display text-[16px] font-bold leading-[20px] text-on-band';

  return (
    <main className="bx-page">
      <div className="grid gap-4">
        <Link
          href={`/${locale}/registrations`}
          className="bx-label inline-flex items-center gap-2 justify-self-start text-ink-muted no-underline hover:text-ink"
        >
          <ArrowLeft className="bx-icon bx-flip" aria-hidden />
          {t('inboxTitle')}
        </Link>

        <section className="overflow-hidden rounded-2xl bg-band text-on-band shadow-bx-lift">
          <div className="grid gap-5 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:p-8">
            <TeamCrest tag={data.team.tag} color={teamCrestColor(data.team.slug)} size={88} />
            <div className="grid min-w-0 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={factLabel}>
                  {t('detailEyebrow')} · {data.game.name}
                </span>
                <Tag tone={statusTone === 'neutral' ? 'outline' : statusTone}>
                  {t(registrationStatusKey(status))}
                </Tag>
                {data.registration.seedNumber != null && data.registration.seedNumber > 0 ? (
                  <Tag tone="outline">{t('seedLabel', { seed: data.registration.seedNumber })}</Tag>
                ) : null}
              </div>
              <h1
                className="m-0 font-display text-[32px] font-bold leading-[34px] md:text-[42px] md:leading-[42px]"
                data-testid="registration-title"
              >
                {t('detailHeadline', { tournament: data.tournament.name, team: data.team.name })}
              </h1>
            </div>
          </div>

          <dl className="m-0 grid grid-cols-1 border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5 p-5 md:px-8">
              <dt className={factLabel}>{t('tournamentEyebrow')}</dt>
              <dd className="m-0 grid gap-1">
                <Link
                  href={`/${locale}/tournaments/${data.tournament.slug}`}
                  className={`${factValue} no-underline hover:text-gold-text`}
                >
                  {data.tournament.name}
                </Link>
                {data.tournament.startsInLabel ? (
                  <span className="text-[13px] font-medium text-on-band-muted">
                    {data.tournament.startsInLabel}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="grid gap-1.5 border-t border-line p-5 sm:border-s sm:border-t-0 md:px-8">
              <dt className={factLabel}>{t('teamEyebrow')}</dt>
              <dd className="m-0 grid gap-1">
                <Link
                  href={`/${locale}/teams/${data.team.slug}`}
                  className={`${factValue} no-underline hover:text-gold-text`}
                >
                  {data.team.name}
                </Link>
                <span className="text-[13px] font-medium text-on-band-muted">{data.team.tag}</span>
              </dd>
            </div>
            <div className="grid gap-1.5 border-t border-line p-5 lg:border-s lg:border-t-0 md:px-8">
              <dt className={factLabel}>{t('registeredByEyebrow')}</dt>
              <dd className="m-0 grid gap-1">
                <span className={factValue}>{data.registeredByDisplayName}</span>
                <span className="bx-num text-[13px] font-medium text-on-band-muted">
                  {data.registration.createdAt.toISOString().slice(0, 10)}
                </span>
              </dd>
            </div>
            <div className="grid gap-1.5 border-t border-line p-5 sm:border-s lg:border-t-0 md:px-8">
              <dt className={factLabel}>{t('entryFeeEyebrow')}</dt>
              <dd className="m-0">
                {data.tournament.entryFeeKwd > 0 ? (
                  <span className="bx-num bx-gold-num text-[24px] leading-[28px]">
                    {tTour('moneyKwd', { amount: formatAmount(data.tournament.entryFeeKwd) })}
                  </span>
                ) : (
                  <span className={factValue}>{tTour('free')}</span>
                )}
              </dd>
            </div>
          </dl>

          {canWithdraw || status === 'withdrawn' ? (
            <div className="grid gap-4 border-t border-line p-5 md:px-8 md:py-6">
              {status === 'pending_payment' ? (
                <div data-testid="pending-notice">
                  <Notice icon={<Clock className="bx-icon" aria-hidden />}>
                    {t('pendingPaymentNotice')}
                  </Notice>
                </div>
              ) : null}
              {payment && status !== 'withdrawn' ? (
                <div data-testid="voucher-paid">
                  <Notice
                    tone="neutral"
                    icon={<TicketPercent className="bx-icon text-gold-text" aria-hidden />}
                  >
                    <b className="text-ink">{tv('paidTitle')}</b>
                    {' · '}
                    <span dir="ltr" className="font-mono">
                      {tv('paidLine', {
                        code: payment.code,
                        amount: feeLabel,
                        issuer: payment.issuer,
                      })}
                    </span>
                  </Notice>
                </div>
              ) : null}
              {status === 'pending_payment' && isLeader ? (
                <PayWithVoucher
                  target={{ kind: 'registration', id: data.registration.id }}
                  amountLabel={feeLabel}
                />
              ) : null}
              {status === 'confirmed' ? (
                <div data-testid="confirmed-notice">
                  <Notice icon={<CircleCheck className="bx-icon" aria-hidden />}>
                    {t('confirmedNotice')}
                  </Notice>
                </div>
              ) : null}
              {status === 'withdrawn' ? (
                <div data-testid="withdrawn-notice">
                  <Notice tone="neutral" icon={<CircleAlert className="bx-icon" aria-hidden />}>
                    {t('withdrawnNotice')}
                  </Notice>
                </div>
              ) : null}
              {canWithdraw ? (
                <WithdrawRegistrationButton
                  registrationId={data.registration.id}
                  locale={locale}
                  paidWithVoucher={!!payment}
                />
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
