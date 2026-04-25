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
      {title && (
        <h2 className="font-display font-medium text-[36px] leading-[1.05] tracking-[-0.03em] mb-1.5">
          {title}
        </h2>
      )}
      {subtitle && (
        <div className="font-display font-normal text-[14px] text-[var(--t-3)] max-w-[520px]">
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
              'flex-1 h-[3px] rounded-[2px]',
              i < step
                ? 'bg-[linear-gradient(90deg,#A78BFA,#7C3AED)]'
                : 'bg-[rgba(255,255,255,0.08)]',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
