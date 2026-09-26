'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight, MapPin, Star } from 'lucide-react';
import { EmptyState, SectionTitle, Tag, TeamCrest, buttonClass } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import { formatDistanceKm } from '@beat-em-all/utils';
import type { NearbyVenue } from '@beat-em-all/types';

type Props = { venues: NearbyVenue[] };

export function VenueList({ venues }: Props) {
  const t = useTranslations('home.venues');
  const locale = useLocale();

  return (
    <section aria-labelledby="home-venues">
      <SectionTitle
        id="home-venues"
        eyebrow={t('eyebrow')}
        title={t('title')}
        actions={
          <Link href={`/${locale}/venues`} className={buttonClass('ghost', 'sm')}>
            {t('viewAll')}
            <ChevronRight className="bx-icon bx-flip" aria-hidden />
          </Link>
        }
      />

      {venues.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {venues.map((v) => (
            <Link
              key={v.id}
              href={`/${locale}/venues/${v.slug}`}
              className="bx-card bx-card--flat grid content-start gap-4 p-5 transition-colors hover:bg-surface-200 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
            >
              <div className="flex items-center gap-4">
                <TeamCrest tag={v.name.slice(0, 2)} size={48} />
                <div className="grid min-w-0 flex-1 gap-1">
                  <span className="truncate font-display text-[18px] font-bold leading-[22px] text-ink">
                    {v.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[13px] leading-[16px] text-ink-muted">
                    <MapPin className="bx-icon size-3.5" aria-hidden />
                    <span className="truncate">
                      {v.city} · {t('distanceLabel', { km: formatDistanceKm(v.distanceKm) })}
                    </span>
                  </span>
                </div>
                {v.rating !== null ? (
                  <span className="inline-flex shrink-0 items-center gap-1 self-start">
                    <Star className="bx-icon size-4 fill-current text-gold-text" aria-hidden />
                    <span className="bx-num text-[16px] text-ink">{v.rating.toFixed(1)}</span>
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {v.supportedGames.slice(0, 3).map((g) => (
                  <Tag key={g}>{GAMES[g].shortName}</Tag>
                ))}
              </div>

              <div className="bx-inset flex items-center justify-between gap-3 px-4 py-3">
                <span className="bx-num text-[18px] text-ink">
                  {t('rate', { rate: v.hourlyRateKWD })}
                </span>
                {v.rating === null ? (
                  <span className="text-[12px] leading-[16px] text-ink-muted">{t('unrated')}</span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
