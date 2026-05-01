/**
 * Persona seeds — 5 demo users (Khaled, Sara, Ahmad, Omar, Fatima) as real DB rows.
 *
 * Mirrors `packages/mock-data/src/player-profiles.ts` + `persona-context.ts`. The persona
 * switcher in `apps/web` resolves these by `slug` (formerly `personaId`) so any frontend
 * page rendered for an authenticated viewer just works without a sign-in flow.
 *
 * Idempotent: re-running upserts on `users.phone_number` (unique) and `players.user_id`
 * (unique 1:1).
 */

import type { UserInsert } from '../schema/users';
import type { PlayerInsert } from '../schema/players';

export type PersonaSeed = {
  /** Stable persona id used by the persona switcher and `/players/<slug>` URL. */
  slug: string;
  /** Phone number in E.164 — used as primary identifier per DOMAIN_MODEL.md §2.1. */
  phoneNumber: string;
  user: Omit<UserInsert, 'phoneNumber'>;
  player: Omit<PlayerInsert, 'userId' | 'slug'> & {
    /** Game slugs the persona competes in. Looked up at insert-time and inserted into player_games. */
    gameSlugs: string[];
    /** Optional in-game ID per game, in same order as gameSlugs. */
    inGameIds?: (string | null)[];
    /** Optional in-game rank per game. */
    inGameRanks?: (string | null)[];
  };
};

export const PERSONA_SEEDS: PersonaSeed[] = [
  {
    slug: 'khaled-al-mutairi',
    phoneNumber: '+96555504287',
    user: {
      email: 'khaled@beatemall.demo',
      displayName: 'Khaled Al-Mutairi',
      avatarUrl: null,
      locale: 'en',
      phoneVerifiedAt: new Date('2026-04-25T10:00:00Z'),
    },
    player: {
      countryCode: 'KW',
      city: 'Salmiya',
      bio: 'Valorant IGL · Sandstorm captain · KEC Spring ’26 finalist. Clutch is a habit.',
      timezone: 'Asia/Kuwait',
      civilIdVerifiedAt: new Date('2026-04-25T11:00:00Z'),
      civilIdProvider: 'manual',
      isOpenToTeamInvites: false,
      isProfilePublic: true,
      gameSlugs: ['valorant', 'eafc'],
      inGameIds: ['KHL#KWT', 'khaled_kw'],
      inGameRanks: ['Immortal 2', 'Division Rivals 4'],
    },
  },
  {
    slug: 'sara-al-awadhi',
    phoneNumber: '+96555100110',
    user: {
      email: 'sara@beatemall.demo',
      displayName: 'Sara Al-Awadhi',
      avatarUrl: null,
      locale: 'ar',
      phoneVerifiedAt: new Date('2026-04-26T09:00:00Z'),
    },
    player: {
      countryCode: 'KW',
      city: 'Hawally',
      bio: 'PUBG Mobile squad lead · Hawally · Women-only league regular.',
      timezone: 'Asia/Kuwait',
      isOpenToTeamInvites: true,
      isProfilePublic: true,
      gameSlugs: ['codm'],
      inGameIds: ['SARA#KW'],
      inGameRanks: ['Legendary'],
    },
  },
  {
    slug: 'ahmad-al-rashed',
    phoneNumber: '+96566001020',
    user: {
      email: 'ahmad@kec.org.kw',
      displayName: 'Ahmad Al-Rashed',
      avatarUrl: null,
      locale: 'en',
      phoneVerifiedAt: new Date('2026-04-20T08:00:00Z'),
    },
    player: {
      countryCode: 'KW',
      city: 'Kuwait City',
      bio: 'KEC Tournament Manager. Runs sanctioned Valorant, EAFC, and Tekken cups across Kuwait.',
      timezone: 'Asia/Kuwait',
      civilIdVerifiedAt: new Date('2026-04-20T09:00:00Z'),
      civilIdProvider: 'manual',
      isOpenToTeamInvites: false,
      isProfilePublic: true,
      gameSlugs: [],
    },
  },
  {
    slug: 'omar-al-saud',
    phoneNumber: '+966505551234',
    user: {
      email: 'omar@dxefuel.com',
      displayName: 'Omar Al-Saud',
      avatarUrl: null,
      locale: 'en',
      phoneVerifiedAt: new Date('2026-04-22T13:00:00Z'),
    },
    player: {
      countryCode: 'KSA',
      city: 'Riyadh',
      bio: 'DXE Fuel owner · Riyadh · EAFC casual. Books, doesn’t play — mostly.',
      timezone: 'Asia/Riyadh',
      civilIdVerifiedAt: new Date('2026-04-22T14:00:00Z'),
      civilIdProvider: 'manual',
      isOpenToTeamInvites: false,
      isProfilePublic: true,
      gameSlugs: ['eafc'],
      inGameIds: ['omar_ksa'],
      inGameRanks: ['Division Rivals 6'],
    },
  },
  {
    slug: 'fatima-al-mansour',
    phoneNumber: '+96599887766',
    user: {
      email: 'fatima@zain.com',
      displayName: 'Fatima Al-Mansour',
      avatarUrl: null,
      locale: 'ar',
      phoneVerifiedAt: new Date('2026-04-23T15:00:00Z'),
    },
    player: {
      countryCode: 'KW',
      city: 'Kuwait City',
      bio: 'Zain Kuwait marketing. Sponsors prize pools — one day I’ll qualify for one.',
      timezone: 'Asia/Kuwait',
      isOpenToTeamInvites: false,
      isProfilePublic: true,
      gameSlugs: [],
    },
  },
];
