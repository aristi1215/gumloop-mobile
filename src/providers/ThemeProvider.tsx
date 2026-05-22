/**
 * Theme provider that exposes the active semantic palette and a user-controlled
 * theme preference (system | light | dark). The preference is persisted to
 * AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

import { DarkTheme, LightTheme, type SemanticTheme, type ThemeMode } from '@/constants/theme';

type ResolvedColorScheme = NonNullable<ColorSchemeName>;

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'gumloop.theme.v1';

interface ThemeContextValue {
  theme: SemanticTheme;
  mode: ThemeMode;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(preference: ThemePreference, system: ResolvedColorScheme): ThemeMode {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [system, setSystem] = useState<ResolvedColorScheme>(
    () => (Appearance.getColorScheme() ?? 'dark') as ResolvedColorScheme,
  );

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        setPreferenceState(raw);
      }
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystem((colorScheme ?? 'dark') as ResolvedColorScheme),
    );
    return () => sub.remove();
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const mode = resolveMode(preference, system);
  const theme = mode === 'dark' ? DarkTheme : LightTheme;

  const value = useMemo(
    () => ({ theme, mode, preference, setPreference }),
    [theme, mode, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
