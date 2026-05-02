'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@beat-em-all/ui';

type Props = {
  tournamentSlug: string;
  tournamentName: string;
  /** "registration_open" enables the button; otherwise we render disabled with the reason. */
  isRegistrationOpen: boolean;
  /** Whether the active persona's primary team is already registered (server-resolved). */
  alreadyRegistered: boolean;
};

export function RegisterTeamButton({
  tournamentSlug,
  tournamentName,
  isRegistrationOpen,
  alreadyRegistered,
}: Props) {
  const t = useTranslations('registration');
  const locale = useLocale();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentSlug}/registrations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { registration: { registration: { id: string } } };
      router.push(`/${locale}/registrations/${json.registration.registration.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  if (!isRegistrationOpen) {
    return (
      <Button tone="ghost" size="md" disabled data-testid="register-disabled">
        {t('registrationClosedCta')}
      </Button>
    );
  }
  if (alreadyRegistered) {
    return (
      <Button tone="ghost" size="md" disabled data-testid="register-already">
        ✓ {t('alreadyRegisteredCta')}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button
        tone="primary"
        size="md"
        onClick={handleClick}
        disabled={submitting}
        data-testid="register-team-cta"
      >
        {submitting ? '…' : `${t('registerCta', { tournamentName })} →`}
      </Button>
      {error ? (
        <p className="text-[var(--coral-2)] text-[12px] leading-relaxed" data-testid="register-error">
          {t('errorGeneric', { message: error })}
        </p>
      ) : null}
    </div>
  );
}
