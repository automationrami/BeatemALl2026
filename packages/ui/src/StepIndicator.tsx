type StepIndicatorProps = {
  step: number;
  total: number;
  /** Eyebrow label, e.g. "STEP 4 OF 7" — already localised by caller. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
};

/** Bilateral progress bar matching the prototype's StepHeader. */
export function StepIndicator({ step, total, eyebrow, title, subtitle }: StepIndicatorProps) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="bx-eyebrow mb-2.5">{eyebrow}</div>}
      {title && <h2 className="bx-display mb-2">{title}</h2>}
      {subtitle && (
        <div className="font-display font-medium text-[15px] text-ink-muted max-w-[520px]">
          {subtitle}
        </div>
      )}
      <div
        className="flex gap-1.5 mt-4"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={[
              'flex-1 h-[4px] rounded-chip',
              i < step ? 'bg-[image:var(--gradient-gold)]' : 'bg-surface-300',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
