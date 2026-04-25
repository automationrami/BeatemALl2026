'use client';

import { forwardRef } from 'react';

type Tone = 'primary' | 'soft' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const toneClasses: Record<Tone, string> = {
  primary:
    'border-[rgba(167,139,250,0.5)] text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] bg-[linear-gradient(180deg,#9F7BFA,#7C3AED)] hover:brightness-110',
  soft: 'border-[var(--line-2)] text-white bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]',
  ghost: 'border-[var(--line-2)] text-white bg-transparent hover:bg-[rgba(255,255,255,0.04)]',
  danger:
    'border-[rgba(251,113,133,0.3)] text-[var(--coral-2)] bg-[rgba(251,113,133,0.10)] hover:bg-[rgba(251,113,133,0.18)]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3.5 text-base',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: Size;
  full?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tone = 'soft', size = 'md', full, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl border font-medium font-display tracking-tight transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)]',
        toneClasses[tone],
        sizeClasses[size],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
});
