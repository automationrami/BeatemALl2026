import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { loadBookingById } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function statusTone(status: string): 'amber' | 'lime' | 'coral' | 'cyan' | 'default' {
  if (status === 'pending_payment') return 'amber';
  if (status === 'confirmed' || status === 'checked_in') return 'lime';
  if (status === 'completed') return 'cyan';
  if (status === 'cancelled' || status === 'no_show') return 'coral';
  return 'default';
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await loadBookingById(id);
  if (!data) notFound();

  // Authorization: only the booker or members of the booking team may view. Render
  // notFound() (not a 403) so we don't leak that the booking exists to other users.
  const me = await getCurrentUser();
  const isBooker = data.booking.bookedByUserId === me.userId;
  const isTeammate = me.teamMemberships.some((m) => m.teamId === data.booking.bookedByTeamId);
  if (!isBooker && !isTeammate) notFound();

  const t = await getTranslations('booking');

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuwait',
  });
  const dateRange = `${dateFormat.format(data.booking.startAt)} → ${dateFormat.format(
    data.booking.endAt,
  )}`;
  const statusKey = `status${data.booking.status
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')}` as
    | 'statusPendingPayment'
    | 'statusConfirmed'
    | 'statusCheckedIn'
    | 'statusCompleted'
    | 'statusCancelled'
    | 'statusNoShow';

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
        href={`/${locale}/bookings`}
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
          data-testid="booking-title"
        >
          {t('detailHeadline', { venue: data.venue.name, team: data.team.name })}
        </h1>
        <div className="flex flex-wrap gap-2 mb-5">
          <Pill tone={statusTone(data.booking.status)}>{t(statusKey)}</Pill>
          <Pill>{t('seatsCount', { count: data.booking.seatsCount })}</Pill>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="bx-eyebrow mb-2">{t('whenEyebrow')}</p>
            <p className="font-mono text-[12px] text-[var(--t-3)] tracking-[0.06em]">{dateRange}</p>
          </div>
          <div>
            <p className="bx-eyebrow mb-2">{t('whereEyebrow')}</p>
            <p className="font-display font-medium text-[16px]">{data.venue.name}</p>
            <p className="text-[var(--t-3)] text-[13px]">
              {data.venue.address ?? '—'}, {data.venue.city}
            </p>
          </div>
          <div>
            <p className="bx-eyebrow mb-2">{t('totalEyebrow')}</p>
            <p className="font-display font-medium text-[20px]">
              {t('totalKwd', { total: data.booking.totalAmountKwd.toFixed(2) })}
            </p>
            <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase">
              {t('totalBreakdown', {
                rate: data.venue.defaultHourlyRateKwd,
                seats: data.booking.seatsCount,
              })}
            </p>
          </div>
          <div>
            <p className="bx-eyebrow mb-2">{t('bookerEyebrow')}</p>
            <p className="font-display font-medium text-[14px]">{data.bookerDisplayName}</p>
            <p className="text-[var(--t-3)] text-[13px]">{data.team.name}</p>
          </div>
        </div>

        {data.booking.notes ? (
          <div className="mt-5 pt-5 border-t border-[var(--line)]">
            <p className="bx-eyebrow mb-2">{t('notesEyebrow')}</p>
            <p className="text-[var(--t-3)] text-[13px] leading-relaxed">{data.booking.notes}</p>
          </div>
        ) : null}

        {data.booking.status === 'pending_payment' ? (
          <p
            className="mt-5 px-4 py-3 rounded-xl border border-[var(--amber)] bg-[rgba(251,191,36,0.08)] text-[var(--amber)] font-display text-[13px] leading-relaxed"
            data-testid="pending-notice"
          >
            {t('pendingPaymentNotice')}
          </p>
        ) : null}
        {data.booking.status === 'confirmed' ? (
          <p
            className="mt-5 px-4 py-3 rounded-xl border border-[var(--lime)] bg-[rgba(190,242,100,0.08)] text-[var(--lime)] font-display text-[13px] leading-relaxed"
            data-testid="confirmed-notice"
          >
            {t('confirmedNotice')}
          </p>
        ) : null}
      </section>
    </main>
  );
}
