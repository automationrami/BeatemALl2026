'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@beat-em-all/ui';

type Game = { slug: string; name: string; isPlayed: boolean };

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
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
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
      className="max-w-xl space-y-5 rounded-[20px] border border-[var(--line-2)] bg-[var(--bg-2)] p-6"
      data-testid="create-team-form"
    >
      {viewerHasTeam ? (
        <p className="text-[var(--t-4)] text-[12px] leading-relaxed">{t('hintAlreadyOnTeam')}</p>
      ) : null}

      <div>
        <label className="bx-eyebrow block mb-2" htmlFor="team-name">
          {t('fieldName')}
        </label>
        <input
          id="team-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('fieldNamePlaceholder')}
          maxLength={60}
          className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display placeholder:text-[var(--t-4)]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="bx-eyebrow block mb-2" htmlFor="team-tag">
            {t('fieldTag')}
          </label>
          <input
            id="team-tag"
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
            placeholder="SND"
            maxLength={6}
            className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display uppercase tracking-widest placeholder:text-[var(--t-4)]"
            required
          />
          <p className="text-[var(--t-4)] text-[11px] mt-1">{t('fieldTagHint')}</p>
        </div>
        <div>
          <label className="bx-eyebrow block mb-2" htmlFor="team-country">
            {t('fieldCountry')}
          </label>
          <select
            id="team-country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c} className="bg-[var(--bg-2)]">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="bx-eyebrow block mb-2" htmlFor="team-slug">
          {t('fieldSlug')}
        </label>
        <input
          id="team-slug"
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="sandstorm"
          maxLength={40}
          className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-mono lowercase placeholder:text-[var(--t-4)]"
          required
        />
        <p className="text-[var(--t-4)] text-[11px] mt-1">
          {t('fieldSlugHint', { slug: slug || '<your-slug>' })}
        </p>
      </div>

      <div>
        <label className="bx-eyebrow block mb-2" htmlFor="team-city">
          {t('fieldCity')}
        </label>
        <input
          id="team-city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('fieldCityPlaceholder')}
          maxLength={80}
          className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display placeholder:text-[var(--t-4)]"
        />
      </div>

      <div>
        <label className="bx-eyebrow block mb-2" htmlFor="team-bio">
          {t('fieldBio')}
        </label>
        <textarea
          id="team-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t('fieldBioPlaceholder')}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--bg-1)] px-3 py-2 text-sm font-display placeholder:text-[var(--t-4)]"
        />
      </div>

      <div>
        <p className="bx-eyebrow mb-2">{t('fieldGames')}</p>
        <div className="flex flex-wrap gap-2">
          {games.map((g) => {
            const picked = pickedGames.includes(g.slug);
            return (
              <button
                key={g.slug}
                type="button"
                onClick={() => toggleGame(g.slug)}
                className={[
                  'px-3 py-1.5 rounded-full border text-[12px] font-display font-medium transition-colors',
                  picked
                    ? 'border-[var(--violet-2)] bg-[rgba(139,92,246,0.14)] text-white'
                    : 'border-[var(--line-2)] bg-[var(--bg-1)] text-[var(--t-3)] hover:text-white',
                ].join(' ')}
                data-testid={`game-toggle-${g.slug}`}
              >
                {g.name}
                {g.isPlayed ? <span className="ms-2 text-[var(--cyan-2)]">●</span> : null}
              </button>
            );
          })}
        </div>
        <p className="text-[var(--t-4)] text-[11px] mt-2">{t('fieldGamesHint')}</p>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isRecruiting}
          onChange={(e) => setIsRecruiting(e.target.checked)}
          className="accent-[var(--violet-2)]"
        />
        <span className="text-[var(--t-3)]">{t('fieldRecruiting')}</span>
      </label>

      {error ? (
        <p
          className="text-[var(--coral-2)] text-[12px] leading-relaxed"
          data-testid="create-team-error"
        >
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
        <Button
          tone="primary"
          size="md"
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
