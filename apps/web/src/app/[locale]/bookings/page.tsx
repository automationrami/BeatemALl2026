import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronRight, Clock, MapPin, TicketPercent, Users } from 'lucide-react';
import { EmptyState, PageHead, SectionTitle, Tag, buttonClass } from '@beat-em-all/ui';
import {
  listBookingsAtVenues,
  listBookingsForPlayer,
  listManagedVenueIds,
  type BookingWithRelations,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { BookingStatusTag, bookingStatusKey } from '@/components/booking/BookingStatusTag';
import { dateLocale, formatAmount } from '@/components/booking/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

export default async function BookingsIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const t = await getTranslations('booking');
  const tv = await getTranslations('venue');

  const tvo = await getTranslations('vouchers');

  const [bookings, managedVenueIds] = await Promise.all([
    listBookingsForPlayer(me.playerId, me.userId),
    listManagedVenueIds(me.userId),
  ]);
  // Venue owners and admins also see every booking at their venues (US-E3.6, read slice).
  const atMyVenues = await listBookingsAtVenues(managedVenueIds);

  const tz = 'Asia/Kuwait';
  const loc = dateLocale(locale);
  const dayFormat = new Intl.DateTimeFormat(loc, { day: '2-digit', timeZone: tz });
  const monthFormat = new Intl.DateTimeFormat(loc, { month: 'short', timeZone: tz });
  const weekdayFormat = new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: tz });
  const timeFormat = new Intl.DateTimeFormat(loc, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  });

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[
          bookings.length === 0 ? t('inboxEyebrow') : t('countEyebrow', { count: bookings.length }),
        ]}
        title={t('inboxTitle')}
        description={
          bookings.length === 0 ? undefined : t('inboxSubtitle', { count: bookings.length })
        }
        aside={
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/vouchers`} className={buttonClass('ghost', 'sm')}>
              <TicketPercent className="bx-icon" aria-hidden />
              {tvo('title')}
            </Link>
            <Link href={`/${locale}/venues`} className={buttonClass('ink', 'sm')}>
              <MapPin className="bx-icon" aria-hidden />
              {t('browseVenues')}
            </Link>
          </div>
        }
      />

      {bookings.length === 0 ? (
        <EmptyState
          title={t('inboxEmpty')}
          action={
            <Link href={`/${locale}/venues`} className={buttonClass('gold')}>
              {tv('bookCta')}
            </Link>
          }
        />
      ) : (
        renderRows(bookings, 'booking-rows')
      )}

      {managedVenueIds.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="at-my-venues" data-testid="venue-bookings">
          <SectionTitle id="at-my-venues" title={t('atVenuesTitle')} />
          <p className="-mt-2 text-[14px] text-ink-muted">{t('atVenuesSubtitle')}</p>
          {atMyVenues.length === 0 ? (
            <EmptyState title={t('atVenuesEmpty')} />
          ) : (
            renderRows(atMyVenues, 'venue-booking-rows')
          )}
        </section>
      ) : null}
    </main>
  );

  function renderRows(rows: BookingWithRelations[], testId: string) {
    return (
      <section className="grid gap-3" data-testid={testId}>
        {rows.map(({ booking, venue, game, team }) => (
          <Link
            key={booking.id}
            href={`/${locale}/bookings/${booking.id}`}
            className="bx-card bx-card--flat group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 transition-colors hover:bg-surface-200 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-5"
          >
            <div className="bx-inset grid w-16 justify-items-center gap-1 py-2.5">
              <span className="bx-eyebrow">{monthFormat.format(booking.startAt)}</span>
              <span className="bx-num text-[28px] text-ink">
                {dayFormat.format(booking.startAt)}
              </span>
            </div>

            <div className="grid min-w-0 gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <BookingStatusTag
                  status={booking.status}
                  label={t(bookingStatusKey(booking.status))}
                />
                <Tag>{game.name}</Tag>
              </div>
              <p className="truncate font-display text-[18px] font-bold leading-[22px] text-ink">
                {t('rowHeadline', { venue: venue.name, team: team.name })}
              </p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-[13px] font-medium text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="bx-icon size-3.5" aria-hidden />
                  <span className="tabular-nums">
                    {weekdayFormat.format(booking.startAt)}{' '}
                    {t('timeRange', {
                      start: timeFormat.format(booking.startAt),
                      end: timeFormat.format(booking.endAt),
                    })}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="bx-icon size-3.5" aria-hidden />
                  {t('seatsCount', { count: booking.seatsCount })}
                </span>
              </p>
            </div>

            <div className="col-span-2 flex items-center justify-between gap-1 border-t border-line pt-3 sm:col-span-1 sm:grid sm:justify-items-end sm:border-0 sm:pt-0">
              <span className="bx-eyebrow">{t('totalEyebrow')}</span>
              <span className="bx-num text-[22px] text-ink">
                {t('money', { amount: formatAmount(booking.totalAmountKwd) })}
              </span>
            </div>

            <ChevronRight
              className="bx-icon bx-flip hidden size-5 text-ink-muted sm:inline-block"
              aria-hidden
            />
          </Link>
        ))}
      </section>
    );
  }
}
