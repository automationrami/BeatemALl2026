import type { Game, GameId } from '@beat-em-all/types';

export const GAMES: Record<GameId, Game> = {
  cs2: {
    id: 'cs2',
    shortName: 'CS2',
    title: 'Counter-Strike 2',
    publisher: 'Valve',
    mvp: false, // Phase 1.5 per PRODUCT_VISION.md §8
    brandColor: '#FBBF24',
    primaryPlatform: 'pc',
  },
  valorant: {
    id: 'valorant',
    shortName: 'VAL',
    title: 'VALORANT',
    publisher: 'Riot Games',
    mvp: false, // Phase 1.5 per PRODUCT_VISION.md §8
    brandColor: '#FB7185',
    primaryPlatform: 'pc',
  },
  lol: {
    id: 'lol',
    shortName: 'LoL',
    title: 'League of Legends',
    publisher: 'Riot Games',
    mvp: false,
    brandColor: '#22D3EE',
    primaryPlatform: 'pc',
  },
  eafc: {
    id: 'eafc',
    shortName: 'EAFC',
    title: 'EA FC 25',
    publisher: 'EA Sports',
    mvp: true,
    brandColor: '#BEF264',
    primaryPlatform: 'cross',
  },
  codm: {
    id: 'codm',
    shortName: 'CoD',
    title: 'Call of Duty: Mobile',
    publisher: 'Activision',
    mvp: true,
    brandColor: '#A78BFA',
    primaryPlatform: 'mobile',
  },
  tekken8: {
    id: 'tekken8',
    shortName: 'TKN',
    title: 'Tekken 8',
    publisher: 'Bandai Namco',
    mvp: true,
    brandColor: '#FDA4AF',
    primaryPlatform: 'console',
  },
};

export const GAMES_LIST: Game[] = Object.values(GAMES);
export const MVP_GAMES: Game[] = GAMES_LIST.filter((g) => g.mvp);
