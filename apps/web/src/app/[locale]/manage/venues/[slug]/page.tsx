import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, ExternalLink, MapPin } from 'lucide-react';
import { PageHead, SectionTitle, StatStrip, buttonClass } from '@beat-em-all/ui';
import {
  isVenueLive,
  kuwaitDayAndMonth,
  listVenueBookingsForManager,
  listVenueGameOptions,
  loadManagedVenue,
  loadVenueDashboardStats,
  venueActionsFor,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { bookingStatusKey } from '@/components/booking/BookingStatusTag';
import { dateLocale, formatAmount } from '@/components/booking/format';
import { teamCrestColor } from '@/components/tournament/display';
import { VenueForm } from '@/components/venue-owner/VenueForm';
import { VenueStatusBanner } from '@/components/venue-owner/VenueStatusBanner';
import {
  VenueBookingsPanel,
  type ManagerBookingRow,
} from '@/components/venue-owner/VenueBookingsPanel';
import { openingHoursText } from '@/components/venue-owner/hours';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/** V-02 → V-06: status, dashboard, settings and bookings for the venue's owners and admins. */
export default async function ManageVenuePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const managed = await loadManagedVenue(slug, me.userId);
  if (!managed) notFound();
  const { venue } = managed;

  const [t, tb, stats, bookings, gameOptions] = await Promise.all([
    getTranslations('venueOwner'),
    getTranslations('booking'),
    loadVenueDashboardStats(venue.id),
    listVenueBookingsForManager(venue.id),
    listVenueGameOptions(),
  ]);

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
  const money = (n: number) => tb('money', { amount: formatAmount(n) });

  const { now, todayStart, todayEnd } = kuwaitDayAndMonth();
  const OPEN_STATUSES = ['pending_payment', 'confirmed', 'checked_in'];
  const rows: ManagerBookingRow[] = bookings.map(({ booking, team, game }) => ({
    id: booking.id,
    status: booking.status,
    statusLabel: tb(bookingStatusKey(booking.status)),
    teamName: team.name,
    teamTag: team.tag,
    teamColor: teamCrestColor(team.slug) ?? 'var(--gold-700)',
    gameName: game.name,
    dayLabel: dayFormat.format(booking.startAt),
    monthLabel: monthFormat.format(booking.startAt),
    timeLabel: `${weekdayFormat.format(booking.startAt)} ${tb('timeRange', {
      start: timeFormat.format(booking.startAt),
      end: timeFormat.format(booking.endAt),
    })}`,
    seatsCount: booking.seatsCount,
    totalLabel: money(booking.totalAmountKwd),
    notes: booking.notes,
    cancellationReason: booking.cancellationReason,
    isUpcoming: booking.endAt >= now && OPEN_STATUSES.includes(booking.status),
    isToday: booking.startAt >= todayStart && booking.startAt < todayEnd,
    actions: venueActionsFor(booking.status),
  }));

  const live = isVenueLive(venue);

  return (
    <main className="bx-page">
      <Link
        href={`/${locale}/manage`}
        className="bx-eyebrow inline-flex items-center gap-1.5 justify-self-start hover:text-ink"
      >
        <ArrowLeft className="bx-icon bx-flip size-3.5" aria-hidden />
        {t('manage.back')}
      </Link>

      <PageHead
        eyebrow={[
          t('manage.eyebrow'),
          t(
            `status.${live ? 'verified' : venue.verificationStatus === 'verified' ? 'paused' : venue.verificationStatus}`,
          ),
        ]}
        title={venue.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="bx-icon size-4" aria-hidden />
              {venue.address ? `${venue.address}, ${venue.city}` : venue.city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="bx-icon size-4" aria-hidden />
              {openingHoursText(t, venue)} · {t('hours.kuwaitTime')}
            </span>
          </span>
        }
        aside={
          venue.verificationStatus === 'verified' ? (
            <Link
              href={`/${locale}/venues/${venue.slug}`}
              className={buttonClass('ink', 'sm')}
              data-testid="venue-view-public"
            >
              <ExternalLink className="bx-icon" aria-hidden />
              {t('manage.viewPublic')}
            </Link>
          ) : undefined
        }
      >
        <StatStrip
          bordered
          items={[
            { label: t('manage.statUpcoming'), value: stats.upcoming },
            { label: t('manage.statToday'), value: stats.today },
            { label: t('manage.statMonthBookings'), value: stats.monthBookings },
            { label: t('manage.statSeatHours'), value: stats.monthSeatHours },
            {
              label: t('manage.statRevenue'),
              value: money(stats.monthRevenueKwd),
              tone: 'gold',
            },
          ]}
        />
      </PageHead>

      <VenueStatusBanner
        verificationStatus={venue.verificationStatus}
        isActive={venue.isActive}
        reviewNotes={venue.reviewNotes}
      />

      <section className="grid gap-4" aria-labelledby="venue-bookings-title">
        <SectionTitle
          id="venue-bookings-title"
          eyebrow={t('manage.bookingsEyebrow')}
          title={t('manage.bookingsTitle')}
        />
        <VenueBookingsPanel rows={rows} />
      </section>

      <section className="grid gap-4" aria-labelledby="venue-edit-title">
        <SectionTitle
          id="venue-edit-title"
          eyebrow={t('manage.editEyebrow')}
          title={t('manage.editTitle')}
        />
        <VenueForm
          mode="edit"
          venueSlug={venue.slug}
          gameOptions={gameOptions}
          initial={{
            name: venue.name,
            city: venue.city,
            address: venue.address ?? '',
            phoneNumber: venue.phoneNumber ?? '',
            email: venue.email ?? '',
            description: venue.description ?? '',
            hourlyRateKwd: venue.defaultHourlyRateKwd,
            games: managed.games.map((g) => ({ slug: g.slug, seatsCount: g.seatsCount })),
            opensAtTime: venue.opensAtTime.slice(0, 5),
            closesAtTime: venue.closesAtTime.slice(0, 5),
            isOpen24h: venue.isOpen24h,
            cancellationWindowHours: venue.cancellationWindowHours,
            acceptsWalkIns: venue.acceptsWalkIns,
            isActive: venue.isActive,
          }}
        />
      </section>
    </main>
  );
}
