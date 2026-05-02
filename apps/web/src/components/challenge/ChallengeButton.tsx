'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@beat-em-all/ui';
import { ChallengeModal } from './ChallengeModal';

type Props = {
  /** Slug of the team being challenged. */
  targetTeamSlug: string;
  /** Display name of the target team. */
  targetTeamName: string;
  /** Game slugs the target team plays — used to compute shared-games intersection client-side
   *  (the server re-validates). */
  targetTeamGames: string[];
  /** Map of game slug → display name (so we don't have to import GAMES inside the modal). */
  gameLabels: Record<string, string>;
};

/**
 * Renders the primary "Challenge team" CTA on a team profile, plus the modal.
 *
 * Click handler opens the modal. The modal handles loading the current persona's primary
 * team server-side (via `/api/me`-equivalent — for Phase 1 it's an inline server fetch
 * helper). On success it closes itself and navigates to the new challenge detail.
 */
export function ChallengeButton({
  targetTeamSlug,
  targetTeamName,
  targetTeamGames,
  gameLabels,
}: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('team');

  return (
    <>
      <Button tone="primary" size="sm" onClick={() => setOpen(true)}>
        {t('challengeTeam')} →
      </Button>
      {open ? (
        <ChallengeModal
          targetTeamSlug={targetTeamSlug}
          targetTeamName={targetTeamName}
          targetTeamGames={targetTeamGames}
          gameLabels={gameLabels}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
