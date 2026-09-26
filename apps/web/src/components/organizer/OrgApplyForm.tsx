'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

const COUNTRIES = ['KW', 'KSA', 'AE', 'BH', 'QA', 'OM'] as const;
type Tier = 'community' | 'brand';

/** M-01: apply for an organiser account. On success the organiser lands on /manage. */
export function OrgApplyForm({ defaultPhone }: { defaultPhone?: string }) {
  const t = useTranslations('organizer');
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState('');
  const [tier, setTier] = useState<Tier>('community');
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>('KW');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/organizations/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tier,
          countryCode: country,
          description: description.trim() || null,
          contactEmail: email.trim() || null,
          contactPhone: phone.trim(),
        }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      router.push(`/${locale}/manage`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <form
      className="bx-card grid gap-5 p-5 min-[900px]:p-8"
      onSubmit={submit}
      data-testid="org-apply-form"
    >
      <div className="grid gap-1">
        <h2 className="bx-label text-ink">{t('formTitle')}</h2>
        <p className="m-0 max-w-[68ch] text-[14px] text-ink-muted">{t('formHint')}</p>
      </div>

      <div className="grid gap-5 min-[700px]:grid-cols-2">
        <div className="min-[700px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="org-name">
            {t('fieldName')}
          </label>
          <input
            id="org-name"
            className="bx-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            maxLength={80}
            required
            autoComplete="organization"
            data-testid="org-apply-name"
          />
        </div>

        <div>
          <p className="bx-eyebrow mb-2" id="org-tier-label">
            {t('fieldTier')}
          </p>
          <div className="bx-seg" role="group" aria-labelledby="org-tier-label">
            {(['community', 'brand'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={tier === v}
                onClick={() => setTier(v)}
                data-testid={`org-apply-tier-${v}`}
              >
                {t(v === 'community' ? 'tierCommunity' : 'tierBrand')}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-muted">
            {t(tier === 'community' ? 'tierCommunityHint' : 'tierBrandHint')}
          </p>
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="org-country">
            {t('fieldCountry')}
          </label>
          <select
            id="org-country"
            className="bx-field"
            value={country}
            onChange={(e) => setCountry(e.target.value as (typeof COUNTRIES)[number])}
            data-testid="org-apply-country"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t(`country.${c}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="org-phone">
            {t('fieldPhone')}
          </label>
          <input
            id="org-phone"
            className="bx-field bx-num"
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            placeholder="+965 5000 0000"
            data-testid="org-apply-phone"
          />
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="org-email">
            {t('fieldEmail')}
          </label>
          <input
            id="org-email"
            className="bx-field"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            autoComplete="email"
            data-testid="org-apply-email"
          />
        </div>

        <div className="min-[700px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="org-description">
            {t('fieldDescription')}
          </label>
          <textarea
            id="org-description"
            className="bx-field min-h-[96px] py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            data-testid="org-apply-description"
          />
        </div>
      </div>

      <p className="m-0 text-[13px] text-ink-muted">{t('reviewNote')}</p>

      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="org-apply-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}

      <Button
        variant="gold"
        type="submit"
        disabled={submitting || name.trim().length < 3 || !phone.trim()}
        className="justify-self-start"
        data-testid="org-apply-submit"
      >
        <Send className="bx-icon bx-flip" aria-hidden />
        {submitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
