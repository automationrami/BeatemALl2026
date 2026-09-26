'use client';

import { forwardRef } from 'react';
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonClass';

/** Legacy tone names from the violet kit; mapped onto the new variants. */
type LegacyTone = 'primary' | 'soft' | 'ghost' | 'danger';

const legacy: Record<LegacyTone, ButtonVariant> = {
  primary: 'gold',
  soft: 'ink',
  ghost: 'ghost',
  danger: 'danger',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** @deprecated use `variant`. */
  tone?: LegacyTone;
  size?: ButtonSize;
  full?: boolean;
};

/** Uppercase tracked button on a 44px target. Gold is the one action the screen exists for. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, tone, size = 'md', full, className = '', children, ...rest },
  ref,
) {
  const v: ButtonVariant = variant ?? (tone ? legacy[tone] : 'ink');
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      className={buttonClass(v, size, full, className)}
      {...rest}
    >
      {children}
    </button>
  );
});
