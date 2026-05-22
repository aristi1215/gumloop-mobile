/**
 * Dispatch abstraction for push notifications.
 *
 * We always log in development. When `expo-notifications` is available and
 * the user has granted permission, we also schedule a local notification so
 * that the alert appears in the system tray. This makes the full notification
 * lifecycle observable without requiring real APNs/FCM credentials.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppNotification } from '@/types/notifications';

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Flow Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return result.granted;
  } catch {
    return false;
  }
}

export async function dispatchLocalNotification(notification: AppNotification): Promise<void> {
  await configureNotifications();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: {
          run_id: notification.run_id,
          saved_item_id: notification.saved_item_id,
          category: notification.category,
        },
      },
      trigger: null,
    });
  } catch (error) {
    // Permissions denied or running in an environment without notifications.
    if (__DEV__) {
       
      console.log('[notifications] dispatch fallback', notification.title, error);
    }
  }
}
