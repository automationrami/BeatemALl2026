import { TeamCrest } from '@beat-em-all/ui';

/* Player card: pennant-cut gold hero with a watermark name, the player's monogram (a photo
   slot once uploads exist), a position badge and three stats. Centring uses inset-x-0 + mx-auto,
   never start-1/2 + translate-x, which does not flip in Arabic. Layout adapted from the
   SportyBlocks free Player Card V1. */

type Props = {
  name: string;
  role: string;
  /** Short badge under the hero, e.g. "#1" (team rank) or a shirt number. */
  badge?: string;
  team?: { tag: string; color: string } | null;
  game?: string;
  stats: { label: string; value: string }[];
};

export function PlayerCard({ name, role, badge, team, game, stats }: Props) {
  const words = name.split(' ').filter(Boolean);
  const initials =
    words
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BX';
  return (
    <div className="mx-auto w-full max-w-[380px]" data-testid="player-card">
      <div className="rounded-xl border border-line bg-band">
        <div className="rounded-xl bg-surface-100 p-4 ring-1 ring-line">
          <div className="relative pb-3">
            <div className="relative h-[320px] overflow-hidden bg-linear-to-b from-gold-100 via-gold-300 to-gold-700 [clip-path:polygon(0_0,_100%_0,_100%_94%,_50%_100%,_0_94%)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-8 truncate px-2 text-center font-display text-6xl/[0.9em] font-black tracking-tighter rtl:tracking-normal text-band uppercase italic opacity-20"
              >
                <div className="truncate">{words[0]}</div>
                <div className="truncate">{words.slice(1).join(' ')}</div>
              </div>
              <div className="absolute inset-x-0 bottom-12 mx-auto flex size-40 items-center justify-center overflow-hidden rounded-full border-4 border-band/60 bg-band font-display text-6xl font-black text-gold-text-hi italic shadow-bx-float">
                {initials}
              </div>
            </div>
            {badge ? (
              <div className="absolute inset-x-0 bottom-0 mx-auto flex h-12 w-fit min-w-12 items-center justify-center rounded-tile bg-linear-to-b from-gold-100 to-gold-500 px-2 font-display text-2xl/none font-black text-on-gold italic">
                {badge}
              </div>
            ) : null}
            {team ? (
              <div className="absolute start-3 top-3">
                <TeamCrest tag={team.tag} color={team.color} size={44} />
              </div>
            ) : null}
            {game ? (
              <div className="absolute end-3 top-3 rounded-chip bg-band/80 px-2 py-1 text-[11px] font-bold tracking-wider rtl:tracking-normal text-gold-text uppercase">
                {game}
              </div>
            ) : null}
          </div>
          <div className="pt-3 pb-1 text-center text-ink">
            <div className="font-display text-[22px]/tight font-bold tracking-tight" dir="auto">
              {name}
            </div>
            <div className="text-sm text-ink-muted">{role}</div>
          </div>
        </div>
        <div className="mx-auto grid w-fit grid-cols-3 divide-x divide-line py-5 text-on-band rtl:divide-x-reverse">
          {stats.map((s) => (
            <div key={s.label} className="px-6 text-center sm:px-7">
              <div className="mb-1.5 font-display text-lg/tight font-bold tabular-nums">
                {s.value}
              </div>
              <div className="text-[11px]/tight tracking-wider rtl:tracking-normal text-on-band-muted uppercase">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
