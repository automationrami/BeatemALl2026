// Game catalog — matches PRODUCT_VISION.md §8 and DOMAIN_MODEL.md.
// Six MVP launch titles where physical-venue play is already a behavior in the GCC.

export const GAME_IDS = ['cs2', 'valorant', 'lol', 'eafc', 'codm', 'tekken8'] as const;
export type GameId = (typeof GAME_IDS)[number];

export type Game = {
  id: GameId;
  /** Short display tag used in cards and tournament headers */
  shortName: string;
  /** Full game title */
  title: string;
  /** Publisher / studio name */
  publisher: string;
  /** Whether this title ships in MVP (Phase 1) or post-MVP per PRODUCT_VISION.md §8 */
  mvp: boolean;
  /** Brand-color hex used to tint per-game cards */
  brandColor: string;
  /** Whether the game is mobile-first (PUBG Mobile, CoD Mobile) or PC/console */
  primaryPlatform: 'pc' | 'console' | 'mobile' | 'cross';
};
