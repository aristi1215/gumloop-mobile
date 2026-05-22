/**
 * Supabase client with a graceful in-memory fallback.
 *
 * When `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are
 * present we instantiate the real `@supabase/supabase-js` client. Otherwise
 * we expose a minimal mock that supports the `auth.signInWithPassword`,
 * `signUp`, `signOut`, `getSession`, and `onAuthStateChange` surface used
 * by the app. The mock persists sessions to AsyncStorage and is what
 * powers the dev experience while real Supabase isn't configured.
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { AppConfig, isSupabaseConfigured } from '@/constants/config';
import { createSupabaseMockClient } from './mockClient';

let _client: SupabaseClient | ReturnType<typeof createSupabaseMockClient>;

if (isSupabaseConfigured()) {
  _client = createClient(AppConfig.supabase.url, AppConfig.supabase.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} else {
  _client = createSupabaseMockClient();
}

/**
 * Typed enough for the app while remaining compatible with the real
 * Supabase client. Cast to `SupabaseClient` for strict typing in
 * Supabase-specific call-sites.
 */
export const supabase = _client as SupabaseClient;

export const supabaseMode: 'live' | 'mock' = isSupabaseConfigured() ? 'live' : 'mock';
