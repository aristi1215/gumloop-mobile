/**
 * Gumloop Native design tokens.
 *
 * Inspired by https://www.gumloop.com/design — clean, enterprise, minimal,
 * with a signature blue (#208AEF) as the primary brand color. These tokens
 * are also mirrored in `tailwind.config.js` so that NativeWind utilities
 * stay aligned with the imperative StyleSheet API.
 */

export const Palette = {
  brand: {
    50: '#EAF5FF',
    100: '#D2E9FE',
    200: '#A7D3FE',
    300: '#7BBDFD',
    400: '#4FA7FC',
    500: '#208AEF',
    600: '#1A6FBE',
    700: '#13548E',
    800: '#0D3A60',
    900: '#062035',
  },
  ink: {
    50: '#F7F8FA',
    100: '#EEF0F3',
    200: '#DCE0E7',
    300: '#B9C0CC',
    400: '#8B95A6',
    500: '#5E6B80',
    600: '#404C61',
    700: '#2A3447',
    800: '#1A2233',
    900: '#0E141F',
  },
  status: {
    running: { fg: '#208AEF', bg: '#EAF5FF', border: '#A7D3FE' },
    completed: { fg: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
    failed: { fg: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
    terminated: { fg: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    queued: { fg: '#5E6B80', bg: '#F7F8FA', border: '#DCE0E7' },
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export interface SemanticTheme {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  primary: string;
  primarySubtle: string;
  primaryStrong: string;
  divider: string;
  overlay: string;
  shadow: string;
}

export const LightTheme: SemanticTheme = {
  mode: 'light',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F7F8FA',
  surfaceMuted: '#EEF0F3',
  border: '#DCE0E7',
  borderStrong: '#B9C0CC',
  text: '#0E141F',
  textMuted: '#404C61',
  textSubtle: '#8B95A6',
  textInverse: '#FFFFFF',
  primary: Palette.brand[500],
  primarySubtle: Palette.brand[50],
  primaryStrong: Palette.brand[600],
  divider: '#EEF0F3',
  overlay: 'rgba(14, 20, 31, 0.45)',
  shadow: 'rgba(14, 20, 31, 0.08)',
};

export const DarkTheme: SemanticTheme = {
  mode: 'dark',
  background: '#0A0F1A',
  surface: '#0E141F',
  surfaceSubtle: '#141B2A',
  surfaceMuted: '#1A2233',
  border: '#2A3447',
  borderStrong: '#404C61',
  text: '#F7F8FA',
  textMuted: '#B9C0CC',
  textSubtle: '#8B95A6',
  textInverse: '#0E141F',
  primary: Palette.brand[400],
  primarySubtle: 'rgba(32, 138, 239, 0.16)',
  primaryStrong: Palette.brand[300],
  divider: '#1A2233',
  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export const Spacing = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 32,
  '8': 40,
  '9': 48,
  '10': 64,
} as const;

export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const Typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h1: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  h2: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
} as const;
