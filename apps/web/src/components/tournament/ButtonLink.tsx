'use client';

import Link from 'next/link';
import { buttonClass, type ButtonVariant } from '@beat-em-all/ui';

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
};

/**
 * A Next <Link> styled as a Championship Gold button. `buttonClass()` lives in the
 * `'use client'` Button module, so Server Components cannot call it directly; this
 * client wrapper calls it for them.
 */
export function ButtonLink({
  variant = 'ink',
  size = 'md',
  full = false,
  className = '',
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, full, className)} {...rest} />;
}
