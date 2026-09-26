'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { BadgeCheck, ChevronRight } from 'lucide-react';
import { EmptyState, SectionTitle, Tag, TeamCrest, buttonClass } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import type { TournamentStatus, TournamentSummary } from '@beat-em-all/types';

type Props = { tournaments: TournamentSummary[] };

const STATUS_TONE: Record<TournamentStatus, 'live' | 'soft' | 'neutral'> = {
  in_progress: 'live',
  registration_open: 'soft',
  published: 'neutral',
};

/** Western digits in both languages. */
const kwd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Crest text for a tournament: a leading acronym ("KEC"), else the word initials. */
function crestTag(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0] ?? name;
  if (/^[A-Z0-9]{2,4}$/.test(first)) return first;
  const initials = words.map((w) => w.match(/[\p{L}\p{N}]/u)?.[0] ?? '').join('');
  return (initials.length >= 2 ? initials : name).slice(0, 3);
}

export function TournamentList({ tournaments }: Props) {
  const t = useTranslations('home.tournaments');
  const locale = useLocale();

  return (
    <section aria-labelledby="home-tournaments" className="min-w-0">
      <SectionTitle
        id="home-tournaments"
        eyebrow={t('eyebrow')}
        title={t('title')}
        actions={
          <Link href={`/${locale}/tournaments`} className={buttonClass('ghost', 'sm')}>
            {t('viewAll')}
            <ChevronRight className="bx-icon bx-flip" aria-hidden />
          </Link>
        }
      />

      {tournaments.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="bx-card m-0 grid list-none p-0">
          {tournaments.map((tour) => (
            <li key={tour.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/${locale}/tournaments/${tour.slug}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-200 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
              >
                <TeamCrest tag={crestTag(tour.name)} color={tour.organizerAccent} size={48} />
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <p className="m-0 truncate font-display text-[17px] font-bold leading-[21px] text-ink">
                    {tour.name}
                  </p>
                  <p className="m-0 truncate text-[13px] leading-[16px] text-ink-muted">
                    {GAMES[tour.game].shortName} · {tour.organizer}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Tag tone={STATUS_TONE[tour.status]}>{t(`status.${tour.status}`)}</Tag>
                    {tour.isSanctioned ? (
                      <Tag tone="paper" icon={<BadgeCheck className="bx-icon" aria-hidden />}>
                        {t('sanctioned')}
                      </Tag>
                    ) : null}
                  </div>
                </div>
                <div className="grid shrink-0 justify-items-end gap-1.5 text-end">
                  {tour.prizePoolKWD > 0 ? (
                    <span className="bx-num bx-gold-num text-[22px] sm:text-[26px]">
                      {t('prize', { amount: kwd.format(tour.prizePoolKWD) })}
                    </span>
                  ) : (
                    <span className="bx-label text-ink-muted">{t('free')}</span>
                  )}
                  <span className="text-[12px] leading-[16px] text-ink-muted">
                    {tour.startsInLabel}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
