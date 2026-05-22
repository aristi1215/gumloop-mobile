/**
 * Gumloop API adapter contract.
 *
 * Two concrete implementations exist:
 *   - `liveAdapter` — talks to api.gumloop.com via `httpClient`
 *   - `mockAdapter` — operates entirely on the in-memory `mockStore`
 *
 * The exported `gumloopAdapter` selects between them based on
 * `isMockMode()` in `constants/config.ts`. Replacing mock → live at
 * runtime is therefore a one-flag change.
 */
import { AppConfig, isMockMode } from '@/constants/config';
import {
  cacheAuditLogsToSupabase,
  cacheRunsToSupabase,
  syncMonitoredFlowsToSupabase,
} from '@/services/supabase/backend';
import type {
  AuditLogQuery,
  AuditLogResponse,
  FlowRun,
  InputSchemaResponse,
  KillRunResponse,
  ListSavedFlowsResponse,
  ListWorkbooksResponse,
  RunHistoryMap,
  RunState,
  SavedFlow,
  StartFlowRunRequest,
  StartFlowRunResponse,
} from '@/types/gumloop';
import { httpRequest } from './httpClient';
import { buildInputSchema, mockStore } from './mockData';

async function persistBestEffort(task: Promise<void>, label: string): Promise<void> {
  try {
    await task;
  } catch (error) {
    if (__DEV__) console.warn(`[gumloopAdapter] ${label} failed`, error);
  }
}

export interface GumloopAdapter {
  readonly mode: 'mock' | 'live';
  listSavedFlows(): Promise<ListSavedFlowsResponse>;
  listWorkbooks(): Promise<ListWorkbooksResponse>;
  getRun(runId: string): Promise<FlowRun>;
  getRunHistory(params: { saved_item_id?: string; workbook_id?: string }): Promise<RunHistoryMap>;
  startRun(request: StartFlowRunRequest): Promise<StartFlowRunResponse>;
  killRun(runId: string): Promise<KillRunResponse>;
  getInputSchema(savedItemId: string): Promise<InputSchemaResponse>;
  getAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse>;
  /** Convenience method — fetches recent runs across all flows. */
  listRecentRuns(): Promise<FlowRun[]>;
}

// -----------------------------------------------------------------------------
// Live adapter
// -----------------------------------------------------------------------------

function withUserScope<T extends Record<string, unknown>>(query: T): T & {
  user_id?: string;
  project_id?: string;
} {
  const { userId, projectId } = AppConfig.gumloop;
  return {
    ...query,
    ...(projectId ? { project_id: projectId } : { user_id: userId }),
  };
}

const liveAdapter: GumloopAdapter = {
  mode: 'live',

  async listSavedFlows() {
    const response = await httpRequest<ListSavedFlowsResponse>('/list_saved_items', {
      query: withUserScope({}),
    });
    await persistBestEffort(syncMonitoredFlowsToSupabase(response.saved_items), 'sync flows');
    return response;
  },

  async listWorkbooks() {
    return httpRequest<ListWorkbooksResponse>('/list_workbooks', {
      query: withUserScope({}),
    });
  },

  async getRun(runId) {
    const run = await httpRequest<FlowRun>('/get_pl_run', {
      query: withUserScope({ run_id: runId }),
    });
    await persistBestEffort(cacheRunsToSupabase([run]), 'cache run');
    return run;
  },

  async getRunHistory(params) {
    const history = await httpRequest<RunHistoryMap>('/get_plrun_saved_item_map', {
      query: withUserScope({
        saved_item_id: params.saved_item_id,
        workbook_id: params.workbook_id,
      }) as Record<string, string | number | boolean | undefined | null>,
    });
    await persistBestEffort(cacheRunsToSupabase(Object.values(history).flat()), 'cache history');
    return history;
  },

  async startRun(request) {
    const body = {
      pipeline_inputs: request.pipeline_inputs ?? {},
    };
    return httpRequest<StartFlowRunResponse>('/start_pipeline', {
      method: 'POST',
      query: withUserScope({ saved_item_id: request.saved_item_id }),
      body,
    });
  },

  async killRun(runId) {
    return httpRequest<KillRunResponse>('/kill_pipeline', {
      method: 'POST',
      body: withUserScope({ run_id: runId }),
    });
  },

  async getInputSchema(savedItemId) {
    // Gumloop returns the input schema as part of the saved-flow detail endpoint;
    // we wrap into a normalized response.
    const raw = await httpRequest<{ saved_item_id: string; fields?: InputSchemaResponse['fields'] }>(
      '/get_saved_item_input_schema',
      {
        query: withUserScope({ saved_item_id: savedItemId }),
      },
    );
    return { saved_item_id: savedItemId, fields: raw.fields ?? [] };
  },

  async getAuditLogs(query) {
    const response = await httpRequest<AuditLogResponse>('/get_audit_logs', {
      query: {
        organization_id: query.organization_id ?? AppConfig.gumloop.organizationId,
        user_id: query.user_id ?? AppConfig.gumloop.userId,
        start_time: query.start_time,
        end_time: query.end_time,
        page: query.page,
        page_size: query.page_size,
      },
    });
    await persistBestEffort(cacheAuditLogsToSupabase(response.audit_logs), 'cache audit logs');
    return response;
  },

  async listRecentRuns() {
    // Gumloop doesn't expose a single endpoint for "all recent runs", so we
    // fan-out across saved flows and merge.
    const { saved_items } = await this.listSavedFlows();
    const histories = await Promise.all(
      saved_items.map((flow) => this.getRunHistory({ saved_item_id: flow.saved_item_id })),
    );
    const merged: FlowRun[] = [];
    for (const history of histories) {
      for (const list of Object.values(history)) merged.push(...list);
    }
    const sorted = merged.sort((a, b) => (a.created_ts < b.created_ts ? 1 : -1));
    await persistBestEffort(cacheRunsToSupabase(sorted), 'cache recent runs');
    return sorted;
  },
};

