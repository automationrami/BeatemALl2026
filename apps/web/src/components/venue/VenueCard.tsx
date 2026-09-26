import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, MapPin } from 'lucide-react';
import { StatStrip, Tag, TeamCrest } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import type { VenueSummary } from '@beat-em-all/types';
import { formatAmount, venueInitials } from '@/components/booking/format';

/** One venue in the list grid: mark, name, place, games, price per seat-hour in gold, rating. */
export function VenueCard({ venue, locale }: { venue: VenueSummary; locale: string }) {
  const t = useTranslations('venue');
  const tb = useTranslations('booking');

  return (
    <Link
      href={`/${locale}/venues/${venue.slug}`}
      className="bx-card group grid content-start transition-colors hover:bg-surface-200 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
    >
      <div className="flex items-start gap-4 p-5 pb-4">
        <TeamCrest tag={venueInitials(venue.name)} color="var(--gold-700)" size={56} />
        <div className="grid min-w-0 flex-1 gap-1.5">
          {venue.isVerified ? (
            <div className="flex flex-wrap gap-1.5">
              <Tag tone="soft" icon={<BadgeCheck className="bx-icon" aria-hidden />}>
                {t('verified')}
              </Tag>
            </div>
          ) : null}
          <h2 className="truncate font-display text-[24px] font-bold leading-[28px] text-ink">
            {venue.name}
          </h2>
          <p className="flex items-center gap-1.5 font-display text-[14px] font-medium text-ink-muted">
            <MapPin className="bx-icon size-4" aria-hidden />
            <span className="truncate">
              {t('cityCountry', { city: venue.city, country: venue.country })}
            </span>
          </p>
        </div>
      </div>

      {venue.supportedGames.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 px-5 pb-4">
          {venue.supportedGames.map((g) => (
            <Tag key={g}>{GAMES[g]?.shortName ?? g}</Tag>
          ))}
        </div>
      ) : null}

      <StatStrip
        bordered
        items={[
          {
            label: t('perSeatHour'),
            value: t('money', { amount: formatAmount(venue.hourlyRateKWD) }),
            tone: 'gold',
          },
          venue.rating !== null
            ? { label: t('statRating'), value: venue.rating.toFixed(1), of: 5 }
            : { label: t('statRating'), value: t('statRatingNone') },
        ]}
      />

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <span className="bx-label text-gold-text">{tb('bookCta')}</span>
        <ArrowRight
          className="bx-icon bx-flip size-4 text-gold-text transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}
