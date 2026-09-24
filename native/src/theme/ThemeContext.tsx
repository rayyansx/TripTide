import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { type ColorTokens, type MobileTokens, darkColors, lightColors, mobileDark, mobileLight, radius, spacing } from './tokens';

/**
 * Mirrors client/src/theme/'s darkMode preference: a 3-way choice — 'light',
 * 'dark', or 'auto' (follow the OS, same as the web app's
 * `window.matchMedia('(prefers-color-scheme: dark)')`). Persisted the same
 * way the web app caches to localStorage, just via AsyncStorage here; no
 * flash-of-wrong-theme concern on RN since there's no separate paint-before-
 * JS step the way there is on web (theme-boot.js's job doesn't exist here).
 */
export type DarkModePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'trek_appearance_darkmode';

interface ThemeContextValue {
  colors: ColorTokens;
  /** Phone-shell palette (client/src/mobile/mobile.css). Prefer this on screens. */
  m: MobileTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  isDark: boolean;
  preference: DarkModePreference;
  setPreference: (pref: DarkModePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<DarkModePreference>('auto');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'auto') {
          setPreferenceState(stored);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  function setPreference(pref: DarkModePreference) {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }

  const resolvedScheme = preference === 'auto' ? (systemScheme ?? Appearance.getColorScheme() ?? 'light') : preference;
  const isDark = resolvedScheme === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      m: isDark ? mobileDark : mobileLight,
      spacing,
      radius,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference]
  );

  // Avoid a flash of the wrong theme while the persisted preference loads.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
