'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Save } from 'lucide-react';
import { Button, GameCard, Notice, buttonClass } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Game = { slug: string; name: string; shortName?: string; brandColor?: string };

type Country = { code: string; name: string };

type Props = {
  locale: string;
  playerSlug: string;
  countries: Country[];
  games: Game[];
  initial: {
    displayName: string;
    bio: string;
    city: string;
    countryCode: string;
    isOpenToTeamInvites: boolean;
    gameSlugs: string[];
  };
};

const BIO_MAX = 280;

/** P-04: edit name, bio, city, country, games and the "open to team invites" switch. */
export function ProfileEditForm({ locale, playerSlug, countries, games, initial }: Props) {
  const t = useTranslations('profileEdit');
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [city, setCity] = useState(initial.city);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [openToInvites, setOpenToInvites] = useState(initial.isOpenToTeamInvites);
  const [picked, setPicked] = useState<string[]>(initial.gameSlugs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGame = (slug: string) =>
    setPicked((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const name = displayName.trim();
    if (name.length < 2 || name.length > 60) {
      setError(t('errors.invalid_name'));
      return;
    }
    if (picked.length === 0) {
      setError(t('errors.no_games'));
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: name,
          bio: bio.trim() || null,
          city: city.trim() || null,
          countryCode,
          isOpenToTeamInvites: openToInvites,
          gameSlugs: picked,
        }),
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), t('errorGeneric')));
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="bx-card grid gap-6 p-5 min-[900px]:p-8"
      onSubmit={submit}
      data-testid="profile-edit-form"
    >
      <div className="grid gap-5 min-[700px]:grid-cols-2">
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="profile-name">
            {t('fieldName')}
          </label>
          <input
            id="profile-name"
            className="bx-field"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={60}
            dir="auto"
            autoComplete="name"
            required
            data-testid="profile-name"
          />
        </div>
        <div>
          <p className="bx-eyebrow mb-2">{t('fieldUsername')}</p>
          <p className="bx-inset m-0 flex min-h-[44px] items-center px-3.5 text-[15px] text-ink-muted">
            <bdi dir="ltr">@{playerSlug}</bdi>
          </p>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="profile-country">
            {t('fieldCountry')}
          </label>
          <select
            id="profile-country"
            className="bx-field"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            data-testid="profile-country"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code} className="bg-surface-200">
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="profile-city">
            {t('fieldCity')}
          </label>
          <input
            id="profile-city"
            className="bx-field"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            dir="auto"
            placeholder={t('fieldCityPlaceholder')}
            data-testid="profile-city"
          />
        </div>
        <div className="min-[700px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="profile-bio">
            {t('fieldBio')}
          </label>
          <textarea
            id="profile-bio"
            className="bx-field min-h-[112px] py-3"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            maxLength={BIO_MAX}
            dir="auto"
            placeholder={t('fieldBioPlaceholder')}
            data-testid="profile-bio"
          />
          <p className="mt-1.5 text-[12px] text-ink-muted">
            {t('charsLeft', { count: BIO_MAX - bio.length })}
          </p>
        </div>
      </div>

      <fieldset className="m-0 grid gap-3 border-0 p-0">
        <legend className="bx-label mb-3 text-ink">{t('fieldGames')}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {games.map((g) => (
            <div key={g.slug} data-testid={`profile-game-${g.slug}`}>
              <GameCard
                shortName={g.shortName ?? g.name}
                title={g.name}
                brandColor={g.brandColor ?? ''}
                selected={picked.includes(g.slug)}
                onToggle={() => toggleGame(g.slug)}
              />
            </div>
          ))}
        </div>
        <p className="m-0 text-[13px] text-ink-muted">{t('fieldGamesHint')}</p>
      </fieldset>

      <div className="grid gap-1.5">
        <label className="bx-check justify-self-start">
          <input
            type="checkbox"
            checked={openToInvites}
            onChange={(e) => setOpenToInvites(e.target.checked)}
            data-testid="profile-open-to-invites"
          />
          <span>{t('fieldOpenToInvites')}</span>
        </label>
        <p className="m-0 text-[13px] text-ink-muted">{t('fieldOpenToInvitesHint')}</p>
      </div>

      {saved ? (
        <div data-testid="profile-saved">
          <Notice icon={<Check className="bx-icon" aria-hidden />}>
            {t('saved')}{' '}
            <Link href={`/${locale}/players/${playerSlug}`} className="underline">
              {t('viewPublic')}
            </Link>
          </Notice>
        </div>
      ) : null}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="profile-error"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="gold" type="submit" disabled={saving} data-testid="profile-save">
          <Save className="bx-icon" aria-hidden />
          {saving ? t('saving') : t('saveCta')}
        </Button>
        <Link href={`/${locale}/me`} className={buttonClass('ghost')}>
          {t('backToProfile')}
        </Link>
      </div>
    </form>
  );
}
