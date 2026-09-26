'use client';

import { forwardRef } from 'react';

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  invalid?: boolean;
};

/**
 * Brand text input matching the prototype "Field/Input" pair.
 * Supports prefix slot (e.g. country dial dropdown) and suffix slot (e.g. unit / status).
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { prefix, suffix, invalid, className = '', ...rest },
  ref,
) {
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-md border bg-surface-200 px-3.5 h-11 transition-shadow',
        invalid
          ? 'border-negative'
          : 'border-line-strong focus-within:border-transparent focus-within:shadow-[var(--focus-ring)]',
        className,
      ].join(' ')}
    >
      {prefix && <span className="font-display font-bold text-xs text-ink-muted">{prefix}</span>}
      <input
        ref={ref}
        className="bg-transparent border-none outline-none text-ink font-display font-medium text-[15px] flex-1 h-full min-w-0 placeholder:text-ink-muted"
        {...rest}
      />
      {suffix && <span className="font-display font-bold text-xs text-ink-muted">{suffix}</span>}
    </div>
  );
});

type FieldProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
};

/** Form field wrapper with eyebrow label + hint + inline error. */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      {label && <span className="bx-eyebrow block mb-2">{label}</span>}
      {children}
      {error ? (
        <span className="block mt-1.5 text-[13px] font-medium text-negative">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-[13px] font-medium text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}
