type WordmarkProps = {
  showLabel?: boolean;
  /** Pixel size of the monogram tile; 28 = sm, 36 = md, 56 = lg. */
  size?: number;
};

/** Beat'Em All wordmark: the gold "Bx" tile + the name in Saira Black Italic. Type only; no drawn logo. */
export function Wordmark({ showLabel = true, size = 36 }: WordmarkProps) {
  const variant = size <= 30 ? 'bx-wordmark--sm' : size >= 52 ? 'bx-wordmark--lg' : '';
  return (
    <span className={['bx-wordmark', variant].join(' ')} aria-label="Beat'Em All">
      <span className="bx-wordmark__tile" aria-hidden>
        Bx
      </span>
      {showLabel && (
        <span className="bx-wordmark__name" aria-hidden>
          Beat&apos;Em All
        </span>
      )}
    </span>
  );
}
