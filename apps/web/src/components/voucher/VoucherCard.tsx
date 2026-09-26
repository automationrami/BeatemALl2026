'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CalendarClock,
  Copy,
  Infinity as InfinityIcon,
  Landmark,
  Users,
} from 'lucide-react';
import { Button, Tag } from '@beat-em-all/ui';
import { dateLocale } from '@/components/booking/format';
import { apiErrorMessage, readApiError } from '@/lib/api-error';
import { formatKwd } from './format';
import { voucherState, type VoucherCardData } from './state';

export type { VoucherCardData } from './state';

const STATE_KEY = {
  active: 'statusActive',
  revoked: 'statusRevoked',
  expired: 'statusExpired',
  used_up: 'statusUsedUp',
} as const;

/** One voucher: code, what it's worth, who it's for and whether it still pays. */
export function VoucherCard({
  voucher,
  canRevoke,
}: { voucher: VoucherCardData; canRevoke?: boolean }) {
  const t = useTranslations('vouchers');
  const locale = useLocale();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = voucherState(voucher);
  const live = state === 'active';
  const date = new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: 'medium',
    timeZone: 'Asia/Kuwait',
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the code stays selectable on the card.
    }
  };

  const revoke = async () => {
    setRevoking(true);
    setError(null);
    try {
      const res = await fetch(`/api/vouchers/${encodeURIComponent(voucher.code)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <article
      className={['bx-card grid content-start gap-4 p-5', live ? '' : 'opacity-70'].join(' ')}
      data-testid="voucher-card"
      data-code={voucher.code}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={voucher.kind === 'unlimited' ? 'gold' : 'ink'}>
          {voucher.kind === 'unlimited' ? t('kindUnlimited') : t('kindStoredValue')}
        </Tag>
        <Tag tone={live ? 'soft' : 'neutral'}>{t(STATE_KEY[state])}</Tag>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p
          className="m-0 min-w-0 select-all break-all font-mono text-[18px] font-bold tracking-[0.06em] text-ink"
          dir="ltr"
        >
          {voucher.code}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          aria-label={t('copyCta')}
          className="shrink-0"
        >
          <Copy className="bx-icon" aria-hidden />
          {copied ? t('copied') : null}
        </Button>
      </div>

      <div className="grid gap-1">
        {voucher.kind === 'unlimited' ? (
          <p className="m-0 flex items-center gap-2 font-display text-[22px] font-bold text-gold-text">
            <InfinityIcon className="bx-icon" aria-hidden />
            {t('unlimitedLine')}
          </p>
        ) : (
          <>
            <p className="bx-num bx-gold-num m-0 text-[32px]">
              {formatKwd(voucher.balanceKwd ?? 0, t)}
            </p>
            <p className="m-0 text-[13px] text-ink-muted">
              {t('balanceLine', {
                balance: formatKwd(voucher.balanceKwd ?? 0, t),
                value: formatKwd(voucher.valueKwd ?? 0, t),
              })}
            </p>
          </>
        )}
      </div>

      <ul className="m-0 grid list-none gap-2 p-0 text-[13px] text-ink-muted">
        <li className="flex items-center gap-2">
          <Landmark className="bx-icon shrink-0" aria-hidden />
          {t('issuedBy', { issuer: voucher.issuer.name })}
        </li>
        <li className="flex items-center gap-2">
          <Users className="bx-icon shrink-0" aria-hidden />
          {voucher.team ? t('scopeTeam', { team: voucher.team.name }) : t('scopeAnyTeam')}
        </li>
        <li className="flex items-center gap-2">
          <Building2 className="bx-icon shrink-0" aria-hidden />
          {voucher.venue ? t('scopeVenue', { venue: voucher.venue.name }) : t('scopeAnywhere')}
        </li>
        <li className="flex items-center gap-2">
          <CalendarClock className="bx-icon shrink-0" aria-hidden />
          {voucher.expiresAt
            ? t('expires', { date: date.format(new Date(voucher.expiresAt)) })
            : t('noExpiry')}
          {' · '}
          {voucher.maxRedemptions !== null
            ? t('usesLine', { count: voucher.redemptionCount, max: voucher.maxRedemptions })
            : t('usesOpen', { count: voucher.redemptionCount })}
        </li>
      </ul>

      {voucher.note ? (
        <p className="m-0 border-t border-line pt-3 text-[13px] leading-relaxed text-ink-muted">
          {voucher.note}
        </p>
      ) : null}

      {canRevoke && voucher.status === 'active' ? (
        confirming ? (
          <div className="bx-inset grid gap-3 p-3" role="alertdialog" aria-label={t('revokeCta')}>
            <p className="m-0 text-[13px] text-ink">{t('revokeConfirm', { code: voucher.code })}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={revoke}
                disabled={revoking}
                data-testid="voucher-revoke-yes"
              >
                {revoking ? t('revoking') : t('confirmRevoke')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={revoking}
              >
                {t('keep')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="justify-self-start"
            data-testid="voucher-revoke"
          >
            {t('revokeCta')}
          </Button>
        )
      ) : null}
      {error ? (
        <p className="m-0 text-[12px] text-negative" role="alert">
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </article>
  );
}
