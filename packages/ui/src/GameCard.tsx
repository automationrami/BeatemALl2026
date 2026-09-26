'use client';

type GameCardProps = {
  shortName: string;
  title: string;
  brandColor: string;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
};

/** Selectable game tile. Used in onboarding step 4 + tournament-creation game pickers. */
export function GameCard({
  shortName,
  title,
  brandColor,
  selected,
  onToggle,
  disabled,
}: GameCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'relative w-full text-start p-4 rounded-tile transition-colors shadow-bx-card',
        selected
          ? 'bg-band text-on-band ring-2 ring-gold-500'
          : 'bg-surface-100 text-ink hover:bg-surface-200',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div
        className="mb-2.5 font-display text-[18px] font-extrabold italic uppercase leading-none tracking-[0.02em]"
        data-brand={brandColor}
        aria-hidden
      >
        {shortName}
      </div>
      <div className="font-display font-medium text-[13px]">{title}</div>

      {selected && (
        <span
          className="absolute top-2.5 end-2.5 size-[20px] rounded-full grid place-items-center bg-[image:var(--gradient-gold)] text-on-gold font-display font-extrabold text-[11px]"
          aria-hidden
        >
          ✓
        </span>
      )}
    </button>
  );
}
