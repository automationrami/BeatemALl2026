import Link from 'next/link';
import { TeamCrest } from '@beat-em-all/ui';

/* Player stats banner: gold hero band with the name, status pills, team and profile facts,
   over a stat strip. Used as the player profile header. Monogram until photo uploads exist;
   the centred block uses inset-x-0 + mx-auto so it stays put in Arabic. Layout adapted from
   the SportyBlocks free Player Stats V1. */

type Props = {
  name: string;
  pills: React.ReactNode;
  team?: { name: string; tag: string; color: string; href?: string } | null;
  facts: { label: string; value: React.ReactNode }[];
  stats: { label: React.ReactNode; value: React.ReactNode }[];
};

export function PlayerStatsBanner({ name, pills, team, facts, stats }: Props) {
  const words = name.split(' ').filter(Boolean);
  const first = words[0] ?? name;
  const rest = words.slice(1).join(' ');
  const initials = `${first[0] ?? ''}${rest[0] ?? ''}`.toUpperCase() || 'BX';
  return (
    <section
      className="w-full overflow-hidden rounded-xl border border-line bg-linear-to-br from-gold-300 via-gold-500 to-gold-700"
      data-testid="player-stats-banner"
    >
      <div className="grid min-h-[280px] gap-y-8 px-6 pt-8 md:grid-cols-[30%_1fr_auto] md:gap-x-6 md:py-0 md:ps-0 md:pe-6">
        <div className="relative order-3 -mx-6 h-[220px] md:order-none md:mx-0 md:h-auto">
          <div className="absolute inset-x-0 bottom-0 mx-auto flex size-52 items-center justify-center overflow-hidden rounded-t-full bg-band font-display text-7xl font-black text-gold-text-hi italic">
            {initials}
          </div>
        </div>
        <div className="order-1 min-w-0 text-center md:order-none md:py-10 md:text-start">
          <h1
            className="m-0 mb-4 flex flex-col font-display font-black tracking-tighter rtl:tracking-normal text-band italic"
            dir="auto"
          >
            <span className="text-2xl/none xl:text-4xl/none">{first}</span>
            {rest ? (
              <span className="text-4xl/none break-words uppercase sm:text-5xl/none xl:text-6xl/none">
                {rest}
              </span>
            ) : null}
          </h1>
          <div className="mb-5 flex flex-wrap justify-center gap-1.5 md:justify-start">{pills}</div>
          {team ? (
            <div className="flex items-center justify-center gap-x-2 md:justify-start">
              <TeamCrest tag={team.tag} color={team.color} size={34} />
              {team.href ? (
                <Link
                  href={team.href}
                  className="text-lg font-extrabold text-band no-underline hover:underline"
                >
                  {team.name}
                </Link>
              ) : (
                <span className="text-lg font-extrabold text-band">{team.name}</span>
              )}
            </div>
          ) : null}
        </div>
        <dl className="order-2 m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2.5 self-center text-band md:order-none md:py-10">
          {facts.map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-end text-xs font-semibold uppercase opacity-75 md:text-start">
                {f.label}
              </dt>
              <dd className="m-0 min-w-0 truncate text-sm font-extrabold">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-xl bg-surface-100 py-7 ring-1 ring-line">
        <div className="grid grid-cols-2 gap-y-5 px-6 sm:grid-cols-3 md:grid-cols-[repeat(auto-fit,minmax(110px,1fr))] md:px-0">
          {stats.map((s, i) => (
            <div
              key={i}
              className="group relative flex flex-col items-center gap-y-1.5 px-2 text-center text-ink"
            >
              <div className="font-display text-xl/tight font-bold tabular-nums md:text-[1.75rem]/tight">
                {s.value}
              </div>
              <div className="text-[11px]/tight tracking-wider rtl:tracking-normal text-ink-muted uppercase">
                {s.label}
              </div>
              <div className="absolute inset-y-2 end-0 hidden w-px bg-line group-last:hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
