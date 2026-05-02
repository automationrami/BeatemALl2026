import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Pill, Wordmark } from '@beat-em-all/ui';
import { listBookingsForPlayer } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

function statusTone(status: string): 'amber' | 'lime' | 'coral' | 'cyan' | 'default' {
  if (status === 'pending_payment') return 'amber';
  if (status === 'confirmed' || status === 'checked_in') return 'lime';
  if (status === 'completed') return 'cyan';
  if (status === 'cancelled' || status === 'no_show') return 'coral';
  return 'default';
}

export default async function BookingsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const t = await getTranslations('booking');

  const bookings = await listBookingsForPlayer(me.playerId, me.userId);

  const dateFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuwait',
  });

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
          {bookings.length === 0 ? t('inboxEmpty') : t('inboxSubtitle', { count: bookings.length })}
        </p>
      </section>

      {bookings.length === 0 ? (
        <p className="text-[var(--t-3)] text-sm leading-relaxed py-8 text-center">
          {t('inboxEmpty')}
        </p>
      ) : (
        <section className="space-y-3" data-testid="booking-rows">
          {bookings.map(({ booking, venue, game, team }) => {
            return (
              <Link
                key={booking.id}
                href={`/${locale}/bookings/${booking.id}`}
                className="flex items-center justify-between rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-4 hover:bg-[var(--bg-3)] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-display font-medium text-[15px] truncate">
                    {t('rowHeadline', { venue: venue.name, team: team.name })}
                  </p>
                  <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-0.5">
                    {game.name} · {dateFormat.format(booking.startAt)} ·{' '}
                    {t('seatsCount', { count: booking.seatsCount })} ·{' '}
                    {t('totalKwd', { total: booking.totalAmountKwd.toFixed(2) })}
                  </p>
                </div>
                <Pill tone={statusTone(booking.status)}>
                  {t(
                    `status${booking.status
                      .split('_')
                      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                      .join('')}` as
                      | 'statusPendingPayment'
                      | 'statusConfirmed'
                      | 'statusCheckedIn'
                      | 'statusCompleted'
                      | 'statusCancelled'
                      | 'statusNoShow',
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
