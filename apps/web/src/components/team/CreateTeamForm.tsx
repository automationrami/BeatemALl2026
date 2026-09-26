'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, GameCard } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Game = {
  slug: string;
  name: string;
  isPlayed: boolean;
  /** Short wordmark for the game tile, e.g. "VAL". Falls back to `name`. */
  shortName?: string;
  brandColor?: string;
};

type Props = {
  locale: string;
  defaultCountry: string;
  games: Game[];
  /** Already-on-a-team personas can still create another team, but we surface a hint. */
  viewerHasTeam: boolean;
};

const COUNTRIES = ['KW', 'KSA', 'AE', 'BH', 'QA', 'OM'] as const;

/**
 * Slug suggester: lowercase, replace whitespace and `&` with hyphens, strip everything
 * else, collapse repeated hyphens, trim leading/trailing hyphens.
 */
function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&]/g, '-')
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function CreateTeamForm({ locale, defaultCountry, games, viewerHasTeam }: Props) {
  const t = useTranslations('teamCreate');
  const router = useRouter();

  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [countryCode, setCountryCode] = useState(defaultCountry);
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [isRecruiting, setIsRecruiting] = useState(false);

  const initiallyPlayed = useMemo(
    () => games.filter((g) => g.isPlayed).map((g) => g.slug),
    [games],
  );
  const [pickedGames, setPickedGames] = useState<string[]>(() =>
    initiallyPlayed.length > 0 ? [initiallyPlayed[0] as string] : [],
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest slug from name until the user manually edits it.
  useEffect(() => {
    if (!slugTouched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlug(suggestSlug(name));
    }
  }, [name, slugTouched]);

  const toggleGame = (gameSlug: string) => {
    setPickedGames((prev) =>
      prev.includes(gameSlug) ? prev.filter((s) => s !== gameSlug) : [...prev, gameSlug],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (pickedGames.length === 0) {
      setError(t('errorNoGames'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          tag: tag.trim().toUpperCase(),
          slug: slug.trim().toLowerCase(),
          countryCode,
          city: city.trim() || null,
          bio: bio.trim() || null,
          isRecruiting,
          gameSlugs: pickedGames,
        }),
      });
      if (!res.ok) {
        throw new Error(apiErrorMessage(t, await readApiError(res), `HTTP ${res.status}`));
      }
      const json = (await res.json()) as { team: { slug: string } };
      router.push(`/${locale}/teams/${json.team.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bx-card grid max-w-3xl gap-8 p-6 md:p-8"
      data-testid="create-team-form"
    >
      {viewerHasTeam ? (
        <p className="bx-inset px-4 py-3 text-[14px] leading-relaxed text-ink-muted">
          {t('hintAlreadyOnTeam')}
        </p>
      ) : null}

      <fieldset className="grid gap-5">
        <legend className="bx-label mb-5 text-ink">{t('formTitle')}</legend>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="team-name">
            {t('fieldName')}
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('fieldNamePlaceholder')}
            maxLength={60}
            className="bx-field"
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="bx-eyebrow mb-2 block" htmlFor="team-tag">
              {t('fieldTag')}
            </label>
            <input
              id="team-tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase())}
              placeholder="SND"
              maxLength={6}
              className="bx-field uppercase tracking-[0.12em]"
              required
            />
            <p className="mt-1.5 text-[13px] text-ink-muted">{t('fieldTagHint')}</p>
          </div>
          <div>
            <label className="bx-eyebrow mb-2 block" htmlFor="team-country">
              {t('fieldCountry')}
            </label>
            <select
              id="team-country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="bx-field"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-surface-200">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="team-slug">
            {t('fieldSlug')}
          </label>
          <input
            id="team-slug"
            type="text"
            dir="ltr"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="sandstorm"
            maxLength={40}
            className="bx-field lowercase"
            required
          />
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {t('fieldSlugHint', { slug: slug || '<your-slug>' })}
          </p>
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="team-city">
            {t('fieldCity')}
          </label>
          <input
            id="team-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('fieldCityPlaceholder')}
            maxLength={80}
            className="bx-field"
          />
        </div>

        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="team-bio">
            {t('fieldBio')}
          </label>
          <textarea
            id="team-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('fieldBioPlaceholder')}
            rows={3}
            maxLength={500}
            className="bx-field py-2.5"
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="bx-label mb-3 text-ink">{t('fieldGames')}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {games.map((g) => (
            <div key={g.slug} data-testid={`game-toggle-${g.slug}`}>
              <GameCard
                shortName={g.shortName ?? g.name}
                title={g.isPlayed ? `${g.name} · ${t('gamePlayed')}` : g.name}
                brandColor={g.brandColor ?? ''}
                selected={pickedGames.includes(g.slug)}
                onToggle={() => toggleGame(g.slug)}
              />
            </div>
          ))}
        </div>
        <p className="text-[13px] text-ink-muted">{t('fieldGamesHint')}</p>
      </fieldset>

      <label className="bx-check justify-self-start">
        <input
          type="checkbox"
          checked={isRecruiting}
          onChange={(e) => setIsRecruiting(e.target.checked)}
        />
        <span>{t('fieldRecruiting')}</span>
      </label>

      {error ? (
        <p
          className="rounded-md bg-negative-soft px-4 py-3 text-[14px] leading-relaxed text-negative"
          role="alert"
          data-testid="create-team-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}

      <div className="flex justify-end border-t border-line pt-6">
        <Button
          variant="gold"
          type="submit"
          disabled={submitting || !name || !tag || !slug || pickedGames.length === 0}
          data-testid="create-team-submit"
        >
          {submitting ? '…' : t('submitCta')}
        </Button>
      </div>
    </form>
  );
}
