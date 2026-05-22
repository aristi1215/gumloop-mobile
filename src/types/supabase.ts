/**
 * Supabase database types — mirror the schema in `supabase/schema.sql`.
 * These types are kept in sync manually but can be regenerated with
 * `supabase gen types typescript` once the project is configured.
 */
export type UUID = string;

export interface DBOrganization {
  id: UUID;
  name: string;
  gumloop_org_id: string | null;
  created_at: string;
}

export interface DBWorkspace {
  id: UUID;
  organization_id: UUID;
  name: string;
  gumloop_project_id: string | null;
  created_at: string;
}

export interface DBUserProfile {
  id: UUID; // references auth.users.id
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  organization_id: UUID | null;
  active_workspace_id: UUID | null;
  gumloop_user_id: string | null;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface DBNotificationPreference {
  id: UUID;
  user_id: UUID;
  enabled: boolean;
  failure_alerts: boolean;
  termination_alerts: boolean;
  completion_alerts: boolean;
  polling_interval_ms: number;
  flow_overrides: Record<string, unknown>;
  updated_at: string;
}

export interface DBMonitoredFlow {
  id: UUID;
  user_id: UUID;
  workspace_id: UUID | null;
  saved_item_id: string;
  flow_name: string;
  is_pinned: boolean;
  notify_on_failure: boolean;
  notify_on_termination: boolean;
  notify_on_completion: boolean;
  created_at: string;
}

export interface DBCachedRun {
  id: UUID;
  user_id: UUID;
  run_id: string;
  saved_item_id: string;
  flow_name: string | null;
  state: string;
  created_ts: string;
  finished_ts: string | null;
  duration_ms: number | null;
  payload: Record<string, unknown>;
  updated_at: string;
}

export interface DBNotification {
  id: UUID;
  user_id: UUID;
  category: 'failure' | 'termination' | 'completion';
  title: string;
  body: string;
  run_id: string;
  saved_item_id: string;
  flow_name: string;
  state: string;
  read: boolean;
  created_at: string;
}

export interface DBAuditLogCache {
  id: UUID;
  organization_id: UUID;
  event_id: string;
  event_type: string;
  user_id: string;
  details: string;
  source_ip: string;
  user_agent: string;
  occurred_at: string;
  cached_at: string;
}
