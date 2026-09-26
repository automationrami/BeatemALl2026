type Tone = 'default' | 'violet' | 'cyan' | 'coral' | 'lime' | 'amber' | 'gold' | 'ink' | 'live';

type PillProps = {
  tone?: Tone;
  /** When true, prefixes the pill with a small status dot. */
  dot?: boolean;
  children: React.ReactNode;
};

/* Legacy tones map onto Championship Gold tags. */
const toneClass: Record<Tone, string> = {
  default: '',
  violet: 'bx-tag--soft',
  gold: 'bx-tag--gold',
  cyan: 'bx-tag--paper',
  ink: 'bx-tag--ink',
  coral: 'bg-negative-soft text-negative',
  lime: 'bg-positive-soft text-positive',
  amber: 'bg-[color-mix(in_oklab,var(--flare)_18%,transparent)] text-flare',
  live: 'bx-tag--live',
};

/** Inline status / category chip. Used for verified badges, game tags and result chips. */
export function Pill({ tone = 'default', dot, children }: PillProps) {
  return (
    <span className={['bx-tag', toneClass[tone]].join(' ')}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
