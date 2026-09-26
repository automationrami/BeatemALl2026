import { Tag } from '@beat-em-all/ui';

type Props = {
  /** Relative date label, e.g. "2d". */
  date: string;
  /** "Sandstorm vs Falcon Squad". */
  opponentLabel: string;
  /** "13–9". */
  scoreLabel: string;
  result: 'W' | 'L' | 'D';
  /** Pre-localised short result, e.g. "W" / "ف". */
  resultLabel: string;
  /** Game short name, e.g. "VAL". */
  gameTag: string;
  /** Tournament matches get the soft gold tray. */
  isTournament?: boolean;
  /** Pre-localised label for the tournament tag. */
  tournamentLabel?: string;
};

const resultClass: Record<Props['result'], string> = {
  W: 'bg-positive-soft text-positive',
  L: 'bg-negative-soft text-negative',
  D: '',
};

/** One row of a player's match history: when, who, game, score and result. */
export function ProfileMatchRow({
  date,
  opponentLabel,
  scoreLabel,
  result,
  resultLabel,
  gameTag,
  isTournament,
  tournamentLabel,
}: Props) {
  return (
    <li
      className={[
        'grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md px-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto]',
        isTournament ? 'bg-gold-soft' : '',
      ].join(' ')}
    >
      <span className="bx-eyebrow">{date.toUpperCase()}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <b className="min-w-0 truncate font-display text-[15px] text-ink" dir="auto">
          {opponentLabel}
        </b>
        {isTournament && tournamentLabel && <Tag tone="soft">{tournamentLabel}</Tag>}
      </span>
      <span className="hidden sm:inline-flex">
        <Tag>{gameTag}</Tag>
      </span>
      <span className="flex items-center justify-end gap-2.5">
        <span className="bx-num font-display text-[18px] font-bold text-ink" dir="ltr">
          {scoreLabel}
        </span>
        <Tag className={['min-w-6 justify-center', resultClass[result]].join(' ')}>
          {resultLabel}
        </Tag>
      </span>
    </li>
  );
}
