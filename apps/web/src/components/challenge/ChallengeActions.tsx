'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Info, X } from 'lucide-react';
import { Button, Notice } from '@beat-em-all/ui';

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
      <Notice tone="neutral" icon={<Info className="bx-icon" aria-hidden />}>
        {cannotActReason ?? t('youCannotAct')}
      </Notice>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="gold"
          onClick={() => act('accept')}
          disabled={busy !== null}
          data-testid="accept-challenge"
          className="grow min-[600px]:grow-0"
        >
          <Check className="bx-icon" aria-hidden />
          {busy === 'accept' ? t('acceptingCta') : t('acceptCta')}
        </Button>
        <Button
          variant="danger"
          onClick={() => act('reject')}
          disabled={busy !== null}
          data-testid="reject-challenge"
          className="grow min-[600px]:grow-0"
        >
          <X className="bx-icon" aria-hidden />
          {busy === 'reject' ? t('rejectingCta') : t('rejectCta')}
        </Button>
      </div>
      {error ? (
        <p className="text-[13px] font-medium text-negative" role="alert">
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
