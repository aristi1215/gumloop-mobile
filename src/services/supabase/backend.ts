import { AppConfig } from '@/constants/config';
import { supabase, supabaseMode } from '@/services/supabase/client';
import type { AuditLogEntry, FlowRun, SavedFlow } from '@/types/gumloop';
import type { AppNotification, NotificationPreferences } from '@/types/notifications';
import type { DBNotification, DBNotificationPreference, DBUserProfile } from '@/types/supabase';

export function isSupabaseLive(): boolean {
  return supabaseMode === 'live';
}

async function getUserId(): Promise<string | null> {
  if (!isSupabaseLive()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function fromDbPreferences(row: DBNotificationPreference): NotificationPreferences {
  return {
    enabled: row.enabled,
    failureAlerts: row.failure_alerts,
    terminationAlerts: row.termination_alerts,
    completionAlerts: row.completion_alerts,
    pollingIntervalMs: row.polling_interval_ms,
    flowOverrides: row.flow_overrides as NotificationPreferences['flowOverrides'],
  };
}

function toDbPreferenceUpdate(next: Partial<NotificationPreferences>) {
  return {
    ...(next.enabled !== undefined ? { enabled: next.enabled } : {}),
    ...(next.failureAlerts !== undefined ? { failure_alerts: next.failureAlerts } : {}),
    ...(next.terminationAlerts !== undefined ? { termination_alerts: next.terminationAlerts } : {}),
    ...(next.completionAlerts !== undefined ? { completion_alerts: next.completionAlerts } : {}),
    ...(next.pollingIntervalMs !== undefined ? { polling_interval_ms: next.pollingIntervalMs } : {}),
    ...(next.flowOverrides !== undefined ? { flow_overrides: next.flowOverrides } : {}),
  };
}

function fromDbNotification(row: DBNotification): AppNotification {
  return {
    id: row.id,
    category: row.category as AppNotification['category'],
    title: row.title,
    body: row.body,
    run_id: row.run_id,
    saved_item_id: row.saved_item_id,
    flow_name: row.flow_name,
    state: row.state as AppNotification['state'],
    created_at: row.created_at,
    read: row.read,
  };
}

export async function bootstrapBackendForSession(): Promise<DBUserProfile | null> {
  if (!isSupabaseLive()) return null;
  const { data, error } = await supabase.rpc('ensure_user_workspace', {
    p_default_org_name: 'Gumloop',
    p_default_workspace_name: 'Production',
    p_gumloop_org_id: AppConfig.gumloop.organizationId || null,
    p_gumloop_project_id: AppConfig.gumloop.projectId || null,
    p_gumloop_user_id: AppConfig.gumloop.userId || null,
  });
  if (error) throw error;
  return (data as DBUserProfile | null) ?? null;
}

export async function getProfile(): Promise<DBUserProfile | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as DBUserProfile | null;
}

export async function getNotificationPreferences(
  fallback: NotificationPreferences,
): Promise<NotificationPreferences> {
  const userId = await getUserId();
  if (!userId) return fallback;
  await bootstrapBackendForSession();
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromDbPreferences(data as DBNotificationPreference) : fallback;
}

export async function updateNotificationPreferences(
  next: Partial<NotificationPreferences>,
): Promise<NotificationPreferences | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...toDbPreferenceUpdate(next) }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return fromDbPreferences(data as DBNotificationPreference);
}

export async function listNotifications(): Promise<AppNotification[]> {
  const userId = await getUserId();
  if (!userId) return [];
  await bootstrapBackendForSession();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as DBNotification[]).map(fromDbNotification);
}

export async function addNotification(notification: AppNotification): Promise<AppNotification | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      category: notification.category,
      title: notification.title,
      body: notification.body,
      run_id: notification.run_id,
      saved_item_id: notification.saved_item_id,
      flow_name: notification.flow_name,
      state: notification.state,
      read: notification.read,
      created_at: notification.created_at,
    })
    .select('*')
    .single();
  if (error) throw error;
  return fromDbNotification(data as DBNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function clearNotifications(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function syncMonitoredFlowsToSupabase(flows: SavedFlow[]): Promise<void> {
  const userId = await getUserId();
  if (!userId || flows.length === 0) return;
  const profile = await bootstrapBackendForSession();
  const rows = flows.map((flow) => ({
    user_id: userId,
    workspace_id: profile?.active_workspace_id ?? null,
    saved_item_id: flow.saved_item_id,
    flow_name: flow.name,
  }));
  const { error } = await supabase.from('monitored_flows').upsert(rows, {
    onConflict: 'user_id,saved_item_id',
  });
  if (error) throw error;
}

export async function cacheRunsToSupabase(runs: FlowRun[]): Promise<void> {
  const userId = await getUserId();
  if (!userId || runs.length === 0) return;
  await bootstrapBackendForSession();
  const rows = runs.map((run) => ({
    user_id: userId,
    run_id: run.run_id,
    saved_item_id: run.saved_item_id,
    flow_name: run.flow_name ?? null,
    state: run.state,
    created_ts: run.created_ts,
    finished_ts: run.finished_ts,
    duration_ms: run.duration_ms ?? null,
    payload: run as unknown as Record<string, unknown>,
  }));
  const { error } = await supabase.from('cached_runs').upsert(rows, {
    onConflict: 'user_id,run_id',
  });
  if (error) throw error;
}

export async function cacheAuditLogsToSupabase(logs: AuditLogEntry[]): Promise<void> {
  if (logs.length === 0) return;
  const profile = await getProfile();
  if (!profile?.organization_id) return;
  const rows = logs.map((entry) => ({
    organization_id: profile.organization_id!,
    event_id: entry.event_id,
    event_type: entry.event_type,
    user_id: entry.user_id,
    user_email: entry.user_email ?? null,
    details: entry.details,
    source_ip: entry.source_ip,
    user_agent: entry.user_agent,
    occurred_at: entry.timestamp,
  }));
  const { error } = await supabase.from('audit_log_cache').upsert(rows, {
    onConflict: 'organization_id,event_id',
  });
  if (error) throw error;
}
