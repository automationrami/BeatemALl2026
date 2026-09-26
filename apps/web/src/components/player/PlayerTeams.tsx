import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EmptyState, SectionTitle, Tag, TeamCrest } from '@beat-em-all/ui';
import type { PlayerTeam } from '@beat-em-all/db/queries';

type Props = { locale: string; teams: PlayerTeam[]; emptyText: string };

/** P-05: a player's current teams with their role on each (server component). */
export async function PlayerTeams({ locale, teams, emptyText }: Props) {
  const t = await getTranslations('profile');
  const tr = await getTranslations('roster');
  return (
    <section className="min-w-0" aria-labelledby="player-teams-title">
      <SectionTitle id="player-teams-title" title={t('teamsTitle')} />
      {teams.length === 0 ? (
        <div data-testid="player-teams">
          <EmptyState title={emptyText} />
        </div>
      ) : (
        <ul
          className="m-0 grid list-none gap-3 p-0 min-[700px]:grid-cols-2"
          data-testid="player-teams"
        >
          {teams.map((team) => (
            <li key={team.teamSlug}>
              <Link
                href={`/${locale}/teams/${team.teamSlug}`}
                className="bx-card bx-card--flat flex items-center gap-4 p-4 hover:brightness-110"
                data-testid={`player-team-${team.teamSlug}`}
              >
                <TeamCrest tag={team.tag} color={team.accentColor} size={48} />
                <div className="grid min-w-0 flex-1 gap-1">
                  <b className="truncate font-display text-[17px] text-ink" dir="auto">
                    {team.teamName}
                  </b>
                  <span className="truncate text-[13px] text-ink-muted" dir="auto">
                    {[team.city, team.countryCode].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <Tag
                  tone={
                    team.role === 'captain'
                      ? 'gold'
                      : team.role === 'co_captain'
                        ? 'ink'
                        : 'neutral'
                  }
                >
                  {tr(`roles.${team.role}`)}
                </Tag>
                <ChevronRight className="bx-icon bx-flip shrink-0 text-ink-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
