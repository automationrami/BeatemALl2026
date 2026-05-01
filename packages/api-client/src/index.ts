// @beat-em-all/api-client — Typed data-access layer.
// Phase 2 (E1): mock auth + persona store + player-profile reads.
// Phase 3 (E2): team reads.
// Phase 9: function bodies replaced with Supabase calls. Same shapes, callers don't change.

export * from './persona-store';
export * from './auth';
export * from './home';
export * from './player';
export * from './team';

export const API_CLIENT_VERSION = '0.0.5';
