'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Ban } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Props = { locale: string; teamSlug: string; teamName: string };

/** T-05: disband the team (captain only), behind an in-page confirm step. */
export function DisbandTeam({ locale, teamSlug, teamName }: Props) {
  const t = useTranslations('roster');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disband = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(teamSlug)}/disband`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), t('errorGeneric')));
      }
      router.push(`/${locale}/teams/${teamSlug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <section className="bx-card bx-card--flat grid gap-4 p-5" aria-labelledby="disband-title">
      <div className="grid gap-1">
        <h2 id="disband-title" className="bx-label m-0 text-negative">
          {t('disbandTitle')}
        </h2>
        <p className="m-0 max-w-[68ch] text-[14px] text-ink-muted">{t('disbandHint')}</p>
      </div>
      {confirming ? (
        <div className="bx-inset grid gap-3 p-4">
          <p className="m-0 text-[14px] text-ink" role="alert">
            {t('disbandConfirmText', { team: teamName })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={busy}
              onClick={disband}
              data-testid="disband-confirm"
            >
              <Ban className="bx-icon" aria-hidden />
              {busy ? t('working') : t('disbandConfirmCta')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="danger"
          className="justify-self-start"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          data-testid="disband-team"
        >
          <Ban className="bx-icon" aria-hidden />
          {t('disbandCta')}
        </Button>
      )}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="disband-error"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
