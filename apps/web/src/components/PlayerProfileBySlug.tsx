'use client';

import { getPlayerProfileForSlug } from '@beat-em-all/api-client';
import { PlayerProfileViewFor } from './PlayerProfileView';

type Props = { slug: string };

/** Renders any player's profile by slug — used at /players/[slug]. */
export function PlayerProfileBySlug({ slug }: Props) {
  const profile = getPlayerProfileForSlug(slug);
  if (!profile) return null;
  return <PlayerProfileViewFor profile={profile} />;
}
