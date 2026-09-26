'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Info, Repeat2, X } from 'lucide-react';
import { Button, Notice } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Format = 'bo1' | 'bo3' | 'bo5';
type Proposal = { format: string; start: string; end: string };

type Props = {
  challengeId: string;
  /** Server pre-computed: the viewer captains the side the latest proposal was sent to. */
  canAct: boolean;
  /** Always shown above the actions: whose move it is, or why the viewer can't act. */
  note: string;
  /** Counter-proposals made so far and the cap (US-E6.3). */
  counters: { used: number; max: number };
  /** Current terms, used to pre-fill the counter form. ISO strings. */
  current: Proposal;
};

const FORMATS: readonly Format[] = ['bo1', 'bo3', 'bo5'];

/** ISO → value for <input type="datetime-local"> in the viewer's own time zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Accept / Counter / Reject for the side whose move it is. Accept and reject PATCH the
 * challenge; counter opens an inline form with the current terms pre-filled.
 */
export function ChallengeActions({ challengeId, canAct, note, counters, current }: Props) {
  const t = useTranslations('challenge');
  const router = useRouter();

  const [busy, setBusy] = useState<null | 'accept' | 'reject' | 'counter'>(null);
  const [error, setError] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [format, setFormat] = useState<Format>(
    () => FORMATS.find((f) => f === current.format) ?? 'bo3',
  );
  const [start, setStart] = useState(() => toLocalInput(current.start));
  const [end, setEnd] = useState(() => toLocalInput(current.end));
  const [message, setMessage] = useState('');

  const send = async (action: 'accept' | 'reject' | 'counter', body: object) => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      setCountering(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const submitCounter = (e: React.FormEvent) => {
    e.preventDefault();
    const s = new Date(start);
    const en = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) {
      setError(t('errorInvalidDates'));
      return;
    }
    if (en <= s) {
      setError(t('errorEndBeforeStart'));
      return;
    }
    if (s.getTime() < Date.now() - 60_000) {
      setError(t('errorStartInPast'));
      return;
    }
    void send('counter', {
      proposal: {
        format,
        dateRangeStart: s.toISOString(),
        dateRangeEnd: en.toISOString(),
        message: message.trim() || null,
      },
    });
  };

  const countersLeft = counters.used < counters.max;

  return (
    <div className="grid gap-4">
      <div data-testid="turn-note">
        <Notice tone="neutral" icon={<Info className="bx-icon" aria-hidden />}>
          {note}
        </Notice>
      </div>

      {canAct && !countering ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="gold"
            onClick={() => send('accept', {})}
            disabled={busy !== null}
            data-testid="accept-challenge"
            className="grow min-[600px]:grow-0"
          >
            <Check className="bx-icon" aria-hidden />
            {busy === 'accept' ? t('acceptingCta') : t('acceptCta')}
          </Button>
          {countersLeft ? (
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setCountering(true);
              }}
              disabled={busy !== null}
              data-testid="counter-challenge"
              className="grow min-[600px]:grow-0"
            >
              <Repeat2 className="bx-icon" aria-hidden />
              {t('counterCta')}
            </Button>
          ) : null}
          <Button
            variant="danger"
            onClick={() => send('reject', {})}
            disabled={busy !== null}
            data-testid="reject-challenge"
            className="grow min-[600px]:grow-0"
          >
            <X className="bx-icon" aria-hidden />
            {busy === 'reject' ? t('rejectingCta') : t('rejectCta')}
          </Button>
        </div>
      ) : null}

      {canAct && countering ? (
        <form
          className="bx-inset grid gap-4 p-4"
          onSubmit={submitCounter}
          data-testid="counter-form"
        >
          <p className="bx-label text-ink">{t('counterTitle')}</p>
          <div>
            <p className="bx-eyebrow mb-2" id="counter-format-label">
              {t('fieldFormat')}
            </p>
            <div className="bx-seg" role="group" aria-labelledby="counter-format-label">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={format === f}
                  onClick={() => setFormat(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 min-[600px]:grid-cols-2">
            <div>
              <label className="bx-eyebrow mb-2 block" htmlFor="counter-start">
                {t('fieldDateRangeStart')}
              </label>
              <input
                id="counter-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bx-field [color-scheme:dark]"
                required
              />
            </div>
            <div>
              <label className="bx-eyebrow mb-2 block" htmlFor="counter-end">
                {t('fieldDateRangeEnd')}
              </label>
              <input
                id="counter-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bx-field [color-scheme:dark]"
                required
              />
            </div>
          </div>
          <div>
            <label className="bx-eyebrow mb-2 block" htmlFor="counter-message">
              {t('fieldMessage')}
            </label>
            <textarea
              id="counter-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('fieldMessagePlaceholder')}
              rows={2}
              maxLength={500}
              className="bx-field resize-y py-2.5"
            />
          </div>
          <p className="m-0 text-[12px] text-ink-muted">
            {t('countersUsed', { used: counters.used, max: counters.max })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="gold"
              type="submit"
              disabled={busy !== null}
              data-testid="counter-submit"
            >
              <Repeat2 className="bx-icon" aria-hidden />
              {busy === 'counter' ? t('counterSending') : t('counterSubmit')}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setCountering(false)}
              disabled={busy !== null}
            >
              {t('counterCancel')}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p
          className="text-[13px] font-medium text-negative"
          role="alert"
          data-testid="challenge-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
