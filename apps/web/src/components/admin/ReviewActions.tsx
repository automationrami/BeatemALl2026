'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

/** A-01: approve, or reject with a reason (in-page step), one venue or organisation application. */
export function ReviewActions({ kind, slug }: { kind: 'venue' | 'organization'; slug: string }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      const path = kind === 'venue' ? 'venues' : 'organizations';
      const res = await fetch(`/api/admin/${path}/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, reason: action === 'reject' ? reason.trim() : null }),
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      }
      setRejecting(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3">
      {!rejecting ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="gold"
            size="sm"
            disabled={busy !== null}
            onClick={() => void send('approve')}
            data-testid={`admin-approve-${slug}`}
          >
            <Check className="bx-icon size-4" aria-hidden />
            {busy === 'approve' ? t('working') : t('approve')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setRejecting(true);
            }}
            data-testid={`admin-reject-${slug}`}
          >
            <X className="bx-icon size-4" aria-hidden />
            {t('reject')}
          </Button>
        </div>
      ) : (
        <form
          className="bx-inset grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send('reject');
          }}
        >
          <label className="bx-eyebrow" htmlFor={`reject-reason-${slug}`}>
            {t('rejectReason')}
          </label>
          <textarea
            id={`reject-reason-${slug}`}
            className="bx-field resize-y py-2.5"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('rejectPlaceholder')}
            maxLength={500}
            required
            data-testid="admin-reject-reason"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={busy !== null || reason.trim().length === 0}
              data-testid={`admin-reject-confirm-${slug}`}
            >
              <X className="bx-icon size-4" aria-hidden />
              {busy === 'reject' ? t('working') : t('confirmReject')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy !== null}
              onClick={() => setRejecting(false)}
            >
              {t('back')}
            </Button>
          </div>
        </form>
      )}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-3 py-2 font-display text-[13px] font-medium text-negative"
          data-testid="admin-review-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
