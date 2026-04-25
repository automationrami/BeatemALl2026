type TeamCrestProps = {
  /** 2–6 char team tag, e.g. "SND". Will be uppercased. */
  tag: string;
  /** Hex accent for the gradient fill. */
  color: string;
  /** Pixel size (square). */
  size?: number;
};

/**
 * Team identity tile — a rounded square with the team tag in display font.
 * Sister component to <Avatar/> for players.
 */
export function TeamCrest({ tag, color, size = 56 }: TeamCrestProps) {
  return (
    <div
      className="grid place-items-center font-display font-bold text-white border border-white/10 shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, Math.round(size * 0.18)),
        background: `linear-gradient(135deg, ${color}, ${color}77)`,
        fontSize: Math.round(size * 0.32),
        letterSpacing: '-0.04em',
      }}
      aria-hidden
    >
      {tag.slice(0, 4).toUpperCase()}
    </div>
  );
}
