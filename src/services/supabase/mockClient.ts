/**
 * Lightweight in-memory Supabase stand-in for development without credentials.
 *
 * Implements only the auth surface the app uses (sign in / sign up / sign out /
 * session listener) along with a no-op database query stub so screens that
 * happen to call `.from(...)` keep working. Session state is persisted to
 * AsyncStorage so it survives reloads.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MockUser {
  id: string;
  email: string;
  user_metadata: { display_name?: string };
}

interface MockSession {
  user: MockUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'INITIAL_SESSION';
type Listener = (event: AuthChangeEvent, session: MockSession | null) => void;

const STORAGE_KEY = 'gumloop.mock.session.v1';
const DEFAULT_DEV_USER: MockUser = {
  id: 'usr_dev_00000000-0000-4000-8000-000000000001',
  email: 'dev@gumloop.local',
  user_metadata: { display_name: 'Demo Operator' },
};

class MockAuth {
  private session: MockSession | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.session = JSON.parse(raw) as MockSession;
        this.notify('INITIAL_SESSION');
        return;
      }
    } catch {
      /* ignore */
    }
    this.notify('INITIAL_SESSION');
  }

  private async persist(): Promise<void> {
    if (this.session) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  }

  private notify(event: AuthChangeEvent): void {
    for (const listener of this.listeners) listener(event, this.session);
  }

  async getSession(): Promise<{ data: { session: MockSession | null }; error: null }> {
    if (!this.session) {
      // ensure hydration if called early
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) this.session = JSON.parse(raw) as MockSession;
    }
    return { data: { session: this.session }, error: null };
  }

  async signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ data: { session: MockSession | null; user: MockUser | null }; error: Error | null }> {
    if (!credentials.email.includes('@') || credentials.password.length < 4) {
      return {
        data: { session: null, user: null },
        error: new Error('Invalid email or password.'),
      };
    }
    const user: MockUser = {
      id: DEFAULT_DEV_USER.id,
      email: credentials.email,
      user_metadata: { display_name: credentials.email.split('@')[0] },
    };
    this.session = {
      user,
      access_token: `mock_access_${Date.now()}`,
      refresh_token: `mock_refresh_${Date.now()}`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    };
    await this.persist();
    this.notify('SIGNED_IN');
    return { data: { session: this.session, user }, error: null };
  }

  async signUp(credentials: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }): Promise<{ data: { session: MockSession | null; user: MockUser | null }; error: Error | null }> {
    return this.signInWithPassword({ email: credentials.email, password: credentials.password });
  }

  async signOut(): Promise<{ error: null }> {
    this.session = null;
    await this.persist();
    this.notify('SIGNED_OUT');
    return { error: null };
  }

  onAuthStateChange(callback: Listener): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }
}

function chainableQueryStub(initial: unknown[] = []): unknown {
  const promise = Promise.resolve({ data: initial, error: null });
  const chain: Record<string, unknown> = {
    select: () => chainableQueryStub(initial),
    insert: () => chainableQueryStub(initial),
    upsert: () => chainableQueryStub(initial),
    update: () => chainableQueryStub(initial),
    delete: () => chainableQueryStub(initial),
    eq: () => chainableQueryStub(initial),
    in: () => chainableQueryStub(initial),
    order: () => chainableQueryStub(initial),
    limit: () => chainableQueryStub(initial),
    single: () => Promise.resolve({ data: initial[0] ?? null, error: null }),
    maybeSingle: () => Promise.resolve({ data: initial[0] ?? null, error: null }),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return chain;
}

export function createSupabaseMockClient() {
  const auth = new MockAuth();
  return {
    auth,
    from: (_table: string) => chainableQueryStub(),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    removeChannel: () => {},
  };
}

export type SupabaseMockClient = ReturnType<typeof createSupabaseMockClient>;
