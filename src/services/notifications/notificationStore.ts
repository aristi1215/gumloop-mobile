/**
 * Lightweight observable store for in-app notification history.
 *
 * Backed by Supabase when configured, with AsyncStorage retained only for
 * explicit demo mode and local development without credentials.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppNotification, AlertCategory, NotificationPreferences } from '@/types/notifications';
import {
  addNotification,
  clearNotifications,
  getNotificationPreferences,
  isSupabaseLive,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from '@/services/supabase/backend';

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

  async hydrate(options?: { force?: boolean }): Promise<void> {
    if (this.hydrated && !options?.force) return;
    this.hydrated = true;
    if (isSupabaseLive()) {
      try {
        const [notifications, preferences] = await Promise.all([
          listNotifications(),
          getNotificationPreferences(DEFAULT_PREFERENCES),
        ]);
        this.notifications.set(notifications);
        this.preferences.set(preferences);
        return;
      } catch (error) {
        if (__DEV__) console.warn('[notificationStore] Supabase hydrate failed', error);
      }
    }
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
    let persisted = notification;
    if (isSupabaseLive()) {
      try {
        persisted = (await addNotification(notification)) ?? notification;
      } catch (error) {
        if (__DEV__) console.warn('[notificationStore] Supabase add failed', error);
      }
    }
    const next = [persisted, ...this.notifications.get()].slice(0, 200);
    this.notifications.set(next);
    if (!isSupabaseLive()) await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(next));
  }

  async markRead(id: string): Promise<void> {
    const next = this.notifications.get().map((n) => (n.id === id ? { ...n, read: true } : n));
    this.notifications.set(next);
    if (isSupabaseLive()) {
      await markNotificationRead(id);
    } else {
      await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(next));
    }
  }

  async markAllRead(): Promise<void> {
    const next = this.notifications.get().map((n) => ({ ...n, read: true }));
    this.notifications.set(next);
    if (isSupabaseLive()) {
      await markAllNotificationsRead();
    } else {
      await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(next));
    }
  }

  async clear(): Promise<void> {
    this.notifications.set([]);
    if (isSupabaseLive()) {
      await clearNotifications();
    } else {
      await AsyncStorage.removeItem(NOTIFS_KEY);
    }
  }

  async updatePreferences(next: Partial<NotificationPreferences>): Promise<void> {
    const merged: NotificationPreferences = { ...this.preferences.get(), ...next };
    if (isSupabaseLive()) {
      const persisted = await updateNotificationPreferences(next);
      this.preferences.set(persisted ?? merged);
      return;
    }
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
