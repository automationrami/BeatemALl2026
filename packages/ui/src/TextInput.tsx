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
        'flex items-center gap-2 rounded-xl border bg-[rgba(255,255,255,0.03)] px-3.5 h-11 transition-colors',
        invalid
          ? 'border-[rgba(251,113,133,0.5)]'
          : 'border-[var(--line-2)] focus-within:border-[rgba(167,139,250,0.5)]',
        className,
      ].join(' ')}
    >
      {prefix && <span className="font-mono text-xs text-[var(--t-3)]">{prefix}</span>}
      <input
        ref={ref}
        className="bg-transparent border-none outline-none text-white font-display font-medium text-[14px] flex-1 h-full placeholder:text-[var(--t-4)]"
        {...rest}
      />
      {suffix && <span className="font-mono text-xs text-[var(--t-4)]">{suffix}</span>}
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
      {label && <span className="bx-eyebrow block mb-2 text-[var(--t-3)]">{label}</span>}
      {children}
      {error ? (
        <span className="block mt-1.5 text-[11px] font-display text-[var(--coral-2)]">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-[11px] font-display text-[var(--t-4)]">{hint}</span>
      ) : null}
    </label>
  );
}
