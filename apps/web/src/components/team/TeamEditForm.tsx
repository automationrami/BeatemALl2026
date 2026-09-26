'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Save } from 'lucide-react';
import { Button, Notice } from '@beat-em-all/ui';
import { apiErrorMessage, readApiError } from '@/lib/api-error';

type Props = {
  teamSlug: string;
  initial: { tag: string; city: string; bio: string; isRecruiting: boolean };
};

/** T-05: edit the team's tag, city, bio and recruiting flag (captain or co-captain). */
export function TeamEditForm({ teamSlug, initial }: Props) {
  const t = useTranslations('roster');
  const router = useRouter();
  const [tag, setTag] = useState(initial.tag);
  const [city, setCity] = useState(initial.city);
  const [bio, setBio] = useState(initial.bio);
  const [isRecruiting, setIsRecruiting] = useState(initial.isRecruiting);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const cleanTag = tag.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(cleanTag)) {
      setError(t('errors.invalid_tag'));
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(teamSlug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tag: cleanTag,
          city: city.trim() || null,
          bio: bio.trim() || null,
          isRecruiting,
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
      className="bx-card grid gap-5 p-5 min-[900px]:p-8"
      onSubmit={submit}
      data-testid="team-edit-form"
    >
      <div className="grid gap-5 min-[700px]:grid-cols-2">
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="team-edit-tag">
            {t('fieldTag')}
          </label>
          <input
            id="team-edit-tag"
            className="bx-field font-display uppercase tracking-[0.08em]"
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
            maxLength={6}
            dir="ltr"
            autoComplete="off"
            required
            aria-describedby="team-edit-tag-hint"
            data-testid="team-edit-tag"
          />
          <p id="team-edit-tag-hint" className="mt-1.5 text-[12px] text-ink-muted">
            {t('fieldTagHint')}
          </p>
        </div>
        <div>
          <label className="bx-eyebrow mb-2 block" htmlFor="team-edit-city">
            {t('fieldCity')}
          </label>
          <input
            id="team-edit-city"
            className="bx-field"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            dir="auto"
            data-testid="team-edit-city"
          />
        </div>
        <div className="min-[700px]:col-span-2">
          <label className="bx-eyebrow mb-2 block" htmlFor="team-edit-bio">
            {t('fieldBio')}
          </label>
          <textarea
            id="team-edit-bio"
            className="bx-field min-h-[112px] py-3"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            dir="auto"
            data-testid="team-edit-bio"
          />
          <p className="mt-1.5 text-[12px] text-ink-muted">
            {t('charsLeft', { count: 500 - bio.length })}
          </p>
        </div>
        <div className="min-[700px]:col-span-2">
          <label className="bx-check">
            <input
              type="checkbox"
              checked={isRecruiting}
              onChange={(e) => setIsRecruiting(e.target.checked)}
              data-testid="team-edit-recruiting"
            />
            {t('fieldRecruiting')}
          </label>
        </div>
      </div>

      {saved ? (
        <div data-testid="team-saved">
          <Notice icon={<Check className="bx-icon" aria-hidden />}>{t('saved')}</Notice>
        </div>
      ) : null}
      {error ? (
        <p
          className="m-0 rounded-md bg-negative-soft px-4 py-3 text-[13px] font-medium text-negative"
          role="alert"
          data-testid="team-edit-error"
        >
          {error}
        </p>
      ) : null}

      <Button
        variant="gold"
        type="submit"
        disabled={saving}
        className="justify-self-start"
        data-testid="team-save"
      >
        <Save className="bx-icon" aria-hidden />
        {saving ? t('saving') : t('saveCta')}
      </Button>
    </form>
  );
}
