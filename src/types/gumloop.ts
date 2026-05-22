/**
 * Typed models for the Gumloop public API.
 *
 * Cross-referenced against the official OpenAPI definitions:
 *   https://docs.gumloop.com/api-reference/getting-automation-details/list-saved-automations
 *   https://docs.gumloop.com/api-reference/running-an-automation/start-automation
 *   https://docs.gumloop.com/api-reference/running-an-automation/retrieve-run-details
 *   https://docs.gumloop.com/api-reference/running-an-automation/kill-automation
 *   https://docs.gumloop.com/api-reference/getting-automation-details/retrieve-run-history
 *   https://docs.gumloop.com/api-reference/organization/get-audit-logs
 *
 * The prompt referenced REST-style endpoints (e.g. `/saved-flows`); Gumloop
 * actually exposes flat verbs (`/list_saved_items`, `/start_pipeline`, etc.).
 * We keep our types aligned to the latter so the mock layer is a drop-in
 * replacement once credentials are configured.
 */

export type RunState = 'STARTED' | 'RUNNING' | 'DONE' | 'FAILED' | 'TERMINATED' | 'QUEUED';

export const RunStateLabel: Record<RunState, string> = {
  STARTED: 'Started',
  RUNNING: 'Running',
  DONE: 'Completed',
  FAILED: 'Failed',
  TERMINATED: 'Terminated',
  QUEUED: 'Queued',
};

export interface SavedFlow {
  saved_item_id: string;
  name: string;
  description?: string;
  created_ts: string;
  /** Optional, normalized client-side from `/list_workbooks`. */
  workbook_id?: string;
  workbook_name?: string;
  /** Convenience client-side enrichments (not part of the public API). */
  last_run_state?: RunState;
  last_run_ts?: string;
}

export interface Workbook {
  workbook_id: string;
  name: string;
  description?: string;
  saved_items: SavedFlow[];
}

export interface ListSavedFlowsResponse {
  saved_items: SavedFlow[];
}

export interface ListWorkbooksResponse {
  workbooks: Workbook[];
}

export interface FlowRun {
  run_id: string;
  saved_item_id: string;
  state: RunState;
  created_ts: string;
  finished_ts: string | null;
  /** Duration in milliseconds — derived client-side. */
  duration_ms?: number | null;
  log: string[];
  outputs: Record<string, unknown>;
  user_id?: string;
  /** Trigger metadata — surfaced on Gumloop's run details payload. */
  triggered_by?: string;
  trigger_type?: 'manual' | 'api' | 'schedule' | 'webhook';
  inputs?: Record<string, unknown>;
  error_message?: string | null;
  /** Convenience flow name, joined client-side from saved flows. */
  flow_name?: string;
  workbook_id?: string;
  workbook_name?: string;
}

export interface StartFlowRunRequest {
  saved_item_id: string;
  /** Either user_id or project_id is required. */
  user_id?: string;
  project_id?: string;
  /** Free-form payload mapped to Webhook Input / Named Input nodes. */
  pipeline_inputs?: Record<string, unknown>;
}

export interface StartFlowRunResponse {
  run_id: string;
  saved_item_id: string;
  workbook_id?: string;
  url: string;
}

export interface KillRunRequest {
  run_id: string;
  user_id?: string;
  project_id?: string;
}

export interface KillRunResponse {
  success: boolean;
  run_id: string;
}

export interface RunHistoryMap {
  /** Key is `saved_item_id`. */
  [savedItemId: string]: FlowRun[];
}

export interface InputSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  required: boolean;
  description?: string;
  default?: unknown;
}

export interface InputSchemaResponse {
  saved_item_id: string;
  fields: InputSchemaField[];
}

export interface AuditLogEntry {
  event_id: string;
  timestamp: string;
  event_type: string;
  user_id: string;
  user_email?: string;
  details: string;
  source_ip: string;
  user_agent: string;
}

export interface AuditLogResponse {
  audit_logs: AuditLogEntry[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogQuery {
  organization_id?: string;
  user_id?: string;
  start_time: string;
  end_time: string;
  page?: number;
  page_size?: number;
  search?: string;
  event_type?: string;
}
