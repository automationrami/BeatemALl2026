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
  glass: 'bx-card bx-card--flat',
  flat: 'bx-card bx-card--flat',
  gradient: 'bx-podium min-h-0',
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
      <p
        className={['bx-eyebrow mb-3', variant === 'gradient' ? 'text-on-band-muted' : ''].join(
          ' ',
        )}
      >
        {label}
      </p>
      <p className={['bx-num text-[34px] mb-1.5', valueColor ? 'bx-gold-num' : ''].join(' ')}>
        {value}
      </p>
      {sub && (
        <p
          className={[
            'text-[13px] font-medium',
            subColor ? 'text-positive' : 'text-ink-muted',
          ].join(' ')}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
