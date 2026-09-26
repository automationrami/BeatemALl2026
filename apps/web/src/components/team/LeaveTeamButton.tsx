'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Props = { teamSlug: string; teamName: string };

/** P-07: leave the team, with an in-page confirm step. */
export function LeaveTeamButton({ teamSlug, teamName }: Props) {
  const t = useTranslations('roster');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(teamSlug)}/leave`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), t('errorGeneric')));
      }
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid basis-full gap-2">
      {confirming ? (
        <div className="bx-inset grid gap-3 p-3">
          <p className="m-0 text-[14px] text-ink" role="alert">
            {t('leaveConfirmText', { team: teamName })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={leave}
              data-testid="leave-confirm"
            >
              <LogOut className="bx-icon" aria-hidden />
              {busy ? t('working') : t('leaveCta')}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="justify-self-start"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          data-testid="leave-team"
        >
          <LogOut className="bx-icon" aria-hidden />
          {t('leaveCta')}
        </Button>
      )}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="leave-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
