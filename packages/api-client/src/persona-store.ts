'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const PERSONA_IDS = ['khaled', 'sara', 'ahmad', 'omar', 'fatima'] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export type Persona = {
  id: PersonaId;
  displayName: string;
  arabicName: string;
  role: 'player' | 'tournament_manager' | 'venue_owner' | 'brand_marketer';
  avatarColor: string;
  city: string;
  country: 'KW' | 'KSA' | 'AE' | 'BH' | 'QA' | 'OM';
  org?: string;
};

export const PERSONAS: Record<PersonaId, Persona> = {
  khaled: {
    id: 'khaled',
    displayName: 'Khaled Al-Mutairi',
    arabicName: 'خالد المطيري',
    role: 'player',
    avatarColor: '#8B5CF6',
    city: 'Salmiya',
    country: 'KW',
  },
  sara: {
    id: 'sara',
    displayName: 'Sara Al-Awadhi',
    arabicName: 'سارة العوضي',
    role: 'player',
    avatarColor: '#FB7185',
    city: 'Hawally',
    country: 'KW',
  },
  ahmad: {
    id: 'ahmad',
    displayName: 'Ahmad Al-Rashed',
    arabicName: 'أحمد الراشد',
    role: 'tournament_manager',
    avatarColor: '#22D3EE',
    city: 'Kuwait City',
    country: 'KW',
    org: 'Kuwait Esports Club',
  },
  omar: {
    id: 'omar',
    displayName: 'Omar Al-Saud',
    arabicName: 'عمر آل سعود',
    role: 'venue_owner',
    avatarColor: '#BEF264',
    city: 'Riyadh',
    country: 'KSA',
    org: 'DXE Fuel',
  },
  fatima: {
    id: 'fatima',
    displayName: 'Fatima Al-Mansour',
    arabicName: 'فاطمة المنصور',
    role: 'brand_marketer',
    avatarColor: '#FBBF24',
    city: 'Kuwait City',
    country: 'KW',
    org: 'Zain Kuwait',
  },
};

type PersonaState = {
  activePersonaId: PersonaId;
  setActivePersona: (id: PersonaId) => void;
};

export const useActAsPersona = create<PersonaState>()(
  persist(
    (set) => ({
      activePersonaId: 'khaled',
      setActivePersona: (id) => set({ activePersonaId: id }),
    }),
    {
      name: 'beat-em-all:act-as-persona',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getActivePersona(id: PersonaId): Persona {
  return PERSONAS[id];
}
