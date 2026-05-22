import 'react-native-url-polyfill/auto';
import '@/global.css';

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers/AuthProvider';
import { isGumloopConfigured, isMockMode } from '@/constants/config';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { configureNotifications } from '@/services/notifications/notificationService';
import { notificationStore } from '@/services/notifications/notificationStore';
import { runWatcher } from '@/services/notifications/runWatcher';

export default function RootLayout() {
  useEffect(() => {
    let unsubscribePrefs: (() => void) | undefined;
    const canWatchRuns = isMockMode() || isGumloopConfigured();
    void configureNotifications();
    void (async () => {
      if (!canWatchRuns) return;
      await notificationStore.hydrate();
      const prefs = notificationStore.preferences.get();
      if (prefs.enabled) {
        await runWatcher.start({ intervalMs: prefs.pollingIntervalMs });
      }
      unsubscribePrefs = notificationStore.preferences.subscribe((next) => {
        if (next.enabled) {
          void runWatcher.start({ intervalMs: next.pollingIntervalMs });
        } else {
          runWatcher.stop();
        }
      });
    })();
    return () => {
      unsubscribePrefs?.();
      runWatcher.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
