import Link from 'next/link';
import { TeamCrest } from '@beat-em-all/ui';

/* Results card: result rows grouped under a heading (a tournament, a round, "Challenges").
   Team halves mirror around a centre score column, so it reads the same way in Arabic.
   Winner's score in gold. Layout adapted from the SportyBlocks free Latest Results V1. */

export type ResultsCardTeam = {
  name: string;
  tag: string;
  color: string;
  score: number;
  href?: string;
};
export type ResultsCardEvent = {
  id: string;
  home: ResultsCardTeam;
  away: ResultsCardTeam;
  /** Small caption under the row, e.g. a date or "W" for the viewer. */
  note?: string;
};
export type ResultsCardGroup = { title: string; href?: string; events: ResultsCardEvent[] };

export function ResultsCard({ title, groups }: { title?: string; groups: ResultsCardGroup[] }) {
  return (
    <div
      className="w-full min-w-0 overflow-hidden rounded-xl border border-line bg-surface-100"
      data-testid="results-card"
    >
      {title ? (
        <div className="px-5 py-5 sm:px-7">
          <h3 className="m-0 font-display text-base/tight font-bold text-ink uppercase">{title}</h3>
        </div>
      ) : null}
      {groups.map((g) => (
        <div key={g.title} className="bg-band ring-1 ring-line">
          <h4 className="m-0 px-5 py-3 text-center text-xs/tight font-bold tracking-wide rtl:tracking-normal text-on-band-muted uppercase sm:px-7">
            {g.href ? (
              <Link href={g.href} className="text-on-band-muted no-underline hover:text-gold-text">
                {g.title}
              </Link>
            ) : (
              g.title
            )}
          </h4>
          <ul className="m-0 list-none rounded-t-xl bg-surface-100 p-0 ring-1 ring-line">
            {g.events.map((e) => {
              const homeWon = e.home.score > e.away.score;
              const awayWon = e.away.score > e.home.score;
              return (
                <li key={e.id} className="border-b border-line px-5 py-3 last:border-b-0 sm:px-7">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3">
                    <Side team={e.home} />
                    <div
                      className="flex items-center gap-2 font-display text-lg/none font-black italic tabular-nums"
                      dir="ltr"
                    >
                      <span className={homeWon ? 'text-gold-text-hi' : 'text-ink-faint'}>
                        {e.home.score}
                      </span>
                      <span className="text-ink-faint">–</span>
                      <span className={awayWon ? 'text-gold-text-hi' : 'text-ink-faint'}>
                        {e.away.score}
                      </span>
                    </div>
                    <Side team={e.away} end />
                  </div>
                  {e.note ? (
                    <div className="mt-1 text-center text-xs text-ink-faint">{e.note}</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Side({ team, end }: { team: ResultsCardTeam; end?: boolean }) {
  const name = (
    <>
      <span className="hidden sm:inline">{team.name}</span>
      <span className="sm:hidden">{team.tag}</span>
    </>
  );
  return (
    <div
      className={['flex min-w-0 items-center gap-2', end ? 'flex-row-reverse text-end' : ''].join(
        ' ',
      )}
    >
      <TeamCrest tag={team.tag} color={team.color} size={26} />
      <div className="min-w-0 truncate text-sm/tight font-bold text-ink">
        {team.href ? (
          <Link href={team.href} className="text-ink no-underline hover:text-gold-text">
            {name}
          </Link>
        ) : (
          name
        )}
      </div>
    </div>
  );
}
