'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-2.5">
        <p className="bx-eyebrow">{t('eyebrow')}</p>
        <h1 className="bx-display">{t('title')}</h1>
        <p className="text-[15px] font-medium text-ink-muted">{t('subtitle')}</p>
      </div>

      <Field label={t('phoneLabel')} error={error}>
        <div className="flex gap-2">
          <CountryDialDropdown
            country={country}
            onChange={setCountry}
            locale={locale}
            label={t('countryCodeLabel')}
          />
          <div className="min-w-0 flex-1">
            <TextInput
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              dir="ltr"
              placeholder={t('phonePlaceholder')}
              value={phone}
              invalid={!!error}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </Field>

      <Button variant="gold" size="lg" full type="submit" disabled={pending}>
        {t('continue')}
        <ArrowRight className="bx-icon bx-flip" aria-hidden />
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="bx-eyebrow">{t('or')}</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-2.5">
        <Button
          variant="ink"
          full
          type="button"
          onClick={() => router.push(`/${locale}/auth/callback`)}
        >
          {t('appleCta')}
        </Button>
        <Button
          variant="ink"
          full
          type="button"
          onClick={() => router.push(`/${locale}/auth/callback`)}
        >
          {t('googleCta')}
        </Button>
      </div>

      <p className="text-center text-[12px] leading-[1.6] font-medium text-ink-muted">
        {t('termsPrefix')}{' '}
        <span className="cursor-pointer text-ink underline decoration-dotted">{t('terms')}</span>{' '}
        {t('and')}{' '}
        <span className="cursor-pointer text-ink underline decoration-dotted">{t('privacy')}</span>.
      </p>
    </form>
  );
}

type Country = (typeof COUNTRY_DIAL_CODES)[number];

function CountryDialDropdown({
  country,
  onChange,
  locale,
  label,
}: {
  country: Country;
  onChange: (c: Country) => void;
  locale: 'en' | 'ar';
  label: string;
}) {
  return (
    <div className="relative flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-surface-200 px-3.5 transition-colors hover:bg-surface-300 focus-within:border-transparent focus-within:shadow-[var(--focus-ring)]">
      <span className="bx-eyebrow">{country.country}</span>
      <span className="bx-num text-[15px] text-ink" dir="ltr">
        +{country.dial}
      </span>
      <ChevronDown className="bx-icon text-ink-muted" aria-hidden />
      <select
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
        value={country.country}
        onChange={(e) => {
          const next = COUNTRY_DIAL_CODES.find((c) => c.country === e.target.value);
          if (next) onChange(next);
        }}
      >
        {COUNTRY_DIAL_CODES.map((c) => (
          <option key={c.country} value={c.country} className="bg-surface-200 text-ink">
            {c.label[locale]} (+{c.dial})
          </option>
        ))}
      </select>
    </div>
  );
}
