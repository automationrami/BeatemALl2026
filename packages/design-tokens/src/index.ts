// @beat-em-all/design-tokens — Championship Gold (2026-09-26).
// TS mirror of tokens.css (night theme values). Prefer the CSS variables in components;
// use these constants only where a raw value is unavoidable (canvas, OG images, emails).

export const surfaces = {
  s000: '#0D0C0A', // page ground
  s100: '#161512', // cards, rows, rail
  s200: '#1F1D19', // inset trays
  s300: '#2A2722', // hover, pressed, ink buttons
  band: '#050504', // heavy black band
} as const;

export const lines = {
  base: 'rgba(255,255,255,0.08)',
  strong: 'rgba(255,255,255,0.18)',
} as const;

export const ink = {
  primary: '#F4F1EA',
  muted: '#ABA59A',
  faint: '#7A756C',
  onBand: '#FFFFFF',
  onGold: '#17120A',
} as const;

export const gold = {
  g100: '#F2C575',
  g300: '#BE9E59',
  g500: '#987C4B',
  g700: '#4E442D',
  text: '#C9A862',
  textHi: '#F5D08A',
} as const;

export const medals = {
  gold: '#C9A862',
  silver: '#B3B3B3',
  bronze: '#B8733A',
} as const;

export const semantic = {
  positive: '#3DD68C',
  negative: '#FF6B5E',
  live: '#D42A00',
  info: '#6E9BFF',
  flare: '#F4890F',
  ember: '#FF3600',
} as const;

export const gradients = {
  gold: 'radial-gradient(122.78% 179% at 50.21% 0%, #F2C575 0%, #987C4B 40.5%, #4E442D 92.88%)',
  silver: 'radial-gradient(50% 100% at 50% 0%, #A6A6A6 0%, #727272 100%)',
  bronze: 'radial-gradient(50% 100% at 50% 0%, #93551B 0%, #683C13 100%)',
  fire: 'linear-gradient(90deg, #FF3600 -11.3%, #D1B26E 50.85%)',
} as const;

export const fonts = {
  display: "'Saira', 'Tajawal', 'Arial Narrow', system-ui, sans-serif",
  arabic: "'Tajawal', 'Saira', 'Segoe UI', Tahoma, sans-serif",
} as const;

export const radii = {
  medal: '3px',
  chip: '4px',
  sm: '6px',
  md: '8px',
  tile: '14px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  pill: '999px',
} as const;

/** Default accent for a team or player with no colour of their own. */
export const DEFAULT_ACCENT = gold.g500;

export const tokens = { surfaces, lines, ink, gold, medals, semantic, gradients, fonts, radii };
export default tokens;
