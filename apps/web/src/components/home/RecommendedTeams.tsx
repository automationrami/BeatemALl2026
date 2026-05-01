'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Button, Pill, TeamCrest } from '@beat-em-all/ui';
import { GAMES } from '@beat-em-all/mock-data';
import { formatDistanceKm } from '@beat-em-all/utils';
import type { GameId, RecommendedTeam } from '@beat-em-all/types';

type Props = {
  teams: RecommendedTeam[];
  primaryGame: GameId | null;
};

export function RecommendedTeams({ teams, primaryGame }: Props) {
  const t = useTranslations('home.recommendedTeams');
  const locale = useLocale();

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)] p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="bx-eyebrow mb-1">{t('eyebrow')}</p>
          <h2 className="font-display font-medium text-[20px] tracking-[-0.02em]">{t('title')}</h2>
        </div>
        {primaryGame ? <Pill tone="violet">{GAMES[primaryGame].shortName}</Pill> : null}
      </header>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line-2)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
          <p className="text-[var(--t-3)] text-sm leading-relaxed">
            {t('empty', { game: primaryGame ? GAMES[primaryGame].shortName : '—' })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {teams.map((team) => (
            <article
              key={team.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--bg-1)] p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <TeamCrest tag={team.tag} color={team.accentColor} size={48} />
                <div className="min-w-0">
                  <p className="font-display font-medium text-[15px] truncate">{team.name}</p>
                  <p className="font-mono text-[10.5px] text-[var(--t-4)] tracking-[0.08em] uppercase mt-0.5">
                    {t('distanceLabel', {
                      km: formatDistanceKm(team.distanceKm),
                      city: team.city,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {team.games.slice(0, 2).map((g) => (
                  <Pill key={g}>{GAMES[g].shortName}</Pill>
                ))}
                {team.recruiting ? (
                  <Pill tone="lime" dot>
                    {t('recruiting')}
                  </Pill>
                ) : null}
              </div>
              <div className="flex gap-2 mt-auto">
                <Link
                  href={`/${locale}/teams/${team.slug}`}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-[var(--line-2)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-display font-medium text-white transition-colors"
                >
                  {t('viewTeam')}
                </Link>
                <Button tone="primary" size="sm" full>
                  {t('challenge')} →
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
