type WordmarkProps = {
  showLabel?: boolean;
  size?: number;
};

/** Beat'Em All wordmark — violet square with "Bx" + optional name. */
export function Wordmark({ showLabel = true, size = 36 }: WordmarkProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="rounded-[10px] grid place-items-center font-display font-bold tracking-tight text-white"
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.42),
          background: 'linear-gradient(135deg, var(--violet) 0%, var(--violet-deep) 100%)',
          boxShadow: 'var(--sh-glow)',
        }}
        aria-hidden
      >
        Bx
      </div>
      {showLabel && (
        <span className="font-display font-medium text-lg tracking-tight text-white">
          Beat&apos;Em All
        </span>
      )}
    </div>
  );
}
