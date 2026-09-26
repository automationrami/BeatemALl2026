import { Check } from 'lucide-react';

type AvatarProps = {
  /** Used to derive the 2-letter initials and the accessible label. */
  name: string;
  /** Pixel size (square). */
  size?: number;
  /** Kept for API compatibility; avatars are neutral in Championship Gold. */
  color?: string;
  /** Gold ring + check badge: only when the player is Civil-ID verified. */
  verified?: boolean;
  src?: string | null;
  /** Accessible title for the verified badge, pre-localised. */
  verifiedLabel?: string;
};

/** Player photo or initials in a circle, with the gold verified ring. */
export function Avatar({ name, size = 44, verified, src, verifiedLabel }: AvatarProps) {
  const initials =
    name
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BX';
  return (
    <span
      className={['bx-avatar', verified ? 'bx-avatar--verified' : ''].join(' ')}
      style={{ '--size': `${size}px` } as React.CSSProperties}
      role="img"
      aria-label={name}
    >
      {src ? <img src={src} alt="" /> : initials}
      {verified && (
        <span className="bx-avatar__badge" title={verifiedLabel}>
          <Check className="bx-icon" aria-hidden />
        </span>
      )}
    </span>
  );
}
