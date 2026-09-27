import Link from 'next/link';
import { TeamCrest } from '@beat-em-all/ui';

/* Scoreboard card: two stacked team rows split by a VS rule, winner's score in gold, and a
   footer with the competition, a status chip and when. Layout adapted from the SportyBlocks
   free Scoreboard V1. */

export type ScoreboardSide = {
  name: string;
  tag: string;
  color: string;
  sub?: string;
  score: number | null;
  href?: string;
};

type Props = {
  home: ScoreboardSide;
  away: ScoreboardSide;
  competition: string;
  competitionHref?: string;
  when?: string;
  status: string;
  vs: string;
};

export function ScoreboardCard({
  home,
  away,
  competition,
  competitionHref,
  when,
  status,
  vs,
}: Props) {
  const decided = home.score !== null && away.score !== null && home.score !== away.score;
  const lead = decided ? ((home.score ?? 0) > (away.score ?? 0) ? 'home' : 'away') : null;
  return (
    <div
      className="w-full min-w-0 rounded-xl border border-line bg-band"
      data-testid="scoreboard-card"
    >
      <div className="rounded-xl bg-surface-100 p-6 ring-1 ring-line sm:p-7">
        <div className="flex flex-col gap-5">
          <Side side={home} won={lead === 'home'} />
          <div className="flex items-center gap-x-2">
            <div className="h-px w-8 bg-line-strong" />
            <div className="font-display text-xs font-black text-gold-text italic">{vs}</div>
            <div className="h-px flex-1 bg-line-strong" />
          </div>
          <Side side={away} won={lead === 'away'} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-6 py-3.5 text-xs/tight font-bold text-on-band-muted sm:px-7">
        <div className="min-w-0 truncate">
          {competitionHref ? (
            <Link
              href={competitionHref}
              className="text-on-band-muted no-underline hover:text-gold-text"
            >
              {competition}
            </Link>
          ) : (
            competition
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-chip bg-surface-300 px-1.5 py-0.5 text-[10px] tracking-wider rtl:tracking-normal text-ink uppercase">
            {status}
          </span>
          {when ? <span>{when}</span> : null}
        </div>
      </div>
    </div>
  );
}

function Side({ side, won }: { side: ScoreboardSide; won: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamCrest tag={side.tag} color={side.color} size={36} />
      <div className="min-w-0 text-ink">
        {side.href ? (
          <Link
            href={side.href}
            className="block truncate text-sm/tight font-bold text-ink no-underline hover:text-gold-text"
          >
            {side.name}
          </Link>
        ) : (
          <div className="truncate text-sm/tight font-bold">{side.name}</div>
        )}
        {side.sub ? <div className="text-xs/tight text-ink-muted">{side.sub}</div> : null}
      </div>
      <div
        className={[
          'ms-auto font-display text-2xl/none font-black italic tabular-nums',
          won ? 'text-gold-text-hi' : 'text-ink-faint',
        ].join(' ')}
      >
        {side.score ?? '–'}
      </div>
    </div>
  );
}
