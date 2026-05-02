'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@beat-em-all/ui';

type Props = {
  challengeId: string;
  /** Server pre-computed flag — true when the current persona belongs to the challenged team
   *  AND the challenge is in a pending/negotiating state, so Accept + Reject are shown. */
  canAct: boolean;
  /** Server pre-computed user-facing reason when canAct is false (e.g. "switch persona"). */
  cannotActReason?: string | null;
};

/**
 * Accept / Reject buttons for the challenge detail page.
 *
 * Accept hits PATCH `/api/challenges/[id]` with action=accept; on success refreshes the
 * page so the updated status + new match link render. Same for reject.
 */
export function ChallengeActions({ challengeId, canAct, cannotActReason }: Props) {
  const t = useTranslations('challenge');
  const router = useRouter();
  useLocale();

  const [busy, setBusy] = useState<null | 'accept' | 'reject'>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: 'accept' | 'reject') => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  if (!canAct) {
    return (
      <p className="text-[var(--t-4)] text-[12px] leading-relaxed">
        {cannotActReason ?? t('youCannotAct')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          tone="primary"
          size="md"
          onClick={() => act('accept')}
          disabled={busy !== null}
          data-testid="accept-challenge"
        >
          {busy === 'accept' ? t('acceptingCta') : t('acceptCta')}
        </Button>
        <Button
          tone="danger"
          size="md"
          onClick={() => act('reject')}
          disabled={busy !== null}
          data-testid="reject-challenge"
        >
          {busy === 'reject' ? t('rejectingCta') : t('rejectCta')}
        </Button>
      </div>
      {error ? (
        <p className="text-[var(--coral-2)] text-[12px] leading-relaxed">
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
