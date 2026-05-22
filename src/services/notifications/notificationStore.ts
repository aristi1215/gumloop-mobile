/**
 * Lightweight observable store for in-app notification history.
 *
 * Backed by AsyncStorage so notifications survive reloads. In production
 * this would be replaced by Supabase-backed reads/writes but we keep the
 * interface identical so swapping later is trivial.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppNotification, AlertCategory, NotificationPreferences } from '@/types/notifications';

const NOTIFS_KEY = 'gumloop.notifications.v1';
const PREFS_KEY = 'gumloop.notification.prefs.v1';

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  failureAlerts: true,
  terminationAlerts: true,
  completionAlerts: false,
  pollingIntervalMs: 15_000,
  flowOverrides: {},
};

type Listener<T> = (value: T) => void;

class Observable<T> {
  private value: T;
  private listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
    for (const l of this.listeners) l(next);
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }
}

class NotificationStore {
  notifications = new Observable<AppNotification[]>([]);
  preferences = new Observable<NotificationPreferences>(DEFAULT_PREFERENCES);
  private hydrated = false;

  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const [notifsRaw, prefsRaw] = await Promise.all([
        AsyncStorage.getItem(NOTIFS_KEY),
        AsyncStorage.getItem(PREFS_KEY),
      ]);
      if (notifsRaw) {
        this.notifications.set(JSON.parse(notifsRaw) as AppNotification[]);
      }
      if (prefsRaw) {
        this.preferences.set({
          ...DEFAULT_PREFERENCES,
          ...(JSON.parse(prefsRaw) as Partial<NotificationPreferences>),
        });
      }
    } catch {
      /* ignore */
    }
  }

  async add(notification: AppNotification): Promise<void> {
    const next = [notification, ...this.notifications.get()].slice(0, 200);
    this.notifications.set(next);
    await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(next));
  }

  async markRead(id: string): Promise<void> {
    const next = this.notifications.get().map((n) => (n.id === id ? { ...n, read: true } : n));
    this.notifications.set(next);
    await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(next));
  }

  async markAllRead(): Promise<void> {
    const next = this.notifications.get().map((n) => ({ ...n, read: true }));
    this.notifications.set(next);
    await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(next));
  }

  async clear(): Promise<void> {
    this.notifications.set([]);
    await AsyncStorage.removeItem(NOTIFS_KEY);
  }

  async updatePreferences(next: Partial<NotificationPreferences>): Promise<void> {
    const merged: NotificationPreferences = { ...this.preferences.get(), ...next };
    this.preferences.set(merged);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  }

  shouldNotify(category: AlertCategory, savedItemId: string): boolean {
    const prefs = this.preferences.get();
    if (!prefs.enabled) return false;
    const override = prefs.flowOverrides[savedItemId];

    const map = {
      failure: { global: prefs.failureAlerts, override: override?.failureAlerts },
      termination: { global: prefs.terminationAlerts, override: override?.terminationAlerts },
      completion: { global: prefs.completionAlerts, override: override?.completionAlerts },
    } as const;
    const { global, override: per } = map[category];
    return per ?? global;
  }
}

export const notificationStore = new NotificationStore();
