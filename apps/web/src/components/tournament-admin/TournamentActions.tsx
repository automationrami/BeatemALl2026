'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Ban, Flag, Lock, Play, Unlock } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

export type TournamentActionName =
  | 'open_registration'
  | 'close_registration'
  | 'start'
  | 'complete'
  | 'cancel';

type Props = {
  slug: string;
  actions: TournamentActionName[];
  /** Actions shown but not yet possible (e.g. complete before the final is played). */
  disabled?: TournamentActionName[];
};

const ICONS: Record<TournamentActionName, React.ReactNode> = {
  open_registration: <Unlock className="bx-icon" aria-hidden />,
  close_registration: <Lock className="bx-icon" aria-hidden />,
  start: <Play className="bx-icon bx-flip" aria-hidden />,
  complete: <Flag className="bx-icon" aria-hidden />,
  cancel: <Ban className="bx-icon" aria-hidden />,
};

/** Lifecycle buttons for the organiser console, each behind an in-page confirm step. */
export function TournamentActions({ slug, actions, disabled = [] }: Props) {
  const t = useTranslations('tournamentAdmin');
  const router = useRouter();
  const [pending, setPending] = useState<TournamentActionName | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/tournaments/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: pending }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      setPending(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (actions.length === 0) return null;

  // The main forward step gets gold; cancel is always the quiet danger action.
  const primary = actions.find((a) => a !== 'cancel' && !disabled.includes(a));

  return (
    <div className="grid gap-3">
      {pending ? (
        <div
          className="bx-inset grid gap-3 p-4"
          role="alertdialog"
          aria-labelledby="tournament-action-confirm-text"
          data-testid="action-confirm-panel"
        >
          <p
            id="tournament-action-confirm-text"
            className="m-0 text-[14px] leading-relaxed text-ink"
          >
            {t(`confirm.${pending}`)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={pending === 'cancel' ? 'danger' : 'gold'}
              onClick={run}
              disabled={busy}
              data-testid="action-confirm"
            >
              {ICONS[pending]}
              {busy ? t('working') : t(`action.${pending}`)}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={busy}
              data-testid="action-back"
            >
              {t('confirmNo')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a}
              variant={a === 'cancel' ? 'danger' : a === primary ? 'gold' : 'ink'}
              onClick={() => {
                setError(null);
                setPending(a);
              }}
              disabled={disabled.includes(a)}
              data-testid={`action-${a}`}
            >
              {ICONS[a]}
              {t(`action.${a}`)}
            </Button>
          ))}
        </div>
      )}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="action-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
