import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, CircleCheck, Clock, MapPin, StickyNote } from 'lucide-react';
import { Avatar, Notice, StatStrip, TeamCrest, buttonClass } from '@beat-em-all/ui';
import { loadBookingById } from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { BookingStatusTag, bookingStatusKey } from '@/components/booking/BookingStatusTag';
import { dateLocale, formatAmount } from '@/components/booking/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

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

  const tz = 'Asia/Kuwait';
  const loc = dateLocale(locale);
  const fullDate = new Intl.DateTimeFormat(loc, { dateStyle: 'full', timeZone: tz });
  const shortDate = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', timeZone: tz });
  const timeFormat = new Intl.DateTimeFormat(loc, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  });

  const { booking, venue, game, team } = data;
  const hours =
    Math.round(((booking.endAt.getTime() - booking.startAt.getTime()) / 3_600_000) * 10) / 10;
  const timeRange = t('timeRange', {
    start: timeFormat.format(booking.startAt),
    end: timeFormat.format(booking.endAt),
  });

  return (
    <main className="bx-page">
      <div className="grid gap-4">
        <Link
          href={`/${locale}/bookings`}
          className="bx-eyebrow inline-flex items-center gap-1.5 justify-self-start hover:text-ink"
        >
          <ArrowLeft className="bx-icon bx-flip size-3.5" aria-hidden />
          {t('inboxTitle')}
        </Link>

        <section className="bx-card bg-band text-on-band">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
            <div className="grid min-w-0 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <BookingStatusTag
                  status={booking.status}
                  label={t(bookingStatusKey(booking.status))}
                />
                <span className="bx-eyebrow text-on-band-muted">
                  {t('detailEyebrow')} · {game.name}
                </span>
              </div>
              <h1
                className="font-display text-[32px] font-bold leading-[34px] text-on-band md:text-[42px] md:leading-[42px]"
                data-testid="booking-title"
              >
                {t('detailHeadline', { venue: venue.name, team: team.name })}
              </h1>
              <p className="flex items-center gap-1.5 font-display text-[14px] font-medium text-on-band-muted">
                <MapPin className="bx-icon size-4" aria-hidden />
                {venue.address ? `${venue.address}, ${venue.city}` : venue.city}
              </p>
            </div>
            <div className="grid gap-1.5 md:justify-items-end md:text-end">
              <span className="bx-eyebrow text-on-band-muted">{t('totalEyebrow')}</span>
              <span className="bx-num bx-gold-num text-[48px] md:text-[56px]">
                {t('money', { amount: formatAmount(booking.totalAmountKwd) })}
              </span>
              <span className="font-display text-[13px] font-medium tabular-nums text-on-band-muted">
                {t('priceFormula', {
                  rate: formatAmount(venue.defaultHourlyRateKwd),
                  seats: booking.seatsCount,
                  hours,
                })}
              </span>
            </div>
          </div>
          <StatStrip
            bordered
            items={[
              { label: t('statDate'), value: shortDate.format(booking.startAt) },
              { label: t('statTime'), value: timeFormat.format(booking.startAt) },
              { label: t('statHours'), value: hours },
              { label: t('statSeats'), value: booking.seatsCount },
            ]}
          />
        </section>

        {booking.status === 'pending_payment' ? (
          <div data-testid="pending-notice">
            <Notice icon={<Clock className="bx-icon" aria-hidden />}>
              {t('pendingPaymentNotice')}
            </Notice>
          </div>
        ) : null}
        {booking.status === 'confirmed' ? (
          <div data-testid="confirmed-notice">
            <Notice
              tone="neutral"
              icon={<CircleCheck className="bx-icon text-positive" aria-hidden />}
            >
              {t('confirmedNotice')}
            </Notice>
          </div>
        ) : null}
      </div>

      <div className="bx-two">
        <section className="bx-card grid gap-6 p-6 md:p-8">
          <div className="grid gap-2">
            <p className="bx-eyebrow">{t('whenEyebrow')}</p>
            <p className="flex items-center gap-2 font-display text-[16px] font-bold text-ink">
              <CalendarDays className="bx-icon size-4 text-gold-text" aria-hidden />
              {fullDate.format(booking.startAt)}
            </p>
            <p className="ps-6 font-display text-[14px] font-medium tabular-nums text-ink-muted">
              {timeRange}
            </p>
          </div>

          <div className="grid gap-2 border-t border-line pt-6">
            <p className="bx-eyebrow">{t('whereEyebrow')}</p>
            <p className="font-display text-[16px] font-bold text-ink">{venue.name}</p>
            <p className="font-display text-[14px] font-medium text-ink-muted">
              {venue.address ?? '—'}, {venue.city}
            </p>
          </div>

          <div className="grid gap-3 border-t border-line pt-6">
            <p className="bx-eyebrow">{t('bookerEyebrow')}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="flex items-center gap-3">
                <Avatar name={data.bookerDisplayName} size={40} />
                <span className="font-display text-[15px] font-bold text-ink">
                  {data.bookerDisplayName}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <TeamCrest tag={team.tag} size={40} />
                <span className="font-display text-[15px] font-bold text-ink">{team.name}</span>
              </span>
            </div>
          </div>

          {booking.notes ? (
            <div className="grid gap-2 border-t border-line pt-6">
              <p className="bx-eyebrow">{t('notesEyebrow')}</p>
              <p className="flex items-start gap-2 font-display text-[14px] font-medium leading-relaxed text-ink-muted">
                <StickyNote className="bx-icon mt-0.5 size-4 shrink-0" aria-hidden />
                {booking.notes}
              </p>
            </div>
          ) : null}
        </section>

        <aside className="bx-card bx-card--flat grid gap-3 p-6">
          <Link href={`/${locale}/venues/${venue.slug}`} className={buttonClass('ink', 'md', true)}>
            <MapPin className="bx-icon size-4" aria-hidden />
            {t('viewVenue')}
          </Link>
          <Link href={`/${locale}/bookings`} className={buttonClass('ghost', 'md', true)}>
            <ArrowLeft className="bx-icon bx-flip size-4" aria-hidden />
            {t('inboxTitle')}
          </Link>
        </aside>
      </div>
    </main>
  );
}
