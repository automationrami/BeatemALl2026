'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Pill } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import type { TournamentSummary } from '@beat-em-all/types';

type Props = { tournaments: TournamentSummary[] };

export function TournamentList({ tournaments }: Props) {
  const t = useTranslations('home.tournaments');
  const locale = useLocale();

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="bx-eyebrow mb-1">{t('eyebrow')}</p>
          <h2 className="font-display font-medium text-[20px] tracking-[-0.02em]">{t('title')}</h2>
        </div>
        <Link
          href={`/${locale}/tournaments`}
          className="text-xs font-display font-medium text-[var(--violet-2)] hover:text-white transition-colors"
        >
          {t('viewAll')} →
        </Link>
      </header>

      {tournaments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line-2)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
          <p className="text-[var(--t-3)] text-sm leading-relaxed">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((tour) => (
            <Link
              key={tour.id}
              href={`/${locale}/tournaments/${tour.slug}`}
              className={[
                'flex items-center gap-4 rounded-xl border bg-[var(--bg-1)] p-4 hover:bg-[var(--bg-3)] transition-colors',
                tour.isSanctioned
                  ? 'border-[var(--line)] border-s-2 border-s-[var(--cyan-2)]'
                  : 'border-[var(--line)]',
              ].join(' ')}
            >
              <span
                className="w-14 h-14 rounded-xl shrink-0 grid place-items-center font-display font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${tour.organizerAccent}, ${tour.organizerAccent}55)`,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                aria-hidden
              >
                {tour.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-medium text-[15px] truncate">{tour.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <Pill>{GAMES[tour.game].shortName}</Pill>
                  <span className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase">
                    {tour.organizer}
                  </span>
                  {tour.isSanctioned ? (
                    <Pill tone="cyan" dot>
                      {t('sanctioned')}
                    </Pill>
                  ) : null}
                </div>
              </div>
              <div className="text-end shrink-0">
                {tour.prizePoolKWD > 0 ? (
                  <p className="bx-num text-[20px]">
                    {t('prizePoolLabel', { amount: formatKwd(tour.prizePoolKWD) })}
                  </p>
                ) : (
                  <p className="font-mono text-[11px] text-[var(--t-4)] uppercase tracking-[0.08em]">
                    {t('free')}
                  </p>
                )}
                <p className="font-mono text-[10.5px] text-[var(--t-3)] tracking-[0.06em] mt-1">
                  {tour.startsInLabel}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatKwd(amount: number): string {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    const formatted = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}K`;
  }
  return amount.toLocaleString();
}
