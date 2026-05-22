import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  getSession,
  signInWithPassword,
  signOut as svcSignOut,
  signUp,
  subscribeToAuthChanges,
  type AuthSession,
} from '@/services/supabase/auth';
import { notificationStore } from '@/services/notifications/notificationStore';
import { bootstrapBackendForSession } from '@/services/supabase/backend';

interface AuthContextValue {
  session: AuthSession;
  user: AuthSession extends { user: infer U } ? U : null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getSession().then((s) => {
      if (!cancelled) {
        setSession(s);
        setLoading(false);
      }
    });
    const sub = subscribeToAuthChanges((next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void bootstrapBackendForSession()
      .then(() => notificationStore.hydrate({ force: true }))
      .catch((error) => {
        if (__DEV__) console.warn('[auth] backend bootstrap failed', error);
      });
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithPassword(email, password);
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpFn = useCallback(async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    try {
      await signUp(email, password, displayName);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await svcSignOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: (session?.user ?? null) as AuthContextValue['user'],
      loading,
      signIn,
      signUp: signUpFn,
      signOut,
    }),
    [session, loading, signIn, signUpFn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
