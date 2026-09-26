'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EmptyState, SectionTitle, Tag, buttonClass } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import type { ActivityMatch, HomeViewerMode } from '@beat-em-all/types';

const RESULT_CLASS: Record<ActivityMatch['result'], string> = {
  W: 'bg-positive-soft text-positive',
  L: 'bg-negative-soft text-negative',
  D: '',
};

type Props = {
  matches: ActivityMatch[];
  mode: HomeViewerMode;
  primaryTeamSlug: string | null;
};

export function RecentActivity({ matches, mode, primaryTeamSlug }: Props) {
  const t = useTranslations('home.activity');
  const locale = useLocale();

  const viewAll =
    mode !== 'solo' && primaryTeamSlug ? (
      <Link href={`/${locale}/teams/${primaryTeamSlug}`} className={buttonClass('ghost', 'sm')}>
        {t('viewAll')}
        <ChevronRight className="bx-icon bx-flip" aria-hidden />
      </Link>
    ) : undefined;

  return (
    <section aria-labelledby="home-activity" className="min-w-0">
      <SectionTitle
        id="home-activity"
        eyebrow={t('eyebrow')}
        title={t('title')}
        actions={viewAll}
      />

      {mode === 'solo' ? (
        <EmptyState
          title={t('soloEmptyTitle')}
          action={
            <Link href={`/${locale}/discover/teams`} className={buttonClass('ink', 'sm')}>
              {t('soloEmptyCta')}
              <ChevronRight className="bx-icon bx-flip" aria-hidden />
            </Link>
          }
        />
      ) : matches.length === 0 ? (
        <EmptyState title={t('activeEmptyTitle')} />
      ) : (
        <ul className="bx-card m-0 grid list-none p-0">
          {matches.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
            >
              <span className="bx-eyebrow w-7 shrink-0">{m.relativeDate}</span>
              <div className="grid min-w-0 flex-1 gap-1.5">
                <p className="m-0 truncate font-display text-[15px] font-bold leading-[19px] text-ink">
                  {m.opponentLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Tag>{GAMES[m.game].shortName}</Tag>
                  {m.isTournament ? <Tag tone="soft">{t('tournamentMatch')}</Tag> : null}
                </div>
              </div>
              <div className="grid shrink-0 justify-items-end gap-1.5">
                <span className="bx-num text-[22px] text-ink">{m.scoreLabel}</span>
                <Tag className={RESULT_CLASS[m.result]}>{t(`result.${m.result}`)}</Tag>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
