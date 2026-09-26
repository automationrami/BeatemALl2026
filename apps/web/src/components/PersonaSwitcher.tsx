'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  PERSONA_COOKIE_NAME,
  PERSONAS,
  PERSONA_IDS,
  type PersonaId,
  useActAsPersona,
} from '@beat-em-all/api-client';
import { Avatar, useHasMounted } from '@beat-em-all/ui';

const FALLBACK_PERSONA = PERSONAS.khaled;

/**
 * Persona switcher — Phase-1 substitute for sign-in.
 *
 * Two side effects on change:
 *   1. Zustand persist updates `activePersonaId` (drives client-only stores).
 *   2. The `bx-current-persona` cookie is set with the player slug so server-side
 *      helpers (`getCurrentUser` in @beat-em-all/db/queries) can resolve the active
 *      identity for write API calls.
 *
 * After the cookie is written we call router.refresh() so any server-rendered
 * content reflects the new viewer immediately.
 */
export function PersonaSwitcher() {
  const t = useTranslations('actAs');
  const mounted = useHasMounted();
  const router = useRouter();
  const activePersonaId = useActAsPersona((s) => s.activePersonaId);
  const setActivePersona = useActAsPersona((s) => s.setActivePersona);

  // Until the persisted store hydrates, show the default persona to match the server render.
  const active = mounted ? PERSONAS[activePersonaId] : FALLBACK_PERSONA;

  const handleChange = (id: PersonaId) => {
    setActivePersona(id);
    const slug = PERSONAS[id].slug;
    // 30-day cookie; `path=/` so server-side helpers see it from any route.
    document.cookie = `${PERSONA_COOKIE_NAME}=${encodeURIComponent(slug)};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
    // Refresh server-rendered content so /teams/[slug], /challenges, etc. reflect the new viewer.
    router.refresh();
  };

  return (
    <label className="flex h-11 items-center gap-2 rounded-md bg-surface-100 ps-1.5 pe-2 shadow-bx-card">
      <Avatar name={active.displayName} size={32} />
      <span className="bx-eyebrow hidden sm:inline">{t('label')}</span>
      <select
        aria-label={t('label')}
        className="cursor-pointer bg-transparent pe-1 text-sm font-bold text-ink outline-none"
        value={mounted ? activePersonaId : 'khaled'}
        onChange={(e) => handleChange(e.target.value as PersonaId)}
        disabled={!mounted}
      >
        {PERSONA_IDS.map((id) => (
          <option key={id} value={id} className="bg-surface-100 text-ink">
            {t(id)}
          </option>
        ))}
      </select>
    </label>
  );
}
