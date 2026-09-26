'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, TicketPercent } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';
import { VoucherPreviewLine, type VoucherPreview } from './VoucherPreviewLine';

type Props = {
  /** What is being paid: a pending booking or a pending tournament entry. */
  target: { kind: 'booking' | 'registration'; id: string };
  /** Pre-formatted amount, e.g. "KWD 24". */
  amountLabel: string;
};

/**
 * "Pay with a voucher" panel for a pending booking or tournament entry. Check shows what
 * the code covers; Pay redeems it and refreshes the page into its confirmed state.
 */
export function PayWithVoucher({ target, amountLabel }: Props) {
  const t = useTranslations('vouchers');
  const router = useRouter();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<VoucherPreview | null>(null);
  const [busy, setBusy] = useState<null | 'check' | 'pay'>(null);
  const [error, setError] = useState<string | null>(null);

  const param = target.kind === 'booking' ? 'bookingId' : 'registrationId';
  const payUrl =
    target.kind === 'booking'
      ? `/api/bookings/${target.id}/pay`
      : `/api/registrations/${target.id}/pay`;

  const check = async () => {
    if (!code.trim()) return;
    setBusy('check');
    setError(null);
    setPreview(null);
    try {
      const res = await fetch(
        `/api/vouchers/${encodeURIComponent(code.trim())}?${param}=${target.id}`,
        { cache: 'no-store' },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(t, body, `HTTP ${res.status}`));
      setPreview((body as { preview: VoucherPreview }).preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const pay = async () => {
    setBusy('pay');
    setError(null);
    try {
      const res = await fetch(payUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ voucherCode: code.trim() }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      className="bx-card grid gap-4 p-5 min-[900px]:p-6"
      aria-labelledby="pay-voucher-title"
      data-testid="pay-voucher"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-md bg-gold-soft text-gold-text"
          aria-hidden
        >
          <TicketPercent className="bx-icon" />
        </span>
        <div className="grid gap-1">
          <h2 id="pay-voucher-title" className="bx-label text-ink">
            {t('payTitle')}
          </h2>
          <p className="text-[14px] text-ink-muted">{t('payHint', { amount: amountLabel })}</p>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="bx-eyebrow" htmlFor={`voucher-code-${target.id}`}>
          {t('codeLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`voucher-code-${target.id}`}
            data-testid="voucher-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setPreview(null);
            }}
            placeholder={t('codePlaceholder')}
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            className="bx-field min-w-0 flex-1 font-mono uppercase tracking-[0.08em]"
          />
          <Button
            variant="outline"
            type="button"
            onClick={check}
            disabled={busy !== null || code.trim().length < 4}
            data-testid="voucher-check"
          >
            {busy === 'check' ? t('checking') : t('checkCta')}
          </Button>
        </div>
      </div>

      {preview ? <VoucherPreviewLine preview={preview} /> : null}

      {error ? (
        <p
          className="rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="voucher-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}

      <Button
        variant="gold"
        type="button"
        onClick={pay}
        disabled={busy !== null || code.trim().length < 4 || (preview !== null && !preview.ok)}
        data-testid="voucher-pay"
        className="justify-self-start"
      >
        <Check className="bx-icon" aria-hidden />
        {busy === 'pay' ? t('paying') : t('payCta', { amount: amountLabel })}
      </Button>
    </section>
  );
}
