import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Gamepad2,
  MapPin,
  Monitor,
  Navigation,
  Settings,
} from 'lucide-react';
import { ProfileHeader, SectionTitle, Tag, TeamCrest, buttonClass } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import type { GameId } from '@beat-em-all/types';
import {
  canManageVenue,
  isVenueLive,
  listVenueSupportedGames,
  loadVenueRecordBySlug,
  toVenueSummary,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { BookingButton } from '@/components/booking/BookingButton';
import { formatAmount, venueInitials } from '@/components/booking/format';
import { VenueStatusBanner } from '@/components/venue-owner/VenueStatusBanner';
import { openingHoursText } from '@/components/venue-owner/hours';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export default async function VenueDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const record = await loadVenueRecordBySlug(slug);
  if (!record) notFound();

  // Only live venues are public (V-02). Pending, rejected or paused venues show to their
  // managers only, with a status banner; everyone else gets the 404.
  const live = isVenueLive(record);
  const me = await getCurrentUser().catch(() => null);
  const isManager = me ? await canManageVenue(me.userId, record.id) : false;
  if (!live && !isManager) notFound();

  const supportedGames = await listVenueSupportedGames(slug);
  const venue = toVenueSummary(
    record,
    supportedGames.map((g) => g.slug as GameId),
  );
  const t = await getTranslations('venue');
  const tvo = await getTranslations('venueOwner');
  const hours = openingHoursText(tvo, record);

  const stations = supportedGames.reduce((sum, g) => sum + g.seatsCount, 0);
  const gameNames = supportedGames.map((g) => g.name);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${venue.geo.lat},${venue.geo.lng}`;

  return (
    <main className="bx-page">
      <div className="grid gap-4">
        <Link
          href={`/${locale}/venues`}
          className="bx-eyebrow inline-flex items-center gap-1.5 justify-self-start hover:text-ink"
        >
          <ArrowLeft className="bx-icon bx-flip size-3.5" aria-hidden />
          {t('backToVenues')}
        </Link>

        <ProfileHeader
          mark={<TeamCrest tag={venueInitials(venue.name)} color="var(--gold-700)" size={120} />}
          tags={
            <>
              {venue.isVerified ? (
                <Tag tone="soft" icon={<BadgeCheck className="bx-icon" aria-hidden />}>
                  {t('verified')}
                </Tag>
              ) : null}
              <Tag>{t('venueTag')}</Tag>
            </>
          }
          name={venue.name}
          meta={[
            {
              icon: <MapPin className="bx-icon" aria-hidden />,
              text: t('cityCountry', { city: venue.city, country: venue.country }),
            },
            ...(gameNames.length > 0
              ? [
                  {
                    icon: <Gamepad2 className="bx-icon" aria-hidden />,
                    text: gameNames.join(' · '),
                  },
                ]
              : []),
            ...(stations > 0
              ? [
                  {
                    icon: <Monitor className="bx-icon" aria-hidden />,
                    text: t('seatsLabel', { count: stations }),
                  },
                ]
              : []),
            {
              icon: <Clock className="bx-icon" aria-hidden />,
              text: `${hours} · ${tvo('hours.kuwaitTime')}`,
            },
          ]}
          bio={t('bookHint')}
          actions={
            <>
              {live ? (
                <BookingButton
                  venueSlug={venue.slug}
                  venueName={venue.name}
                  venueHourlyRateKwd={venue.hourlyRateKWD}
                  supportedGames={supportedGames}
                  openingHours={tvo('hours.bookingHint', { hours })}
                />
              ) : null}
              {isManager ? (
                <Link
                  href={`/${locale}/manage/venues/${venue.slug}`}
                  className={buttonClass('ink')}
                  data-testid="venue-manage-link"
                >
                  <Settings className="bx-icon size-4" aria-hidden />
                  {tvo('manage.manageCta')}
                </Link>
              ) : null}
            </>
          }
          stats={[
            {
              label: t('perSeatHour'),
              value: t('money', { amount: formatAmount(venue.hourlyRateKWD) }),
              tone: 'gold',
            },
            { label: t('statStations'), value: stations },
            { label: t('statGames'), value: supportedGames.length },
            venue.rating !== null
              ? { label: t('statRating'), value: venue.rating.toFixed(1), of: 5 }
              : { label: t('statRating'), value: t('statRatingNone') },
          ]}
        />
        {isManager && !live ? (
          <VenueStatusBanner
            verificationStatus={record.verificationStatus}
            isActive={record.isActive}
            reviewNotes={record.reviewNotes}
            preview
          />
        ) : null}
      </div>

      <div className="bx-two">
        <section aria-labelledby="venue-games">
          <SectionTitle id="venue-games" eyebrow={t('gamesEyebrow')} title={t('gamesTitle')} />
          {supportedGames.length === 0 ? (
            <div className="bx-card bx-card--flat p-6 text-[14px] text-ink-muted">—</div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {supportedGames.map((g) => {
                const meta = GAMES[g.slug as GameId];
                return (
                  <li key={g.slug} className="bx-card bx-card--flat grid gap-3 p-5">
                    <span
                      className="font-display text-[22px] font-extrabold uppercase italic leading-none tracking-[0.02em] text-ink"
                      aria-hidden
                    >
                      {meta?.shortName ?? g.name}
                    </span>
                    <div className="flex items-end justify-between gap-3">
                      <span className="font-display text-[14px] font-medium text-ink-muted">
                        {g.name}
                      </span>
                      <span className="grid justify-items-end gap-0.5">
                        <span className="bx-num text-[24px] text-ink">{g.seatsCount}</span>
                        <span className="bx-eyebrow">{t('statStations')}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="venue-location">
          <SectionTitle
            id="venue-location"
            eyebrow={t('cityCountry', { city: venue.city, country: venue.country })}
            title={t('locationTitle')}
          />
          <div className="bx-card grid gap-5 p-6">
            <div className="flex items-start gap-3">
              <span className="bx-inset grid size-11 shrink-0 place-items-center text-gold-text">
                <MapPin className="bx-icon" aria-hidden />
              </span>
              <div className="grid gap-1">
                <p className="font-display text-[18px] font-bold leading-[22px] text-ink">
                  {venue.city}
                </p>
                <p className="font-display text-[14px] font-medium text-ink-muted">
                  {venue.country}
                </p>
              </div>
            </div>
            <div className="bx-inset grid gap-1 px-4 py-3" data-testid="venue-hours">
              <span className="bx-eyebrow">{tvo('hours.label')}</span>
              <span className="bx-num text-[15px] font-bold text-ink">
                {hours} · {tvo('hours.kuwaitTime')}
              </span>
            </div>
            <div className="bx-inset grid gap-1 px-4 py-3">
              <span className="bx-eyebrow">{t('coordinates')}</span>
              <span className="bx-num text-[15px] font-bold text-ink" dir="ltr">
                {venue.geo.lat.toFixed(4)}, {venue.geo.lng.toFixed(4)}
              </span>
            </div>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('outline', 'md', true)}
            >
              <Navigation className="bx-icon size-4" aria-hidden />
              {t('directionsCta')}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
