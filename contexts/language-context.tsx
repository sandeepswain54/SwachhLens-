import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { translations, type Language, type TranslationKey } from '@/lib/i18n/translations';

export type { Language };

const STORAGE_KEY = 'swachhlens.language';

type LanguageState = {
  // undefined while AsyncStorage hasn't been read yet, null once read and
  // nothing was ever saved (first-time user — language-select decides it).
  language: Language;
  hasChosenLanguage: boolean;
  ready: boolean;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('en');
  const [hasChosenLanguage, setHasChosenLanguage] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'en' || stored === 'hi' || stored === 'or') {
          setLanguageState(stored);
          setHasChosenLanguage(true);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    setHasChosenLanguage(true);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const entry = translations[key];
      // Falls back to the raw value after the namespace (e.g. a waste
      // category the dictionary doesn't cover yet) instead of leaking the
      // literal "namespace.key" onto the screen.
      let text = entry ? entry[language] || entry.en : (key.slice(key.indexOf('.') + 1) || key);
      if (vars) {
        for (const varKey of Object.keys(vars)) {
          text = text.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(vars[varKey]));
        }
      }
      return text;
    },
    [language]
  );

  const value = useMemo<LanguageState>(
    () => ({ language, hasChosenLanguage, ready, setLanguage, t }),
    [language, hasChosenLanguage, ready, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
