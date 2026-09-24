import type { TranslationStrings } from '@trek/shared/i18n';
import en from '@trek/shared/i18n/en';
import * as Localization from 'expo-localization';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

/**
 * Reuses the exact string tables client/src/i18n/TranslationContext.tsx
 * reads from @trek/shared — the single source of truth stays the shared
 * package either way. What's reimplemented here is only the *loading*
 * strategy: the web provider dynamically `import()`s a locale bundle per
 * Vite's code-splitting; Metro doesn't chunk the same way, so this starts
 * with `en` statically bundled and other locales added as static requires
 * when Phase 3 adds a language picker, instead of porting the dynamic-import
 * loader. Locale *detection* also differs: `document`/`navigator` are
 * replaced with expo-localization.
 */
interface TranslationContextValue {
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

const BUNDLES: Record<string, TranslationStrings> = { en };

function detectLocale(): string {
  const tag = Localization.getLocales()[0]?.languageCode ?? 'en';
  return tag in BUNDLES ? tag : 'en';
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const value = useMemo<TranslationContextValue>(() => {
    const locale = detectLocale();
    const strings = BUNDLES[locale] ?? en;
    return {
      locale,
      t(key, vars) {
        const entry = strings[key];
        if (typeof entry !== 'string') return key;
        return interpolate(entry, vars);
      },
    };
  }, []);

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within a TranslationProvider');
  return ctx;
}
