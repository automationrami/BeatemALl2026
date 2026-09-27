import Link from 'next/link';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { TeamCrest } from '@beat-em-all/ui';

/* Compact standings card: card-in-card table with rank, movement, medals and points, the
   viewer's team lit in gold. Layout adapted from the SportyBlocks free Standings V1. */

export type StandingsCardRow = {
  id: string;
  rank: number;
  delta: number;
  name: string;
  tag: string;
  color: string;
  sub?: string | null;
  points: number;
  medals: { gold: number; silver: number; bronze: number };
  events: number;
  href?: string;
  /** The team this card is about, or the viewer's team. */
  highlight?: boolean;
};

export type StandingsCardLabels = {
  team: string;
  events: string;
  medals: string;
  points: string;
  move: string;
  up: (n: number) => string;
  down: (n: number) => string;
  same: string;
};

type Props = {
  title: string;
  subtitle?: string;
  rows: StandingsCardRow[];
  labels: StandingsCardLabels;
  footer?: React.ReactNode;
};

export function StandingsCard({ title, subtitle, rows, labels, footer }: Props) {
  return (
    <div
      className="@container w-full min-w-0 rounded-xl border border-line bg-surface-100"
      data-testid="standings-card"
    >
      <div className="px-5 py-5 @md:px-7">
        <h3 className="m-0 font-display text-base/tight font-bold text-ink uppercase">{title}</h3>
        {subtitle ? <p className="m-0 mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-band text-xs/tight font-bold tracking-wide rtl:tracking-normal text-on-band-muted uppercase">
            <tr>
              <th scope="col" className="py-3.5 ps-4 pe-2 text-start @md:ps-7 @md:pe-4">
                # / {labels.team}
              </th>
              <th scope="col" className="hidden px-2.5 py-3.5 text-center @md:table-cell">
                {labels.events}
              </th>
              <th scope="col" className="px-2.5 py-3.5 text-center">
                {labels.medals}
              </th>
              <th scope="col" className="px-1.5 py-3.5 text-center">
                <span aria-hidden>{labels.move}</span>
              </th>
              <th scope="col" className="py-3.5 ps-2.5 pe-5 text-end @md:pe-7">
                {labels.points}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm/tight font-bold text-ink tabular-nums">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={[
                  'border-b border-line last:border-0',
                  row.highlight
                    ? 'bg-gold-soft shadow-[inset_3px_0_0_var(--gold-300)] rtl:shadow-[inset_-3px_0_0_var(--gold-300)]'
                    : '',
                ].join(' ')}
                data-testid={row.highlight ? 'standings-card-highlight' : undefined}
              >
                <td className="py-3.5 ps-4 pe-2 text-start whitespace-nowrap @md:ps-7 @md:pe-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={[
                        'w-6 font-display text-base italic',
                        row.rank === 1 ? 'text-gold-text-hi' : 'text-ink-faint',
                      ].join(' ')}
                    >
                      {String(row.rank).padStart(2, '0')}
                    </span>
                    <TeamCrest tag={row.tag} color={row.color} size={28} />
                    <div className="min-w-0 max-w-36 @md:max-w-60">
                      {row.href ? (
                        <Link
                          href={row.href}
                          className="block truncate text-ink no-underline hover:text-gold-text"
                        >
                          {row.name}
                        </Link>
                      ) : (
                        <div className="truncate">{row.name}</div>
                      )}
                      {row.sub ? (
                        <div className="text-xs font-normal text-ink-muted">{row.sub}</div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="hidden px-2.5 py-3.5 text-center text-ink-muted @md:table-cell">
                  {row.events}
                </td>
                <td className="px-2.5 py-3.5 text-center">
                  <span className="inline-flex gap-1 text-xs">
                    <Medal n={row.medals.gold} tone="bg-medal-gold" />
                    <Medal n={row.medals.silver} tone="bg-medal-silver" />
                    <Medal n={row.medals.bronze} tone="bg-medal-bronze" />
                  </span>
                </td>
                <td className="px-2.5 py-3.5 text-center">
                  <Move delta={row.delta} labels={labels} />
                </td>
                <td className="py-3.5 ps-2.5 pe-5 text-end font-display text-base text-gold-text @md:pe-7">
                  {row.points.toLocaleString('en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="px-5 py-4 @md:px-7">{footer}</div> : null}
    </div>
  );
}

function Medal({ n, tone }: { n: number; tone: string }) {
  return (
    <span
      className={[
        'inline-flex h-5 min-w-5 items-center justify-center rounded-chip px-1 text-[11px]',
        n ? `${tone} text-band` : 'bg-surface-300 text-ink-faint',
      ].join(' ')}
    >
      {n}
    </span>
  );
}

function Move({ delta, labels }: { delta: number; labels: StandingsCardLabels }) {
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-positive">
        <ArrowUp className="size-3.5" aria-hidden />
        <span className="sr-only">{labels.up(delta)}</span>
        <span aria-hidden>{delta}</span>
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-negative">
        <ArrowDown className="size-3.5" aria-hidden />
        <span className="sr-only">{labels.down(-delta)}</span>
        <span aria-hidden>{-delta}</span>
      </span>
    );
  return (
    <span className="inline-flex text-ink-faint">
      <Minus className="size-3.5" aria-hidden />
      <span className="sr-only">{labels.same}</span>
    </span>
  );
}
