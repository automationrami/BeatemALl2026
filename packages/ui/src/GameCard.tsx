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
        'relative w-full text-start p-4 rounded-2xl border transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)]',
        selected
          ? 'border-[rgba(139,92,246,0.45)] bg-[rgba(139,92,246,0.10)]'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)]',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div
        className="w-9 h-9 rounded-[9px] grid place-items-center mb-2.5 font-display font-bold text-[12px] tracking-tight text-white"
        style={{
          background: `linear-gradient(135deg, ${brandColor}55, ${brandColor}11)`,
          border: `1px solid ${brandColor}55`,
        }}
        aria-hidden
      >
        {shortName}
      </div>
      <div className="font-display font-medium text-[12px] text-white">{title}</div>

      {selected && (
        <span
          className="absolute top-2.5 end-2.5 w-[18px] h-[18px] rounded-full grid place-items-center font-display font-semibold text-[11px] text-white"
          style={{ background: 'var(--violet)' }}
          aria-hidden
        >
          ✓
        </span>
      )}
    </button>
  );
}