// -----------------------------------------------------------------------------
// Mock adapter
// -----------------------------------------------------------------------------

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const mockAdapter: GumloopAdapter = {
  mode: 'mock',

  async listSavedFlows() {
    mockStore.tick();
    const lastRunByFlow = new Map<string, FlowRun>();
    for (const run of mockStore.runs) {
      const existing = lastRunByFlow.get(run.saved_item_id);
      if (!existing || existing.created_ts < run.created_ts) {
        lastRunByFlow.set(run.saved_item_id, run);
      }
    }
    const enriched: SavedFlow[] = mockStore.savedFlows.map((flow) => {
      const last = lastRunByFlow.get(flow.saved_item_id);
      return {
        ...flow,
        last_run_state: last?.state as RunState | undefined,
        last_run_ts: last?.created_ts,
      };
    });
    return delay({ saved_items: enriched });
  },

  async listWorkbooks() {
    return delay({ workbooks: mockStore.workbooks });
  },

  async getRun(runId) {
    mockStore.tick();
    const run = mockStore.runs.find((r) => r.run_id === runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    return delay({ ...run });
  },

  async getRunHistory({ saved_item_id, workbook_id }) {
    const filtered = mockStore.runs.filter((run) => {
      if (saved_item_id && run.saved_item_id !== saved_item_id) return false;
      if (workbook_id && run.workbook_id !== workbook_id) return false;
      return true;
    });
    const map: RunHistoryMap = {};
    for (const run of filtered) {
      (map[run.saved_item_id] ??= []).push(run);
    }
    for (const list of Object.values(map)) list.splice(10);
    return delay(map);
  },

  async startRun(request) {
    const flow = mockStore.savedFlows.find((f) => f.saved_item_id === request.saved_item_id);
    if (!flow) throw new Error('Saved flow not found');
    const run = mockStore.startRun(flow, request.pipeline_inputs);
    return delay({
      run_id: run.run_id,
      saved_item_id: flow.saved_item_id,
      workbook_id: flow.workbook_id,
      url: `https://www.gumloop.com/pipeline?run_id=${run.run_id}&flow_id=${flow.saved_item_id}`,
    });
  },

  async killRun(runId) {
    const run = mockStore.killRun(runId);
    return delay({ success: Boolean(run), run_id: runId });
  },

  async getInputSchema(savedItemId) {
    return delay(buildInputSchema(savedItemId));
  },

  async getAuditLogs(query) {
    const start = new Date(query.start_time).getTime();
    const end = new Date(query.end_time).getTime();
    let logs = mockStore.auditLogs.filter((entry) => {
      const ts = new Date(entry.timestamp).getTime();
      return ts >= start && ts <= end;
    });
    if (query.event_type) logs = logs.filter((e) => e.event_type === query.event_type);
    if (query.search) {
      const needle = query.search.toLowerCase();
      logs = logs.filter(
        (e) =>
          e.details.toLowerCase().includes(needle) ||
          e.event_type.toLowerCase().includes(needle) ||
          e.user_email?.toLowerCase().includes(needle) ||
          e.source_ip.includes(needle),
      );
    }
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 25;
    const start_index = (page - 1) * pageSize;
    const paginated = logs.slice(start_index, start_index + pageSize);
    return delay({
      audit_logs: paginated,
      total_count: logs.length,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(logs.length / pageSize)),
    });
  },

  async listRecentRuns() {
    mockStore.tick();
    return delay([...mockStore.runs].slice(0, 100));
  },
};

export const gumloopAdapter: GumloopAdapter = isMockMode() ? mockAdapter : liveAdapter;

/** Exposed for tests / explicit overrides. */
export { liveAdapter, mockAdapter };
