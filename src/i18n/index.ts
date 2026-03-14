import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en } from './en';
import { th } from './th';
import type { Language, Translations } from './types';

const translations: Record<Language, Translations> = { en, th };

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: 'th' as Language,
      setLanguage: (language) => set({ language }),
      toggleLanguage: () =>
        set((state) => ({
          language: state.language === 'en' ? 'th' : 'en',
        })),
    }),
    { name: 'trading-kan-language' }
  )
);

/** Hook to get current translations */
export function useTranslation(): Translations & { lang: Language } {
  const language = useI18nStore((s) => s.language);
  return { ...translations[language], lang: language };
}

/** Non-hook version for use outside React components */
export function t(key: keyof Translations): string {
  const lang = useI18nStore.getState().language;
  return translations[lang][key];
}

export type { Language, Translations };
