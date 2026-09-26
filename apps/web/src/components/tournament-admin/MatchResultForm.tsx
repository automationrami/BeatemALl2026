'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Pencil } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Props = {
  matchId: string;
  homeName: string;
  awayName: string;
  /** Existing scores: the form starts collapsed as "Correct result". */
  current?: { home: number; away: number } | null;
};

/** M-07: record (or correct) the score of one bracket match. No draws. */
export function MatchResultForm({ matchId, homeName, awayName, current }: Props) {
  const t = useTranslations('tournamentAdmin');
  const router = useRouter();
  const [open, setOpen] = useState(!current);
  const [home, setHome] = useState(current ? String(current.home) : '');
  const [away, setAway] = useState(current ? String(current.away) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const h = Number.parseInt(home, 10);
    const a = Number.parseInt(away, 10);
    if (Number.isNaN(h) || Number.isNaN(a)) return;
    if (h === a) {
      setError(t('errors.same_score'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/matches/${encodeURIComponent(matchId)}/result`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ homeScore: h, awayScore: a }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      if (current) setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        data-testid={`result-edit-${matchId}`}
      >
        <Pencil className="bx-icon" aria-hidden />
        {t('resultCorrect')}
      </Button>
    );
  }

  const scoreInput = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    testId: string,
  ) => (
    <label className="grid min-w-0 gap-1" htmlFor={id}>
      <span className="truncate text-[12px] text-ink-muted">{label}</span>
      <input
        id={id}
        type="number"
        min={0}
        max={999}
        inputMode="numeric"
        className="bx-field bx-num text-center"
        value={value}
        onChange={(e) => set(e.target.value)}
        required
        data-testid={testId}
      />
    </label>
  );

  return (
    <form className="bx-inset grid gap-2 p-3" onSubmit={submit} aria-label={t('resultTitle')}>
      <div className="grid grid-cols-2 gap-2">
        {scoreInput(`home-${matchId}`, homeName, home, setHome, `result-home-${matchId}`)}
        {scoreInput(`away-${matchId}`, awayName, away, setAway, `result-away-${matchId}`)}
      </div>
      <Button
        type="submit"
        size="sm"
        variant="gold"
        disabled={busy || home === '' || away === ''}
        data-testid={`result-save-${matchId}`}
      >
        <Check className="bx-icon" aria-hidden />
        {busy ? t('working') : t('resultSave')}
      </Button>
      {error ? (
        <p className="m-0 text-[12px] leading-snug text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
