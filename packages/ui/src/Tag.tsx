import { ArrowDown, ArrowUp, Medal } from 'lucide-react';

type TagTone = 'neutral' | 'gold' | 'ink' | 'paper' | 'soft' | 'outline' | 'live' | 'info' | 'org';

type TagProps = {
  tone?: TagTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Small uppercase chip for status, placement and context (Championship Gold `Tag`). */
export function Tag({ tone = 'neutral', icon, children, className = '' }: TagProps) {
  return (
    <span className={['bx-tag', tone === 'neutral' ? '' : `bx-tag--${tone}`, className].join(' ')}>
      {icon}
      {children}
    </span>
  );
}

type PlaceTagProps = {
  place: number;
  /** Pre-localised label; defaults to the English ordinal. */
  label?: string;
};

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th');
}

/** Finishing-place chip: gold, silver, bronze gradients for the podium, neutral after. */
export function PlaceTag({ place, label }: PlaceTagProps) {
  return (
    <span className={['bx-place', place <= 3 ? `bx-place--${place}` : ''].join(' ')}>
      {label ?? ordinal(place)}
    </span>
  );
}

type RankDeltaProps = {
  value: number;
  /** Screen-reader text, pre-localised, e.g. "Up 2". */
  srLabel: string;
};

/** Rank movement since the last update: green up, red down, orange hold. */
export function RankDelta({ value, srLabel }: RankDeltaProps) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'hold';
  return (
    <span
      className={['bx-delta', dir === 'hold' ? '' : `bx-delta--${dir}`].join(' ')}
      title={srLabel}
    >
      <span className="bx-sr">{srLabel}</span>
      {dir === 'up' ? (
        <ArrowUp className="bx-icon" aria-hidden />
      ) : dir === 'down' ? (
        <ArrowDown className="bx-icon" aria-hidden />
      ) : (
        <span aria-hidden>•</span>
      )}
      <span aria-hidden>{Math.abs(value)}</span>
    </span>
  );
}

type MedalSetProps = { gold?: number; silver?: number; bronze?: number };

/** Gold / silver / bronze medal counts; zero still shows so rows line up. */
export function MedalSet({ gold = 0, silver = 0, bronze = 0 }: MedalSetProps) {
  const kinds: [string, number][] = [
    ['gold', gold],
    ['silver', silver],
    ['bronze', bronze],
  ];
  return (
    <span className="bx-medals">
      {kinds.map(([k, n]) => (
        <span
          key={k}
          className={['bx-medal', k === 'gold' ? '' : `bx-medal--${k}`].join(' ')}
          title={`${n} ${k}`}
        >
          <Medal className="bx-icon" aria-hidden />
          <span>{n}</span>
        </span>
      ))}
    </span>
  );
}
