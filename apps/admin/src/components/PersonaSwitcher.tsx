'use client';

import { useTranslations } from 'next-intl';
import { PERSONAS, PERSONA_IDS, type PersonaId, useActAsPersona } from '@beat-em-all/api-client';

export function PersonaSwitcher() {
  const t = useTranslations('actAs');
  const activePersonaId = useActAsPersona((s) => s.activePersonaId);
  const setActivePersona = useActAsPersona((s) => s.setActivePersona);
  const active = PERSONAS[activePersonaId];

  return (
    <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line-2)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
      <span
        className="w-7 h-7 rounded-full grid place-items-center text-xs font-medium border border-white/10"
        style={{
          background: `linear-gradient(135deg, ${active.avatarColor}, ${active.avatarColor}77)`,
        }}
        aria-hidden
      >
        {active.displayName
          .split(' ')
          .map((s) => s[0])
          .slice(0, 2)
          .join('')}
      </span>
      <span className="bx-eyebrow hidden sm:inline">{t('label')}</span>
      <select
        aria-label={t('label')}
        className="bg-transparent outline-none text-sm font-medium pr-2 cursor-pointer"
        value={activePersonaId}
        onChange={(e) => setActivePersona(e.target.value as PersonaId)}
      >
        {PERSONA_IDS.map((id) => (
          <option key={id} value={id} className="bg-[var(--bg-2)] text-white">
            {t(id)}
          </option>
        ))}
      </select>
    </label>
  );
}
