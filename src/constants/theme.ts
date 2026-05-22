/**
 * Gumloop Native design tokens.
 *
 * Inspired by https://www.gumloop.com/design — dark-first, minimal,
 * with Gumloop's signature pink (#e8438e) as the primary brand color. These tokens
 * are also mirrored in `tailwind.config.js` so that NativeWind utilities
 * stay aligned with the imperative StyleSheet API.
 */

export const Palette = {
  brand: {
    50: '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#E8438E',
    600: '#DB2777',
    700: '#BE185D',
    800: '#9D174D',
    900: '#831843',
  },
  ink: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#09090B',
  },
  status: {
    running: { fg: '#E8438E', bg: '#FDF2F8', border: '#FBCFE8' },
    completed: { fg: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0' },
    failed: { fg: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
    terminated: { fg: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    queued: { fg: '#71717A', bg: '#F4F4F5', border: '#E4E4E7' },
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
  surfaceSubtle: '#F4F4F5',
  surfaceMuted: '#F4F4F5',
  border: '#E4E4E7',
  borderStrong: '#D4D4D8',
  text: '#09090B',
  textMuted: '#71717A',
  textSubtle: '#A1A1AA',
  textInverse: '#FFFFFF',
  primary: Palette.brand[500],
  primarySubtle: Palette.brand[50],
  primaryStrong: Palette.brand[600],
  divider: '#E4E4E7',
  overlay: 'rgba(0, 0, 0, 0.8)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const DarkTheme: SemanticTheme = {
  mode: 'dark',
  background: '#09090B',
  surface: '#0F0F12',
  surfaceSubtle: '#18181B',
  surfaceMuted: '#27272A',
  border: '#27272A',
  borderStrong: '#3F3F46',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textSubtle: '#71717A',
  textInverse: '#FFFFFF',
  primary: Palette.brand[500],
  primarySubtle: 'rgba(232, 67, 142, 0.16)',
  primaryStrong: Palette.brand[400],
  divider: '#27272A',
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
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
} as const;

export const Typography = {
  display: { fontSize: 36, lineHeight: 42, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h1: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
} as const;
