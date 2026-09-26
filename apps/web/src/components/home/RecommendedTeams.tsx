'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { MapPin, Swords } from 'lucide-react';
import { EmptyState, SectionTitle, Tag, TeamCrest, buttonClass } from '@beat-em-all/ui';
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
    <section aria-labelledby="home-teams">
      <SectionTitle
        id="home-teams"
        eyebrow={t('eyebrow')}
        title={t('title')}
        actions={primaryGame ? <Tag tone="soft">{GAMES[primaryGame].shortName}</Tag> : undefined}
      />

      {teams.length === 0 ? (
        <EmptyState
          title={t('empty', { game: primaryGame ? GAMES[primaryGame].shortName : '—' })}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {teams.map((team) => (
            <article key={team.id} className="bx-card bx-card--flat grid content-start gap-4 p-5">
              <div className="flex items-center gap-4">
                <TeamCrest tag={team.tag} color={team.accentColor} size={56} />
                <div className="grid min-w-0 gap-1">
                  <Link
                    href={`/${locale}/teams/${team.slug}`}
                    className="truncate font-display text-[18px] font-bold leading-[22px] text-ink hover:text-gold-text"
                  >
                    {team.name}
                  </Link>
                  <span className="inline-flex items-center gap-1 text-[13px] leading-[16px] text-ink-muted">
                    <MapPin className="bx-icon size-3.5" aria-hidden />
                    <span className="truncate">
                      {t('distanceLabel', {
                        km: formatDistanceKm(team.distanceKm),
                        city: team.city,
                      })}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {team.games.slice(0, 2).map((g) => (
                  <Tag key={g}>{GAMES[g].shortName}</Tag>
                ))}
                {team.recruiting ? (
                  <Tag className="bg-positive-soft text-positive">{t('recruiting')}</Tag>
                ) : null}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <Link
                  href={`/${locale}/teams/${team.slug}`}
                  className={buttonClass('ink', 'sm', true)}
                >
                  {t('viewTeam')}
                </Link>
                <Link
                  href={`/${locale}/teams/${team.slug}?challenge=1`}
                  className={buttonClass('outline', 'sm', true)}
                >
                  <Swords className="bx-icon size-3.5" aria-hidden />
                  {t('challenge')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
