'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, TextInput, Field } from '@beat-em-all/ui';
import { signIn } from '@beat-em-all/api-client';
import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY } from '@beat-em-all/mock-data';
import { composeE164, phoneInputSchema } from '@beat-em-all/utils';

export function SignInForm() {
  const t = useTranslations('signIn');
  const locale = useLocale() as 'en' | 'ar';
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const inputCheck = phoneInputSchema.safeParse(phone);
    if (!inputCheck.success) {
      setError(t('errors.invalid_phone'));
      return;
    }
    const e164 = composeE164(country.dial, inputCheck.data);
    const result = signIn(e164);
    if (!result.ok) {
      setError(
        t(
          `errors.${result.error}` as
            | 'errors.invalid_phone'
            | 'errors.rate_limited'
            | 'errors.unknown',
        ),
      );
      return;
    }
    startTransition(() => router.push(`/${locale}/verify`));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <p className="bx-eyebrow mb-2.5">{t('eyebrow')}</p>
      <h1 className="font-display font-medium text-[40px] leading-[1] tracking-[-0.035em] mb-2.5">
        {t('title')}
      </h1>
      <p className="font-display text-[14px] text-[var(--t-3)] mb-7">{t('subtitle')}</p>

      <Field label={t('phoneLabel')} error={error}>
        <div className="flex gap-2">
          <CountryDialDropdown country={country} onChange={setCountry} locale={locale} />
          <div className="flex-1">
            <TextInput
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={t('phonePlaceholder')}
              value={phone}
              invalid={!!error}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </Field>

      <div className="mt-4">
        <Button tone="primary" size="lg" full type="submit" disabled={pending}>
          {t('continue')} →
        </Button>
      </div>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[var(--line)]" />
        <span className="bx-eyebrow">{t('or')}</span>
        <div className="flex-1 h-px bg-[var(--line)]" />
      </div>

      <div className="flex flex-col gap-2.5">
        <Button
          tone="soft"
          size="md"
          full
          type="button"
          onClick={() => router.push(`/${locale}/auth/callback`)}
        >
          {t('appleCta')}
        </Button>
        <Button
          tone="soft"
          size="md"
          full
          type="button"
          onClick={() => router.push(`/${locale}/auth/callback`)}
        >
          {t('googleCta')}
        </Button>
      </div>

      <p className="mt-8 font-display text-[11px] text-[var(--t-4)] leading-[1.6] text-center">
        {t('termsPrefix')}{' '}
        <span className="text-[var(--t-2)] underline decoration-dotted cursor-pointer">
          {t('terms')}
        </span>{' '}
        {t('and')}{' '}
        <span className="text-[var(--t-2)] underline decoration-dotted cursor-pointer">
          {t('privacy')}
        </span>
        .
      </p>
    </form>
  );
}

type Country = (typeof COUNTRY_DIAL_CODES)[number];

function CountryDialDropdown({
  country,
  onChange,
  locale,
}: {
  country: Country;
  onChange: (c: Country) => void;
  locale: 'en' | 'ar';
}) {
  return (
    <label className="relative flex items-center gap-1.5 px-3.5 h-11 rounded-xl border border-[var(--line-2)] bg-[rgba(255,255,255,0.03)] cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors">
      <span className="text-base leading-none" aria-hidden>
        {country.flag}
      </span>
      <span className="font-display font-medium text-[14px] text-white">+{country.dial}</span>
      <span aria-hidden className="text-[var(--t-3)]">
        ▾
      </span>
      <select
        aria-label="Country code"
        className="absolute inset-0 opacity-0 cursor-pointer"
        value={country.country}
        onChange={(e) => {
          const next = COUNTRY_DIAL_CODES.find((c) => c.country === e.target.value);
          if (next) onChange(next);
        }}
      >
        {COUNTRY_DIAL_CODES.map((c) => (
          <option key={c.country} value={c.country} className="bg-[var(--bg-2)] text-white">
            {c.flag} {c.label[locale]} (+{c.dial})
          </option>
        ))}
      </select>
    </label>
  );
}
