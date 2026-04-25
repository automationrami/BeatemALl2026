type StatCardProps = {
  /** Eyebrow label, ALL CAPS uppercase already. */
  label: string;
  /** Big number — pre-formatted (e.g. "10,247", "68%", "W7"). */
  value: string;
  /** Optional small caption under the number. */
  sub?: string;
  /** Optional accent colour for the big number (e.g. lime for streaks). Defaults to white. */
  valueColor?: string;
  /** Optional sub-text colour (e.g. "+12% W/W" in lime). */
  subColor?: string;
  /** `glass` | `flat` | `gradient` — matches the prototype card variants. */
  variant?: 'glass' | 'flat' | 'gradient';
};

const variantClasses: Record<NonNullable<StatCardProps['variant']>, string> = {
  glass: 'bx-card',
  flat: 'rounded-[20px] border border-[var(--line)] bg-[var(--bg-2)]',
  gradient:
    'rounded-[20px] border border-[rgba(167,139,250,0.18)] bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(6,182,212,0.06)_45%,rgba(251,113,133,0.10)_100%),linear-gradient(180deg,#16131F,#0F1015)] shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_30px_80px_-30px_rgba(139,92,246,0.45)]',
};

/** Atomic stat card — eyebrow + big number + optional sub. Variants from the prototype. */
export function StatCard({
  label,
  value,
  sub,
  valueColor,
  subColor,
  variant = 'flat',
}: StatCardProps) {
  return (
    <div className={`p-5 ${variantClasses[variant]}`}>
      <p className="bx-eyebrow mb-3">{label}</p>
      <p className="bx-num text-[40px] mb-1" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {sub && (
        <p className="text-xs font-display" style={{ color: subColor ?? 'var(--t-4)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}
