type Tone = 'default' | 'violet' | 'cyan' | 'coral' | 'lime' | 'amber';

type PillProps = {
  tone?: Tone;
  /** When true, prefixes the pill with a small coloured dot. */
  dot?: boolean;
  children: React.ReactNode;
};

const tones: Record<Tone, { bg: string; fg: string; bd: string }> = {
  default: {
    bg: 'rgba(255,255,255,0.04)',
    fg: 'rgba(255,255,255,0.78)',
    bd: 'rgba(255,255,255,0.10)',
  },
  violet: {
    bg: 'rgba(139,92,246,0.14)',
    fg: '#A78BFA',
    bd: 'rgba(139,92,246,0.30)',
  },
  cyan: {
    bg: 'rgba(6,182,212,0.12)',
    fg: '#22D3EE',
    bd: 'rgba(6,182,212,0.30)',
  },
  coral: {
    bg: 'rgba(251,113,133,0.12)',
    fg: '#FDA4AF',
    bd: 'rgba(251,113,133,0.30)',
  },
  lime: {
    bg: 'rgba(190,242,100,0.12)',
    fg: '#BEF264',
    bd: 'rgba(190,242,100,0.30)',
  },
  amber: {
    bg: 'rgba(251,191,36,0.12)',
    fg: '#FBBF24',
    bd: 'rgba(251,191,36,0.30)',
  },
};

/** Inline status / category pill. Used everywhere — verified badges, game tags, result chips. */
export function Pill({ tone = 'default', dot, children }: PillProps) {
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-display font-medium text-[10.5px] tracking-[0.06em] uppercase"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}
    >
      {dot && (
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: t.fg, boxShadow: `0 0 8px ${t.fg}` }}
        />
      )}
      {children}
    </span>
  );
}
