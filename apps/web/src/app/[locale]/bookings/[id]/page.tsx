import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  LogIn,
  MapPin,
  StickyNote,
  TicketPercent,
  UserX,
} from 'lucide-react';
import { Avatar, Notice, StatStrip, TeamCrest, buttonClass } from '@beat-em-all/ui';
import {
  canManageVenue,
  isTeamLeaderRole,
  loadBookingById,
  loadBookingVoucherPayment,
  loadVenueCancellationWindow,
  teamCancelStatus,
  venueActionsFor,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { BookingStatusTag, bookingStatusKey } from '@/components/booking/BookingStatusTag';
import { dateLocale, formatAmount } from '@/components/booking/format';
import { teamCrestColor } from '@/components/tournament/display';
import { PayWithVoucher } from '@/components/voucher/PayWithVoucher';
import { TeamCancelBooking } from '@/components/venue-owner/TeamCancelBooking';
import { VenueBookingActions } from '@/components/venue-owner/VenueBookingActions';

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

  // Authorization: the booker, members of the booking team, or managers of the venue's
  // organisation. notFound() (not a 403) so we don't leak that the booking exists.
  const me = await getCurrentUser();
  const isBooker = data.booking.bookedByUserId === me.userId;
  const membership = me.teamMemberships.find((m) => m.teamId === data.booking.bookedByTeamId);
  const isVenueManager = await canManageVenue(me.userId, data.venue.id);
  if (!isBooker && !membership && !isVenueManager) notFound();
  const canPay = isTeamLeaderRole(membership?.role);

  const t = await getTranslations('booking');
  const tv = await getTranslations('vouchers');
  const tvo = await getTranslations('venueOwner');
  const payment = await loadBookingVoucherPayment(id);

  // T-08: captains cancel pending/confirmed bookings until the venue's cancellation window.
  const cancellable =
    canPay && (data.booking.status === 'pending_payment' || data.booking.status === 'confirmed');
  const cancelStatus = cancellable
    ? teamCancelStatus(data.booking.startAt, await loadVenueCancellationWindow(data.venue.id))
    : null;
  const venueActions = isVenueManager ? venueActionsFor(data.booking.status) : [];

  const tz = 'Asia/Kuwait';
  const loc = dateLocale(locale);
  const fullDate = new Intl.DateTimeFormat(loc, { dateStyle: 'full', timeZone: tz });
  const dateTime = new Intl.DateTimeFormat(loc, {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
    timeZone: tz,
  });
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
        {payment ? (
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
                  amount: t('money', { amount: formatAmount(payment.amountKwd) }),
                  issuer: payment.issuer,
                })}
              </span>
            </Notice>
          </div>
        ) : null}
        {booking.status === 'pending_payment' && canPay ? (
          <PayWithVoucher
            target={{ kind: 'booking', id: booking.id }}
            amountLabel={t('money', { amount: formatAmount(booking.totalAmountKwd) })}
          />
        ) : null}
        {booking.status === 'pending_payment' && !canPay && membership ? (
          <p className="text-[13px] text-ink-muted">{tv('captainOnlyPay')}</p>
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
        {booking.status === 'cancelled' ? (
          <div data-testid="cancelled-notice">
            <Notice tone="neutral" icon={<CircleX className="bx-icon text-negative" aria-hidden />}>
              {tvo('teamCancel.cancelledNotice', {
                date: dateTime.format(booking.cancelledAt ?? booking.updatedAt),
              })}
              {booking.cancellationReason
                ? ` ${tvo('teamCancel.cancelledReason', { reason: booking.cancellationReason })}`
                : null}
            </Notice>
          </div>
        ) : null}
        {booking.status === 'checked_in' ||
        booking.status === 'completed' ||
        booking.status === 'no_show' ? (
          <div data-testid="status-notice" data-status={booking.status}>
            <Notice
              tone="neutral"
              icon={
                booking.status === 'checked_in' ? (
                  <LogIn className="bx-icon text-positive" aria-hidden />
                ) : booking.status === 'completed' ? (
                  <Flag className="bx-icon" aria-hidden />
                ) : (
                  <UserX className="bx-icon text-negative" aria-hidden />
                )
              }
            >
              {tvo(
                booking.status === 'checked_in'
                  ? 'teamCancel.checkedInNotice'
                  : booking.status === 'completed'
                    ? 'teamCancel.completedNotice'
                    : 'teamCancel.noShowNotice',
              )}
            </Notice>
          </div>
        ) : null}
        {cancelStatus?.open ? (
          <TeamCancelBooking
            bookingId={booking.id}
            venueName={venue.name}
            deadlineLabel={tvo('teamCancel.deadline', {
              date: dateTime.format(cancelStatus.deadline),
            })}
          />
        ) : null}
        {cancelStatus && !cancelStatus.open ? (
          <p className="m-0 text-[13px] text-ink-muted" data-testid="cancel-window-passed">
            {tvo('teamCancel.windowPassed', { date: dateTime.format(cancelStatus.deadline) })}
          </p>
        ) : null}
        {venueActions.length > 0 ? (
          <section
            className="bx-card bx-card--flat grid gap-3 p-5"
            aria-label={tvo('actions.venueTitle')}
            data-testid="venue-booking-actions"
          >
            <p className="bx-eyebrow m-0">{tvo('actions.venueTitle')}</p>
            <VenueBookingActions bookingId={booking.id} actions={venueActions} size="md" />
          </section>
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
                <TeamCrest tag={team.tag} color={teamCrestColor(team.slug)} size={40} />
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
