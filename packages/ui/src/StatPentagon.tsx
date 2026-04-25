type StatPentagonProps = {
  /** 5 axes with 0–100 values. */
  axes: { label: string; value: number }[];
  /** Centred overall score (0.0–10.0). */
  overall: number;
  /** Bottom caption — e.g. "Calculated from 30 ranked matches". */
  caption?: string;
  /** Pixel size of the SVG (square). Defaults to 240. */
  size?: number;
};

/**
 * Signature pentagon stat visualization (per `DESIGN_KIT.md` §6.1 + the d2 prototype).
 *
 * - 5 axes evenly distributed at 72° starting from the top
 * - 4 background rings at 25/50/75/100
 * - Player polygon filled with a violet→cyan gradient
 * - Vertex dots in cyan
 * - Centred big number = `overall` (0–10 scale)
 * - Axis labels positioned outside each vertex
 */
export function StatPentagon({ axes, overall, caption, size = 240 }: StatPentagonProps) {
  if (axes.length !== 5) {
    throw new Error(`StatPentagon expects exactly 5 axes, got ${axes.length}`);
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.74;
  // Start at top (-90deg = 270deg in CSS), step 72deg clockwise
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;

  const ringPoints = (factor: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = angleFor(i);
      return `${cx + Math.cos(a) * radius * factor},${cy + Math.sin(a) * radius * factor}`;
    }).join(' ');

  const playerPoints = axes
    .map(({ value }, i) => {
      const a = angleFor(i);
      const f = Math.max(0, Math.min(1, value / 100));
      return `${cx + Math.cos(a) * radius * f},${cy + Math.sin(a) * radius * f}`;
    })
    .join(' ');

  const labelOffset = radius + 14;
  const labelPositions = axes.map(({ label, value }, i) => {
    const a = angleFor(i);
    const lx = cx + Math.cos(a) * labelOffset;
    const ly = cy + Math.sin(a) * labelOffset;
    return { label, value, lx, ly };
  });

  const ariaSummary = `Overall ${overall.toFixed(1)}; ${axes
    .map((a) => `${a.label} ${a.value}`)
    .join(', ')}.`;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`Stat pentagon. ${ariaSummary}`}
      >
        <defs>
          <linearGradient id="bx-pentagon-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="bx-pentagon-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>

        {/* Background rings */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={ringPoints(f)}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
        ))}

        {/* Spokes from centre to outer ring */}
        {Array.from({ length: 5 }, (_, i) => {
          const a = angleFor(i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(a) * radius}
              y2={cy + Math.sin(a) * radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          );
        })}

        {/* Player polygon */}
        <polygon
          points={playerPoints}
          fill="url(#bx-pentagon-fill)"
          stroke="url(#bx-pentagon-stroke)"
          strokeWidth={1.5}
        />

        {/* Vertex dots */}
        {axes.map(({ value }, i) => {
          const a = angleFor(i);
          const f = Math.max(0, Math.min(1, value / 100));
          return (
            <circle
              key={i}
              cx={cx + Math.cos(a) * radius * f}
              cy={cy + Math.sin(a) * radius * f}
              r={3.5}
              fill="#22D3EE"
            />
          );
        })}

        {/* Axis labels */}
        {labelPositions.map(({ label, value, lx, ly }) => (
          <g key={label}>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                font: '500 9px var(--f-mono)',
                fill: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.18em',
              }}
            >
              {label}
            </text>
            <text
              x={lx}
              y={ly + 11}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                font: '500 11px var(--f-display)',
                fill: 'rgba(255,255,255,0.78)',
                letterSpacing: '-0.01em',
              }}
            >
              {value}
            </text>
          </g>
        ))}

        {/* Centred overall score */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            font: '500 36px var(--f-display)',
            fill: '#FFFFFF',
            letterSpacing: '-0.04em',
          }}
        >
          {overall.toFixed(1)}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            font: '500 8px var(--f-mono)',
            fill: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.22em',
          }}
        >
          OVERALL
        </text>
      </svg>
      {caption && (
        <figcaption className="text-[11px] font-display text-[var(--t-4)] text-center mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
