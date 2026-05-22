import { useMemo } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, Chip, Divider, Screen, ScreenHeader, Text } from '@/components/ui';
import { AppConfig, isGumloopConfigured, isMockMode, isSupabaseConfigured } from '@/constants/config';
import { Spacing } from '@/constants/theme';
import { useNotificationPreferences } from '@/hooks/useNotifications';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme, type ThemePreference } from '@/providers/ThemeProvider';
import { requestNotificationPermissions } from '@/services/notifications/notificationService';
import { useSavedFlows } from '@/services/queries/flows';
import { supabaseMode } from '@/services/supabase/client';
import { gumloopAdapter } from '@/services/api';

const POLLING_OPTIONS = [
  { ms: 5_000, label: '5s' },
  { ms: 15_000, label: '15s' },
  { ms: 30_000, label: '30s' },
  { ms: 60_000, label: '1m' },
  { ms: 5 * 60_000, label: '5m' },
];

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { theme, preference: themePref, setPreference } = useTheme();
  const { user, signOut } = useAuth();
  const { preferences, update } = useNotificationPreferences();
  const savedFlows = useSavedFlows();

  const workbookSummary = useMemo(() => {
    const set = new Set<string>();
    (savedFlows.data ?? []).forEach((f) => f.workbook_name && set.add(f.workbook_name));
    return Array.from(set);
  }, [savedFlows.data]);

  async function onToggleNotifications(next: boolean) {
    if (next) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permissions required',
          'Enable notifications in system settings to receive flow alerts.',
        );
        return;
      }
    }
    await update({ enabled: next });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing[8] }}>
        <ScreenHeader title="Settings" subtitle="Tune monitoring and account preferences" />

        <Section title="Account">
          <Card style={{ gap: Spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="person" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">
                  { }
                  {(user as any)?.user_metadata?.display_name ?? 'Demo Operator'}
                </Text>
                <Text variant="caption" tone="muted">
                  { }
                  {(user as any)?.email ?? 'dev@gumloop.local'}
                </Text>
              </View>
            </View>
            <Divider />
            <Row label="Supabase" value={supabaseMode === 'live' ? 'Connected' : 'Local fallback'} />
            <Row
              label="Gumloop API"
              value={
                gumloopAdapter.mode === 'mock'
                  ? 'Demo mode'
                  : isGumloopConfigured()
                    ? 'Connected'
                    : 'Needs credentials'
              }
            />
            <Row label="App version" value={AppConfig.appVersion} />
            <Button
              label="Sign out"
              variant="secondary"
              fullWidth
              onPress={() => void signOut()}
              leftIcon={<Ionicons name="log-out-outline" size={16} color={theme.text} />}
            />
          </Card>
        </Section>

        <Section title="Workspace">
          <Card style={{ gap: Spacing[3] }}>
            <Text variant="caption" tone="muted">
              Active workspace
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' }}>
              <Chip label="All workspaces" selected />
              {workbookSummary.map((wb) => (
                <Chip key={wb} label={wb} />
              ))}
            </View>
            <Text variant="caption" tone="muted">
              Workspace selection determines which Gumloop workbooks appear in the dashboard. Wired
              to `gumloop_project_id` on your Supabase profile.
            </Text>
          </Card>
        </Section>

        <Section title="Notifications">
          <Card style={{ gap: Spacing[3] }}>
            <ToggleRow
              label="Enable alerts"
              description="Receive push notifications for monitored flow events."
              value={preferences.enabled}
              onValueChange={onToggleNotifications}
            />
            <Divider />
            <ToggleRow
              label="Failure alerts"
              description="Notify when a flow run fails."
              value={preferences.failureAlerts}
              onValueChange={(v) => update({ failureAlerts: v })}
            />
            <ToggleRow
              label="Termination alerts"
              description="Notify when a flow is killed."
              value={preferences.terminationAlerts}
              onValueChange={(v) => update({ terminationAlerts: v })}
            />
            <ToggleRow
              label="Completion alerts"
              description="Notify when a flow finishes successfully."
              value={preferences.completionAlerts}
              onValueChange={(v) => update({ completionAlerts: v })}
            />
            <Divider />
            <Text variant="caption" tone="muted">
              Polling interval
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' }}>
              {POLLING_OPTIONS.map((opt) => (
                <Chip
                  key={opt.ms}
                  label={opt.label}
                  selected={preferences.pollingIntervalMs === opt.ms}
                  onPress={() => void update({ pollingIntervalMs: opt.ms })}
                />
              ))}
            </View>
            <Text variant="caption" tone="subtle">
              Lower intervals catch state changes faster but use more battery and API quota.
            </Text>
          </Card>
        </Section>

        <Section title="Appearance">
          <Card style={{ gap: Spacing[3] }}>
            <Text variant="caption" tone="muted">
              Theme
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
              {THEME_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={opt.label}
                  selected={themePref === opt.key}
                  onPress={() => setPreference(opt.key)}
                />
              ))}
            </View>
          </Card>
        </Section>

        {(isMockMode() || !isSupabaseConfigured() || !isGumloopConfigured()) && (
          <Section title="Developer">
            <Card style={{ gap: Spacing[2] }}>
              <Text variant="bodyStrong">Production configuration</Text>
              <Text variant="caption" tone="muted">
                Set these variables for live Supabase persistence and Gumloop data:
              </Text>
              <Text variant="mono" tone="brand">
                EXPO_PUBLIC_USE_MOCK_API=false
              </Text>
              <Text variant="mono" tone="brand">
                EXPO_PUBLIC_GUMLOOP_API_KEY=…
              </Text>
              <Text variant="mono" tone="brand">
                EXPO_PUBLIC_GUMLOOP_USER_ID=…
              </Text>
              <Text variant="mono" tone="brand">
                EXPO_PUBLIC_SUPABASE_URL=…
              </Text>
              <Text variant="mono" tone="brand">
                EXPO_PUBLIC_SUPABASE_ANON_KEY=…
              </Text>
            </Card>
          </Section>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: Spacing[4], paddingTop: Spacing[3], gap: Spacing[2] }}>
      <Text
        variant="micro"
        tone="subtle"
        style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
      }}>
      <Text variant="body" tone="muted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingVertical: 4 }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.primary, false: theme.border }}
      />
    </View>
  );
}
