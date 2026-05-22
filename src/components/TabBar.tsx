import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';

const ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }> = {
  dashboard: { default: 'pulse-outline', active: 'pulse' },
  notifications: { default: 'notifications-outline', active: 'notifications' },
  audit: { default: 'shield-checkmark-outline', active: 'shield-checkmark' },
  settings: { default: 'settings-outline', active: 'settings' },
};

const LABELS: Record<string, string> = {
  dashboard: 'Runs',
  notifications: 'Alerts',
  audit: 'Audit',
  settings: 'Settings',
};

// We deliberately use a loose prop type — Expo Router 56 forbids direct
// imports from @react-navigation/* in app code. The runtime shape is the same
// as `BottomTabBarProps`.
 
export function TabBar({ state, descriptors, navigation }: any) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingHorizontal: Spacing[2],
        paddingTop: Spacing[2],
        paddingBottom: Math.max(insets.bottom, Spacing[2]),
        gap: Spacing[1],
      }}>
      {state.routes.map((route: { name: string; key: string }, index: number) => {
        const focused = state.index === index;
        const icons = ICONS[route.name];
        const iconName = focused ? icons?.active ?? 'ellipse' : icons?.default ?? 'ellipse-outline';
        const label = LABELS[route.name] ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        const showBadge = route.name === 'notifications' && unreadCount > 0;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: Spacing[2],
              gap: 4,
            }}>
            <View>
              <Ionicons
                name={iconName}
                size={22}
                color={focused ? theme.primary : theme.textMuted}
              />
              {showBadge ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    variant="micro"
                    style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 12 }}>
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="micro" style={{ color: focused ? theme.primary : theme.textMuted }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
