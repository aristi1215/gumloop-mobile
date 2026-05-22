import { useEffect, useState } from 'react';

import {
  DEFAULT_PREFERENCES,
  notificationStore,
} from '@/services/notifications/notificationStore';
import type { AppNotification, NotificationPreferences } from '@/types/notifications';

export function useNotifications(): {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clear: () => Promise<void>;
} {
  const [notifications, setNotifications] = useState<AppNotification[]>(
    notificationStore.notifications.get(),
  );

  useEffect(() => {
    let mounted = true;
    void notificationStore.hydrate();
    const unsub = notificationStore.notifications.subscribe((next) => {
      if (mounted) setNotifications(next);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markRead: (id) => notificationStore.markRead(id),
    markAllRead: () => notificationStore.markAllRead(),
    clear: () => notificationStore.clear(),
  };
}

export function useNotificationPreferences(): {
  preferences: NotificationPreferences;
  update: (next: Partial<NotificationPreferences>) => Promise<void>;
} {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationStore.preferences.get() ?? DEFAULT_PREFERENCES,
  );

  useEffect(() => {
    void notificationStore.hydrate();
    const unsub = notificationStore.preferences.subscribe(setPreferences);
    return () => unsub();
  }, []);

  return {
    preferences,
    update: (next) => notificationStore.updatePreferences(next),
  };
}
