'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, TicketPlus } from 'lucide-react';
import { Button, Notice } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Option = { slug: string; name: string };

type Props = {
  organizations: Option[];
  teams: Option[];
  venues: Option[];
};

/** Issue a voucher for an organisation the viewer owns or administers. */
export function IssueVoucherForm({ organizations, teams, venues }: Props) {
  const t = useTranslations('vouchers');
  const router = useRouter();
  const [org, setOrg] = useState(organizations[0]?.slug ?? '');
  const [kind, setKind] = useState<'unlimited' | 'stored_value'>('unlimited');
  const [amount, setAmount] = useState('50');
  const [team, setTeam] = useState('');
  const [venue, setVenue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiry, setExpiry] = useState('');
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setIssued(null);
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizationSlug: org,
          kind,
          valueKwd: kind === 'stored_value' ? Number(amount) : null,
          teamSlug: team || null,
          venueSlug: venue || null,
          maxRedemptions: maxUses ? Number.parseInt(maxUses, 10) : null,
          // End of the chosen day in Kuwait (UTC+3).
          expiresAt: expiry ? new Date(`${expiry}T23:59:59+03:00`).toISOString() : null,
          code: code.trim() || null,
          note: note.trim() || null,
        }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      const json = (await res.json()) as { voucher: { code: string } };
      setIssued(json.voucher.code);
      setCode('');
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="bx-card grid gap-5 p-5 min-[900px]:p-8"
      onSubmit={submit}
      data-testid="issue-voucher-form"
    >
      <div className="grid gap-1">
        <h2 className="bx-label text-ink">{t('issueTitle')}</h2>
        <p className="m-0 max-w-[68ch] text-[14px] text-ink-muted">{t('issueHint')}</p>
      </div>

      <div className="grid gap-5 min-[700px]:grid-cols-2">
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="voucher-org">
            {t('fieldOrg')}
          </label>
          <select
            id="voucher-org"
            className="bx-field"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            required
          >
            {organizations.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="bx-eyebrow mb-2" id="voucher-kind-label">
            {t('fieldKind')}
          </p>
          <div className="bx-seg" role="group" aria-labelledby="voucher-kind-label">
            <button
              type="button"
              aria-pressed={kind === 'unlimited'}
              onClick={() => setKind('unlimited')}
              data-testid="voucher-kind-unlimited"
            >
              {t('kindUnlimited')}
            </button>
            <button
              type="button"
              aria-pressed={kind === 'stored_value'}
              onClick={() => setKind('stored_value')}
              data-testid="voucher-kind-stored"
            >
              {t('kindStoredValue')}
            </button>
          </div>
        </div>
        {kind === 'stored_value' ? (
          <div>
            <label className="bx-eyebrow mb-2 block" htmlFor="voucher-amount">
              {t('fieldAmount')}
            </label>
            <input
              id="voucher-amount"
              type="number"
              min={1}
              max={10000}
              step="0.5"
              className="bx-field bx-num"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        ) : null}
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="voucher-team">
            {t('fieldTeam')}
          </label>
          <select
            id="voucher-team"
            className="bx-field"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            <option value="">{t('fieldTeamAny')}</option>
            {teams.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="voucher-venue">
            {t('fieldVenue')}
          </label>
          <select
            id="voucher-venue"
            className="bx-field"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          >
            <option value="">{t('fieldVenueAny')}</option>
            {venues.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="voucher-max">
            {t('fieldMaxUses')}
          </label>
          <input
            id="voucher-max"
            type="number"
            min={1}
            max={10000}
            className="bx-field bx-num"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            aria-describedby="voucher-max-hint"
          />
          <p id="voucher-max-hint" className="mt-1.5 text-[12px] text-ink-muted">
            {t('fieldMaxUsesHint')}
          </p>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="voucher-expiry">
            {t('fieldExpiry')}
          </label>
          <input
            id="voucher-expiry"
            type="date"
            className="bx-field [color-scheme:dark]"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            aria-describedby="voucher-expiry-hint"
          />
          <p id="voucher-expiry-hint" className="mt-1.5 text-[12px] text-ink-muted">
            {t('fieldExpiryHint')}
          </p>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="voucher-code-new">
            {t('fieldCode')}
          </label>
          <input
            id="voucher-code-new"
            className="bx-field font-mono uppercase tracking-[0.08em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={32}
            dir="ltr"
            autoComplete="off"
            aria-describedby="voucher-code-hint"
          />
          <p id="voucher-code-hint" className="mt-1.5 text-[12px] text-ink-muted">
            {t('fieldCodeHint')}
          </p>
        </div>
        <div className="min-[700px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="voucher-note">
            {t('fieldNote')}
          </label>
          <input
            id="voucher-note"
            className="bx-field"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      {issued ? (
        <div data-testid="voucher-issued">
          <Notice icon={<Check className="bx-icon" aria-hidden />}>
            {t('issuedNotice', { code: issued })}
          </Notice>
        </div>
      ) : null}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}

      <Button
        variant="gold"
        type="submit"
        disabled={submitting || !org}
        className="justify-self-start"
        data-testid="issue-voucher-submit"
      >
        <TicketPlus className="bx-icon" aria-hidden />
        {submitting ? t('issuing') : t('issueCta')}
      </Button>
    </form>
  );
}
