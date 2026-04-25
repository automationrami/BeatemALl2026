// @beat-em-all/design-tokens — Brand tokens extracted from the Claude Design bundle.
// Exposed as TS constants for app code AND as Tailwind preset + raw CSS for global imports.

export const surfaces = {
  bg0: '#0A0B0F', // canvas
  bg1: '#0F1015',
  bg2: '#14161D', // card flat
  bg3: '#1A1D26',
  bgElev: '#1E212C',
} as const;

export const lines = {
  base: 'rgba(255,255,255,0.06)',
  strong: 'rgba(255,255,255,0.10)',
  emphasis: 'rgba(255,255,255,0.18)',
} as const;

export const text = {
  t1: '#FFFFFF',
  t2: 'rgba(255,255,255,0.78)',
  t3: 'rgba(255,255,255,0.55)',
  t4: 'rgba(255,255,255,0.35)',
  t5: 'rgba(255,255,255,0.18)',
} as const;

export const brand = {
  violet: '#8B5CF6',
  violet2: '#A78BFA',
  violetDeep: '#5B21B6',
  violetGlow: 'rgba(139,92,246,0.35)',
  cyan: '#06B6D4',
  cyan2: '#22D3EE',
  coral: '#FB7185',
  coral2: '#FDA4AF',
  lime: '#BEF264',
  amber: '#FBBF24',
} as const;

export const country = {
  kw: '#FB7185', // Kuwait
  ksa: '#A78BFA', // Saudi
  ae: '#22D3EE', // U.A.E.
  bh: '#BEF264', // Bahrain
  qa: '#FBBF24', // Qatar
  om: '#FDA4AF', // Oman
} as const;

export const semantic = {
  positive: '#BEF264',
  negative: '#FB7185',
  warn: '#FBBF24',
  info: '#22D3EE',
  live: '#FB7185',
} as const;

export const fonts = {
  display: "'Space Grotesk', 'Söhne', 'Neue Haas Grotesk Display', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace",
  arabic: "'IBM Plex Sans Arabic', system-ui, sans-serif",
  bodyEn: "'Inter', system-ui, sans-serif",
} as const;

export const radii = {
  sm: '8px',
  md: '14px',
  lg: '20px',
  xl: '28px',
} as const;

export const fontSize = {
  hero: '96px',
  display: '72px',
  h1: '52px',
  h2: '40px',
  h3: '28px',
  h4: '20px',
  body: '14px',
  sm: '12.5px',
  xs: '11px',
  mono: '11px',
  numXl: '96px',
  numL: '56px',
  numM: '38px',
  numS: '22px',
} as const;

export const shadows = {
  card: '0 1px 0 rgba(255,255,255,.04) inset, 0 0 0 1px rgba(255,255,255,.05), 0 30px 60px -30px rgba(0,0,0,.6)',
  glow: '0 0 0 1px rgba(139,92,246,.35), 0 0 60px -10px rgba(139,92,246,.45)',
  prize: '0 0 0 1px rgba(139,92,246,.08), 0 30px 80px -30px rgba(139,92,246,.45)',
} as const;

export const tokens = {
  surfaces,
  lines,
  text,
  brand,
  country,
  semantic,
  fonts,
  radii,
  fontSize,
  shadows,
};
export default tokens;
