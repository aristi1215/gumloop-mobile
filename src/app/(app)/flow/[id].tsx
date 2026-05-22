import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, Divider, Screen, Skeleton, StatusBadge, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { LogViewer } from '@/features/runs/LogViewer';
import { useNotificationPreferences } from '@/hooks/useNotifications';
import { useTheme } from '@/providers/ThemeProvider';
import {
  useInputSchema,
  useKillRun,
  useRun,
  useRunHistory,
  useSavedFlows,
  useStartRun,
} from '@/services/queries/flows';
import type { FlowRun } from '@/types/gumloop';
import { RunStateLabel } from '@/types/gumloop';
import { formatDateTime, formatDuration, formatRelativeTime } from '@/utils/format';

export default function FlowDetailScreen() {
  const params = useLocalSearchParams<{ id: string; runId?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { preferences } = useNotificationPreferences();

  const savedFlows = useSavedFlows();
  const flow = savedFlows.data?.find((f) => f.saved_item_id === params.id);

  const history = useRunHistory(params.id);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(params.runId);
  const effectiveRunId =
    selectedRunId ?? params.runId ?? history.data?.[0]?.run_id ?? undefined;

  const run = useRun(effectiveRunId, { pollIntervalMs: preferences.pollingIntervalMs });
  const inputSchema = useInputSchema(params.id);

  const startRun = useStartRun();
  const killRun = useKillRun();

  const ordered = useMemo(() => history.data ?? [], [history.data]);

  async function onStartRun() {
    if (!params.id) return;
    try {
      const result = await startRun.mutateAsync({ saved_item_id: params.id });
      setSelectedRunId(result.run_id);
      Alert.alert('Run started', `New run ${result.run_id} dispatched.`);
    } catch (e) {
      Alert.alert('Could not start run', (e as Error).message);
    }
  }

  async function onKillRun() {
    if (!run.data) return;
    if (!['RUNNING', 'STARTED', 'QUEUED'].includes(run.data.state)) return;
    try {
      await killRun.mutateAsync(run.data.run_id);
      Alert.alert('Run terminated', `Run ${run.data.run_id} was killed.`);
    } catch (e) {
      Alert.alert('Could not kill run', (e as Error).message);
    }
  }

  async function onRetryRun() {
    if (!params.id || !run.data) return;
    try {
      const result = await startRun.mutateAsync({
        saved_item_id: params.id,
        pipeline_inputs: run.data.inputs,
      });
      setSelectedRunId(result.run_id);
      Alert.alert('Run retried', `Re-dispatched as ${result.run_id}.`);
    } catch (e) {
      Alert.alert('Could not retry run', (e as Error).message);
    }
  }

  return (
    <Screen edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <Ionicons name="chevron-back" color={theme.text} size={18} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing[4],
          paddingTop: Spacing[8],
          paddingBottom: Spacing[8],
          gap: Spacing[4],
        }}>
        {/* Header */}
        <View style={{ gap: Spacing[2] }}>
          <Text variant="caption" tone="subtle">
            {flow?.workbook_name ?? 'Workspace'}
          </Text>
          <Text variant="title">{flow?.name ?? 'Workflow'}</Text>
          {flow?.description ? (
            <Text variant="body" tone="muted">
              {flow.description}
            </Text>
          ) : null}
        </View>

        {/* Current run */}
        <Card style={{ gap: Spacing[3] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text variant="h1">Current run</Text>
            {run.data ? <StatusBadge state={run.data.state} /> : null}
          </View>
          {run.isLoading ? (
            <View style={{ gap: Spacing[2] }}>
              <Skeleton width="80%" height={18} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={14} />
            </View>
          ) : run.data ? (
            <RunSummary run={run.data} />
          ) : (
            <Text tone="muted">Select a run from history below to inspect it.</Text>
          )}
          <View style={{ flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' }}>
            <Button
              label="Start new run"
              onPress={onStartRun}
              loading={startRun.isPending}
              size="md"
              leftIcon={<Ionicons name="play" color="#FFFFFF" size={14} />}
            />
            {run.data?.state === 'FAILED' || run.data?.state === 'TERMINATED' ? (
              <Button
                label="Retry"
                onPress={onRetryRun}
                variant="secondary"
                loading={startRun.isPending}
                leftIcon={<Ionicons name="refresh" color={theme.text} size={14} />}
              />
            ) : null}
            {run.data && ['RUNNING', 'STARTED', 'QUEUED'].includes(run.data.state) ? (
              <Button
                label="Kill"
                onPress={onKillRun}
                variant="danger"
                loading={killRun.isPending}
                leftIcon={<Ionicons name="stop" color="#FFFFFF" size={14} />}
              />
            ) : null}
            <Button
              label="Refresh"
              variant="ghost"
              onPress={() => void run.refetch()}
              leftIcon={<Ionicons name="reload" color={theme.text} size={14} />}
            />
          </View>
        </Card>

        {run.data?.inputs ? (
          <KeyValueCard title="Inputs" data={run.data.inputs} />
        ) : null}
        {run.data?.outputs && Object.keys(run.data.outputs).length > 0 ? (
          <KeyValueCard title="Outputs" data={run.data.outputs} />
        ) : null}

        {inputSchema.data && inputSchema.data.length > 0 ? (
          <Card style={{ gap: Spacing[2] }}>
            <Text variant="h2">Input schema</Text>
            {inputSchema.data.map((field) => (
              <View
                key={field.name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: Spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: theme.divider,
                }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{field.name}</Text>
                  {field.description ? (
                    <Text variant="caption" tone="muted">
                      {field.description}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text variant="caption" tone="brand">
                    {field.type}
                  </Text>
                  {field.required ? (
                    <Text variant="micro" tone="danger">
                      required
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {run.data ? <LogViewer log={run.data.log ?? []} /> : null}

        {/* History */}
        <Card style={{ gap: Spacing[3] }}>
          <Text variant="h2">Historical runs</Text>
          {history.isLoading ? (
            <Skeleton width="100%" height={120} />
          ) : ordered.length === 0 ? (
            <Text tone="muted">No previous runs.</Text>
          ) : (
            ordered.map((entry, index) => (
              <View key={entry.run_id}>
                <Pressable onPress={() => setSelectedRunId(entry.run_id)}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: Spacing[2],
                      gap: Spacing[3],
                      backgroundColor:
                        entry.run_id === effectiveRunId ? theme.primarySubtle : 'transparent',
                      borderRadius: 8,
                      paddingHorizontal: Spacing[2],
                    }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="caption" tone="subtle">
                        {entry.run_id}
                      </Text>
                      <Text variant="body">
                        {formatRelativeTime(entry.created_ts)} · {formatDuration(entry.duration_ms)}
                      </Text>
                    </View>
                    <StatusBadge state={entry.state} size="sm" />
                  </View>
                </Pressable>
                {index < ordered.length - 1 ? <Divider /> : null}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function RunSummary({ run }: { run: FlowRun }) {
  return (
    <View style={{ gap: Spacing[2] }}>
      <Text variant="caption" tone="subtle">
        Run ID
      </Text>
      <Text variant="mono">{run.run_id}</Text>
      <View style={{ flexDirection: 'row', gap: Spacing[4], flexWrap: 'wrap' }}>
        <SummaryItem label="Started" value={formatDateTime(run.created_ts)} />
        <SummaryItem label="Finished" value={formatDateTime(run.finished_ts)} />
        <SummaryItem label="Duration" value={formatDuration(run.duration_ms)} />
        <SummaryItem label="Trigger" value={run.trigger_type ?? '—'} />
        <SummaryItem label="By" value={run.triggered_by ?? '—'} />
        <SummaryItem label="State" value={RunStateLabel[run.state]} />
      </View>
      {run.error_message ? <ErrorMessageBox message={run.error_message} /> : null}
    </View>
  );
}

function ErrorMessageBox({ message }: { message: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        padding: Spacing[3],
        backgroundColor: theme.mode === 'dark' ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.mode === 'dark' ? 'rgba(239,68,68,0.35)' : '#FECACA',
      }}>
      <Text variant="caption" tone="danger">
        {message}
      </Text>
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 120 }}>
      <Text variant="micro" tone="subtle" style={{ textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

function KeyValueCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const { theme } = useTheme();
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <Card style={{ gap: Spacing[2] }}>
      <Text variant="h2">{title}</Text>
      {entries.map(([key, value]) => (
        <View key={key} style={{ paddingVertical: 4 }}>
          <Text variant="caption" tone="subtle">
            {key}
          </Text>
          <Text variant="mono" style={{ color: theme.text }}>
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </Text>
        </View>
      ))}
    </Card>
  );
}
