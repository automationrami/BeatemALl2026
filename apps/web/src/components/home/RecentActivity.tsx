'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { MatchRow } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import type { ActivityMatch, HomeViewerMode } from '@beat-em-all/types';

type Props = {
  matches: ActivityMatch[];
  mode: HomeViewerMode;
  primaryTeamSlug: string | null;
};

export function RecentActivity({ matches, mode, primaryTeamSlug }: Props) {
  const t = useTranslations('home.activity');
  const locale = useLocale();

  if (mode === 'solo') {
    return (
      <div className="rounded-[20px] border border-dashed border-[var(--line-2)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
        <p className="text-[var(--t-3)] text-sm leading-relaxed mb-3">{t('soloEmptyTitle')}</p>
        <Link
          href={`/${locale}/discover/teams`}
          className="inline-flex items-center justify-center rounded-xl border border-[var(--line-2)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] px-4 py-2 text-xs font-display font-medium text-white transition-colors"
        >
          {t('soloEmptyCta')} →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <p className="bx-eyebrow mb-1">{t('eyebrow')}</p>
          <h2 className="font-display font-medium text-[20px] tracking-[-0.02em]">{t('title')}</h2>
        </div>
        {primaryTeamSlug ? (
          <Link
            href={`/${locale}/teams/${primaryTeamSlug}`}
            className="text-xs font-display font-medium text-[var(--violet-2)] hover:text-white transition-colors"
          >
            {t('viewAll')} →
          </Link>
        ) : null}
      </header>

      {matches.length === 0 ? (
        <p className="text-[var(--t-3)] text-sm leading-relaxed py-6 text-center">
          {t('activeEmptyTitle')}
        </p>
      ) : (
        <div>
          {matches.map((m) => (
            <MatchRow
              key={m.id}
              date={m.relativeDate}
              opponentLabel={m.opponentLabel}
              scoreLabel={m.scoreLabel}
              result={m.result}
              gameTag={GAMES[m.game].shortName}
              isTournament={m.isTournament}
            />
          ))}
        </div>
      )}
    </div>
  );
}
