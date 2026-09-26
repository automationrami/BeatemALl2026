'use client';

import { useTranslations } from 'next-intl';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { formatKwd } from './format';

export type VoucherPreview =
  | {
      ok: true;
      code: string;
      kind: 'unlimited' | 'stored_value';
      amountKwd: number;
      balanceAfterKwd: number | null;
      issuer: string;
    }
  | { ok: false; code: string; reason: string; message: string };

/** One line under a voucher field: what the code covers, or why it can't be used. */
export function VoucherPreviewLine({ preview }: { preview: VoucherPreview }) {
  const t = useTranslations('vouchers');
  if (!preview.ok) {
    const key = `errors.${preview.reason}`;
    return (
      <p
        className="flex items-start gap-2 text-[13px] font-medium text-negative"
        role="status"
        data-testid="voucher-preview"
      >
        <CircleAlert className="bx-icon mt-0.5 shrink-0" aria-hidden />
        {t.has(key) ? t(key) : preview.message}
      </p>
    );
  }
  const amount = formatKwd(preview.amountKwd, t);
  return (
    <p
      className="flex items-start gap-2 text-[13px] font-medium text-positive"
      role="status"
      data-testid="voucher-preview"
    >
      <CircleCheck className="bx-icon mt-0.5 shrink-0" aria-hidden />
      {preview.kind === 'unlimited'
        ? t('previewUnlimited', { amount, issuer: preview.issuer })
        : t('previewBalance', { amount, left: formatKwd(preview.balanceAfterKwd ?? 0, t) })}
    </p>
  );
}
