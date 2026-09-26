type TeamCrestProps = {
  /** 2–6 char team tag, e.g. "SND". Will be uppercased. */
  tag: string;
  /** Team colour from the team record. */
  color?: string;
  /** Pixel size (square). */
  size?: number;
  /** Uploaded logo; when present it replaces the tag. */
  src?: string | null;
  /** Accessible name. Omit when the team name is already next to the crest. */
  label?: string;
};

/**
 * Team mark (Championship Gold `Crest`): the uploaded logo, or the tag in white on the
 * team colour. The size and colour are per-team data, so they travel as CSS custom
 * properties read by `.bx-crest` in styles.css.
 */
export function TeamCrest({ tag, color, size = 56, src, label }: TeamCrestProps) {
  const vars = {
    '--size': `${size}px`,
    ...(color ? { '--crest': color } : {}),
  } as React.CSSProperties;
  return (
    <span
      className={['bx-crest', src ? 'bx-crest--img' : ''].join(' ')}
      style={vars}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {src ? <img src={src} alt="" /> : tag.slice(0, 4).toUpperCase()}
    </span>
  );
}
