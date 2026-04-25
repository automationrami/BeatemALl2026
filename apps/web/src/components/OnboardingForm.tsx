'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, GameCard, StepIndicator } from '@beat-em-all/ui';
import { GAMES_LIST } from '@beat-em-all/mock-data';
import type { GameId } from '@beat-em-all/types';
import { completeOnboarding } from '@beat-em-all/api-client';

const TOTAL_STEPS = 7;
const CURRENT_STEP = 4; // game selection — the only step we ship in this slice

export function OnboardingForm() {
  const t = useTranslations('onboarding');
  const locale = useLocale() as 'en' | 'ar';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<GameId>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function toggle(id: GameId) {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue() {
    if (selected.size === 0) {
      setError(t('minOneGame'));
      return;
    }
    const result = completeOnboarding([...selected]);
    if (!result.ok) {
      setError(t('minOneGame'));
      return;
    }
    startTransition(() => router.push(`/${locale}`));
  }

  return (
    <div>
      <StepIndicator
        step={CURRENT_STEP}
        total={TOTAL_STEPS}
        eyebrow={t('stepOf', { step: CURRENT_STEP, total: TOTAL_STEPS })}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-8">
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

      {error && <p className="mt-4 text-[12px] font-display text-[var(--coral-2)]">{error}</p>}

      <div className="flex gap-3 mt-8">
        <Button
          tone="ghost"
          size="md"
          type="button"
          onClick={() => router.push(`/${locale}/verify`)}
        >
          ← {t('back')}
        </Button>
        <div className="flex-1">
          <Button
            tone="primary"
            size="md"
            full
            type="button"
            onClick={handleContinue}
            disabled={pending || selected.size === 0}
          >
            {t('continue')} →
          </Button>
        </div>
      </div>
    </div>
  );
}
