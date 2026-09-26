'use client';

import type { PlayerProfile } from '@beat-em-all/types';
import { PlayerProfileViewFor } from './PlayerProfileView';

type Props = {
  profile: PlayerProfile;
  /** Server-computed: the viewer is this player (shows "Edit profile"). */
  isSelf?: boolean;
};

/**
 * Thin renderer — receives a pre-loaded `PlayerProfile` from its parent (the Server
 * Component at `/[locale]/players/[slug]/page.tsx`). Server-side data load happens
 * once via `loadPlayerProfileBySlug` against the DB; we don't re-fetch here.
 */
export function PlayerProfileBySlug({ profile, isSelf }: Props) {
  return <PlayerProfileViewFor profile={profile} isSelf={isSelf} />;
}
