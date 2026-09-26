import { getTranslations } from 'next-intl/server';
import { BracketMatch, BracketWinner } from '@beat-em-all/ui';
import type { BracketView, BracketViewSide } from '@beat-em-all/db/queries';
import { teamCrestColor } from './display';

type Props = {
  bracket: BracketView;
  /** Extra controls under a match, keyed by match id (the organiser's result forms). */
  extras?: Record<string, React.ReactNode>;
};

/**
 * Read-only single-elimination bracket (TM-3): one column per round, the champion slot at
 * the end once the final is decided. Byes show as such and auto-advance.
 */
export async function BracketBoard({ bracket, extras = {} }: Props) {
  const t = await getTranslations('bracket');

  const slot = (s: BracketViewSide) =>
    s.team
      ? {
          name: s.team.name,
          crest: { tag: s.team.tag, color: teamCrestColor(s.team.slug) },
          score: s.score,
          winner: s.winner,
        }
      : {
          name: s.bye ? t('bye') : t('tbd'),
          crest: { tag: s.bye ? '–' : '?' },
          score: null,
          winner: null,
        };

  // Matches are numbered in play order across rounds; byes don't get a number.
  const numbers = new Map<string, number>();
  for (const round of bracket.rounds) {
    for (const m of round.matches) {
      if (!m.isBye) numbers.set(`${round.index}-${m.index}`, numbers.size + 1);
    }
  }
  const champion = bracket.standings.first;

  return (
    <div className="bx-bracket items-stretch" data-testid="bracket">
      {bracket.rounds.map((round) => (
        <div key={round.index} className="grid grid-rows-[auto_1fr] gap-3">
          <span className="bx-round justify-self-start" data-testid={`round-${round.index}`}>
            {t(`round.${round.label}`, { number: round.index + 1 })}
          </span>
          <div className="bx-bracket__col">
            {round.matches.map((m) => {
              const both = !!m.home.team && !!m.away.team;
              const status = m.isBye
                ? t('status.bye')
                : m.winnerTeamId
                  ? t('status.completed')
                  : both
                    ? t('status.scheduled')
                    : t('status.waiting');
              return (
                <div
                  key={`${round.index}-${m.index}`}
                  className="grid gap-2"
                  data-testid={
                    m.matchId ? `match-${m.matchId}` : `pairing-${round.index}-${m.index}`
                  }
                >
                  <BracketMatch
                    a={slot(m.home)}
                    b={slot(m.away)}
                    when={
                      m.isBye
                        ? t('byeLabel')
                        : t('matchNumber', {
                            number: numbers.get(`${round.index}-${m.index}`) ?? 0,
                          })
                    }
                    status={status}
                    final={round.label === 'final'}
                  />
                  {m.matchId ? extras[m.matchId] : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {champion ? (
        <div className="grid grid-rows-[auto_1fr] gap-3">
          <span className="bx-round justify-self-start">{t('championRound')}</span>
          <div className="bx-bracket__col">
            <BracketWinner
              label={t('champion')}
              team={{
                name: champion.name,
                crest: { tag: champion.tag, color: teamCrestColor(champion.slug) },
                winner: true,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
