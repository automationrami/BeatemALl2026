export type ButtonVariant = 'gold' | 'ink' | 'band' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Class string for a Championship Gold button. Safe on the server: use it on a Next
 * <Link> when a button must navigate: `<Link className={buttonClass('gold')} …>`.
 */
export function buttonClass(
  variant: ButtonVariant = 'ink',
  size: ButtonSize = 'md',
  full = false,
  extra = '',
) {
  return [
    'bx-btn',
    `bx-btn--${variant === 'danger' ? 'ink' : variant}`,
    variant === 'danger' ? 'text-negative' : '',
    size === 'sm' ? 'bx-btn--sm' : '',
    size === 'lg' ? 'min-h-[52px] px-8' : '',
    full ? 'bx-btn--block' : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}
