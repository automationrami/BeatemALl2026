import { Pill } from './Pill';

type MatchRowProps = {
  /** Relative date label, e.g. "2D", "1W". Will be uppercased. */
  date: string;
  /** Display label like "Sandstorm vs Falcon Squad". */
  opponentLabel: string;
  /** Score string, e.g. "13–9". */
  scoreLabel: string;
  /** Outcome from the active player's perspective. */
  result: 'W' | 'L' | 'D';
  /** Game short-name pill (e.g. "VAL", "CS2"). */
  gameTag: string;
  /** Whether to highlight as a tournament match. */
  isTournament?: boolean;
};

const resultTone = {
  W: 'lime',
  L: 'coral',
  D: 'default',
} as const;

/**
 * Compact match row: date · opponent · game pill · score + W/L badge.
 * Reused on Player Profile, Team Profile, and inside Tournament views.
 */
export function MatchRow({
  date,
  opponentLabel,
  scoreLabel,
  result,
  gameTag,
  isTournament,
}: MatchRowProps) {
  return (
    <div
      className={[
        'grid items-center gap-3 px-3 py-3 border-b border-line last:border-b-0',
        'grid-cols-[2.25rem_1fr_auto_auto]',
        isTournament ? 'bg-gold-soft rounded-md' : '',
      ].join(' ')}
    >
      <span className="bx-eyebrow">{date.toUpperCase()}</span>
      <span className="font-display font-bold text-[15px] text-ink truncate">{opponentLabel}</span>
      <Pill>{gameTag}</Pill>
      <span className="flex items-center gap-2.5">
        <span className="bx-num text-[18px] text-ink">{scoreLabel}</span>
        <Pill tone={resultTone[result]}>{result}</Pill>
      </span>
    </div>
  );
}
