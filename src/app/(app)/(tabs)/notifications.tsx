import { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, EmptyState, Screen, ScreenHeader, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/providers/ThemeProvider';
import { runWatcher } from '@/services/notifications/runWatcher';
import { useRecentRuns } from '@/services/queries/flows';
import type { AppNotification } from '@/types/notifications';
import { formatRelativeTime } from '@/utils/format';

const CATEGORY_META = {
  failure: {
    icon: 'alert-circle' as const,
    color: '#EF4444',
    bg: { light: '#FEF2F2', dark: 'rgba(239,68,68,0.16)' },
  },
  termination: {
    icon: 'stop-circle' as const,
    color: '#F59E0B',
    bg: { light: '#FFFBEB', dark: 'rgba(245,158,11,0.16)' },
  },
  completion: {
    icon: 'checkmark-circle' as const,
    color: '#10B981',
    bg: { light: '#ECFDF5', dark: 'rgba(16,185,129,0.16)' },
  },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead, clear } = useNotifications();
  const recentRuns = useRecentRuns();

  const failed = useMemo(
    () => (recentRuns.data ?? []).find((r) => r.state === 'FAILED' || r.state === 'TERMINATED'),
    [recentRuns.data],
  );

  return (
    <Screen>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ gap: Spacing[3], paddingBottom: Spacing[3] }}>
            <ScreenHeader
              title="Alerts"
              subtitle={`${unreadCount} unread · ${notifications.length} total`}
              trailing={
                notifications.length > 0 ? (
                  <Pressable
                    onPress={() => void markAllRead()}
                    hitSlop={12}
                    style={{
                      paddingHorizontal: Spacing[3],
                      paddingVertical: Spacing[2],
                      borderRadius: 8,
                      backgroundColor: theme.surfaceMuted,
                    }}>
                    <Text variant="caption" tone="brand">
                      Mark all read
                    </Text>
                  </Pressable>
                ) : null
              }
            />
            <View
              style={{
                marginHorizontal: Spacing[4],
                padding: Spacing[3],
                borderRadius: 12,
                backgroundColor: theme.primarySubtle,
                gap: Spacing[2],
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <Ionicons name="information-circle-outline" color={theme.primary} size={16} />
                <Text variant="bodyStrong" tone="brand">
                  Test the alert pipeline
                </Text>
              </View>
              <Text variant="caption" tone="brand">
                Generate a synthetic failure / termination / completion alert against your most
                recent failing run.
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' }}>
                <Button
                  label="Simulate failure"
                  variant="secondary"
                  size="sm"
                  disabled={!failed}
                  onPress={() => failed && void runWatcher.injectTestAlert(failed, 'failure')}
                />
                <Button
                  label="Simulate completion"
                  variant="secondary"
                  size="sm"
                  disabled={!failed}
                  onPress={() => failed && void runWatcher.injectTestAlert(failed, 'completion')}
                />
                <Button
                  label="Clear history"
                  variant="ghost"
                  size="sm"
                  onPress={() => void clear()}
                />
              </View>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
        contentContainerStyle={{ paddingHorizontal: Spacing[4], paddingBottom: Spacing[8] }}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={() => {
              void markRead(item.id);
              router.push(`/(app)/flow/${item.saved_item_id}?runId=${item.run_id}`);
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No alerts yet"
            description="When a monitored flow fails, terminates, or completes, you'll see it here."
          />
        }
      />
    </Screen>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const meta = CATEGORY_META[notification.category];

  return (
    <Pressable onPress={onPress}>
      <Card
        style={{
          flexDirection: 'row',
          gap: Spacing[3],
          alignItems: 'flex-start',
          backgroundColor: notification.read ? theme.surface : theme.primarySubtle,
        }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: meta.bg[theme.mode],
          }}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {notification.title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {notification.body}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing[2], alignItems: 'center' }}>
            <Text variant="micro" tone="subtle">
              {formatRelativeTime(notification.created_at)}
            </Text>
            <Text variant="micro" tone="subtle">
              ·
            </Text>
            <Text variant="micro" tone="subtle">
              {notification.flow_name}
            </Text>
          </View>
        </View>
        {!notification.read ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.primary,
              marginTop: 8,
            }}
          />
        ) : null}
      </Card>
    </Pressable>
  );
}
