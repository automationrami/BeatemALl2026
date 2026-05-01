'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { formatDistanceKm } from '@beat-em-all/utils';
import type { NearbyVenue } from '@beat-em-all/types';

type Props = { venues: NearbyVenue[] };

export function VenueList({ venues }: Props) {
  const t = useTranslations('home.venues');
  const locale = useLocale();

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="bx-eyebrow mb-1">{t('eyebrow')}</p>
          <h2 className="font-display font-medium text-[20px] tracking-[-0.02em]">{t('title')}</h2>
        </div>
        <Link
          href={`/${locale}/venues`}
          className="text-xs font-display font-medium text-[var(--violet-2)] hover:text-white transition-colors"
        >
          {t('viewAll')} →
        </Link>
      </header>

      {venues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line-2)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
          <p className="text-[var(--t-3)] text-sm leading-relaxed">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map((v) => (
            <Link
              key={v.id}
              href={`/${locale}/venues/${v.slug}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-1)] p-3 hover:bg-[var(--bg-3)] transition-colors"
            >
              <span
                className="w-12 h-12 rounded-xl shrink-0 grid place-items-center font-display font-bold text-white text-[14px]"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(139,92,246,0.10))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                aria-hidden
              >
                {v.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-medium text-[14px] truncate">{v.name}</p>
                <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-0.5">
                  {v.city}
                </p>
              </div>
              <div className="text-end shrink-0">
                {v.rating !== null ? (
                  <span className="inline-flex items-center gap-1 font-display font-medium text-[12px] text-white">
                    <Star
                      size={12}
                      className="text-[var(--amber)] fill-[var(--amber)]"
                      aria-hidden
                    />
                    {v.rating.toFixed(1)}
                  </span>
                ) : null}
                <p className="font-mono text-[10.5px] text-[var(--t-3)] tracking-[0.06em] mt-0.5">
                  {t('perHour', { rate: v.hourlyRateKWD })}
                </p>
                <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.06em]">
                  {t('distanceLabel', { km: formatDistanceKm(v.distanceKm) })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
