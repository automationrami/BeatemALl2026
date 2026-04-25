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
        'grid items-center gap-3 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-b-0',
        'grid-cols-[2.25rem_1fr_auto_auto]',
        isTournament ? 'pl-3 -ml-3 border-s-2 border-s-[var(--violet-2)]' : '',
      ].join(' ')}
    >
      <span className="bx-eyebrow text-[10px]">{date.toUpperCase()}</span>
      <span className="font-display font-medium text-[14px] text-white truncate">
        {opponentLabel}
      </span>
      <Pill>{gameTag}</Pill>
      <span className="flex items-center gap-2.5">
        <span className="bx-num text-[18px]">{scoreLabel}</span>
        <Pill tone={resultTone[result]}>{result}</Pill>
      </span>
    </div>
  );
}
