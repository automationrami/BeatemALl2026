type AvatarProps = {
  /** Used to derive the 2-letter initials. */
  name: string;
  /** Pixel size (square). */
  size?: number;
  /** Hex accent colour for the linear-gradient fill. Falls back to brand violet. */
  color?: string;
  /** Adds an outer verified-ring gradient (use only when player is Civil-ID verified). */
  verified?: boolean;
};

/**
 * Initials avatar with an optional verified ring.
 * Reused for player profile hero, match rows, persona switcher, team rosters.
 */
export function Avatar({ name, size = 44, color = '#8B5CF6', verified }: AvatarProps) {
  const initials =
    name
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BX';

  const ring = verified ? 4 : 0;
  const inner = size - ring * 2;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      {verified && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 90deg, #A78BFA, #22D3EE, #BEF264, #A78BFA)',
            padding: ring,
          }}
        />
      )}
      <div
        className="relative rounded-full grid place-items-center font-display font-semibold text-white border border-white/15"
        style={{
          width: inner,
          height: inner,
          fontSize: Math.round(inner * 0.36),
          background: `linear-gradient(135deg, ${color}, ${color}77)`,
          letterSpacing: '-0.02em',
        }}
      >
        {initials}
      </div>
    </div>
  );
}
