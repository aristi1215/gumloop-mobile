/**
 * Runtime configuration.
 *
 * `USE_MOCK_API` is the master switch for the Gumloop API mock adapter.
 * When credentials are wired up, set `EXPO_PUBLIC_USE_MOCK_API=false` and
 * provide `EXPO_PUBLIC_GUMLOOP_API_KEY` / `EXPO_PUBLIC_GUMLOOP_USER_ID`.
 *
 * Supabase credentials are loaded from `EXPO_PUBLIC_SUPABASE_URL` and
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY`. When these are missing we transparently
 * fall back to an in-memory Supabase stub so the app remains fully usable
 * in development.
 */
import Constants from 'expo-constants';

function readEnv(key: string): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.[key];
   
  const fromProcess = (process.env as any)?.[key] as string | undefined;
  return fromExtra ?? fromProcess;
}

function readBool(key: string, fallback: boolean): boolean {
  const raw = readEnv(key);
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const AppConfig = {
  appName: 'Gumloop Native',
  appVersion: '1.0.0',

  gumloop: {
    baseUrl: readEnv('EXPO_PUBLIC_GUMLOOP_BASE_URL') ?? 'https://api.gumloop.com/api/v1',
    apiKey: readEnv('EXPO_PUBLIC_GUMLOOP_API_KEY') ?? '',
    userId: readEnv('EXPO_PUBLIC_GUMLOOP_USER_ID') ?? '',
    projectId: readEnv('EXPO_PUBLIC_GUMLOOP_PROJECT_ID') ?? '',
    organizationId: readEnv('EXPO_PUBLIC_GUMLOOP_ORG_ID') ?? '',
    /** Master switch — defaults to true while credentials aren't configured. */
    useMockApi: readBool('EXPO_PUBLIC_USE_MOCK_API', true),
  },

  supabase: {
    url: readEnv('EXPO_PUBLIC_SUPABASE_URL') ?? '',
    anonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? '',
  },

  polling: {
    /** Default dashboard background refresh, in ms. */
    defaultIntervalMs: 15_000,
    minIntervalMs: 5_000,
    maxIntervalMs: 5 * 60_000,
  },

  pagination: {
    pageSize: 20,
    auditLogPageSize: 25,
  },
} as const;

export function isMockMode(): boolean {
  // We force mock mode if either explicit env flag is true OR credentials are missing.
  return AppConfig.gumloop.useMockApi || !AppConfig.gumloop.apiKey || !AppConfig.gumloop.userId;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(AppConfig.supabase.url) && Boolean(AppConfig.supabase.anonKey);
}
