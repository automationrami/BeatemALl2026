'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, CircleAlert, CircleCheck } from 'lucide-react';
import { Button, GameCard } from '@beat-em-all/ui';
import { GAMES_LIST } from '@beat-em-all/mock-data';
import type { GameId } from '@beat-em-all/types';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

const COUNTRIES = ['KW', 'SA', 'AE', 'BH', 'QA', 'OM'] as const;

/** "Khaled Al-Mutairi" → "khaled-al-mutairi" (Latin letters and digits only). */
function suggestUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

/**
 * Finish sign-up (E1 US-1.2): name, username (profile URL), country, city and games.
 * Until this is saved the proxy keeps the account on this screen.
 */
export function OnboardingForm() {
  const t = useTranslations('onboarding');
  const locale = useLocale() as 'en' | 'ar';
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>('KW');
  const [city, setCity] = useState('');
  const [selected, setSelected] = useState<Set<GameId>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Suggest a username from the name until the player edits it themselves.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!usernameTouched) setUsername(suggestUsername(displayName));
  }, [displayName, usernameTouched]);

  // Live availability check, debounced.
  useEffect(() => {
    if (!/^[a-z0-9-]{3,30}$/.test(username)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailable(null);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/onboarding?username=${encodeURIComponent(username)}`).catch(
        () => null,
      );
      const body = (await res?.json().catch(() => null)) as { available?: boolean } | null;
      setAvailable(body?.available ?? null);
    }, 350);
    return () => clearTimeout(handle);
  }, [username]);

  function toggle(id: GameId) {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (selected.size === 0) {
      setError(t('minOneGame'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username,
          countryCode: country,
          city: city.trim(),
          gameSlugs: [...selected],
          locale,
        }),
      });
      if (!res.ok)
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      router.push(`/${locale}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={submit} data-testid="onboarding-form">
      <div className="grid gap-2.5">
        <p className="bx-eyebrow">{t('eyebrow')}</p>
        <h1 className="bx-display">{t('profileTitle')}</h1>
        <p className="text-[15px] font-medium text-ink-muted">{t('profileSubtitle')}</p>
      </div>

      <div className="grid gap-5 min-[600px]:grid-cols-2">
        <div className="min-[600px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="onb-name">
            {t('fieldName')}
          </label>
          <input
            id="onb-name"
            className="bx-field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={60}
            autoComplete="name"
            required
          />
        </div>
        <div className="min-[600px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="onb-username">
            {t('fieldUsername')}
          </label>
          <input
            id="onb-username"
            className="bx-field font-mono"
            dir="ltr"
            value={username}
            onChange={(e) => {
              setUsernameTouched(true);
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
            }}
            minLength={3}
            maxLength={30}
            autoComplete="username"
            aria-describedby="onb-username-hint"
            required
          />
          <p
            id="onb-username-hint"
            className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-muted"
          >
            {available === true ? (
              <>
                <CircleCheck className="bx-icon size-3.5 text-positive" aria-hidden />
                {t('usernameFree')}
              </>
            ) : available === false ? (
              <>
                <CircleAlert className="bx-icon size-3.5 text-negative" aria-hidden />
                {t('usernameTaken')}
              </>
            ) : (
              t('usernameHint')
            )}
          </p>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="onb-country">
            {t('fieldCountry')}
          </label>
          <select
            id="onb-country"
            className="bx-field"
            value={country}
            onChange={(e) => setCountry(e.target.value as (typeof COUNTRIES)[number])}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t(`countries.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="onb-city">
            {t('fieldCity')}
          </label>
          <input
            id="onb-city"
            className="bx-field"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            minLength={2}
            maxLength={60}
            required
          />
        </div>
      </div>

      <div className="grid gap-3">
        <p className="bx-eyebrow">{t('fieldGames')}</p>
        <div className="grid grid-cols-2 gap-3 min-[600px]:grid-cols-3">
          {GAMES_LIST.map((g) => (
            <GameCard
              key={g.id}
              shortName={g.shortName}
              title={g.title}
              brandColor={g.brandColor}
              selected={selected.has(g.id)}
              onToggle={() => toggle(g.id)}
            />
          ))}
        </div>
      </div>

      {error && (
        <p
          className="text-[13px] font-medium text-negative"
          role="alert"
          data-testid="onboarding-error"
        >
          {error}
        </p>
      )}

      <Button
        variant="gold"
        size="lg"
        full
        type="submit"
        disabled={saving || selected.size === 0 || available === false}
        data-testid="onboarding-submit"
      >
        {saving ? t('saving') : t('finish')}
        <ArrowRight className="bx-icon bx-flip" aria-hidden />
      </Button>
    </form>
  );
}
