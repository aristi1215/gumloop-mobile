/**
 * Realistic Gumloop mock fixtures.
 *
 * These payloads intentionally mirror Gumloop's real API shapes so that
 * swapping in real credentials is a no-op. Data is regenerated lazily and
 * persisted in-memory for the duration of the session so polling and
 * state transitions behave realistically.
 */
import type {
  AuditLogEntry,
  FlowRun,
  InputSchemaResponse,
  RunState,
  SavedFlow,
  Workbook,
} from '@/types/gumloop';

const NOW = () => new Date();

function isoOffset(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function shortId(prefix: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 22; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return prefix ? `${prefix}_${id}` : id;
}

export const MOCK_WORKBOOKS: Workbook[] = [
  { workbook_id: 'wb_growth_ops', name: 'Growth Ops', description: 'Lead enrichment & outbound', saved_items: [] },
  { workbook_id: 'wb_revops', name: 'RevOps', description: 'CRM sync and reporting', saved_items: [] },
  { workbook_id: 'wb_internal_ai', name: 'Internal AI', description: 'AI assistants & internal tools', saved_items: [] },
  { workbook_id: 'wb_data_pipelines', name: 'Data Pipelines', description: 'ETL and warehouse jobs', saved_items: [] },
];

export const MOCK_SAVED_FLOWS: SavedFlow[] = [
  {
    saved_item_id: 'flow_lead_enrichment',
    name: 'Lead Enrichment Pipeline',
    description: 'Enrich inbound leads via Clearbit + Apollo and write to HubSpot.',
    created_ts: isoOffset(60 * 24 * 21),
    workbook_id: 'wb_growth_ops',
    workbook_name: 'Growth Ops',
  },
  {
    saved_item_id: 'flow_outbound_personalization',
    name: 'Outbound Personalization',
    description: 'LinkedIn scrape → ICP score → personalized cold email draft.',
    created_ts: isoOffset(60 * 24 * 14),
    workbook_id: 'wb_growth_ops',
    workbook_name: 'Growth Ops',
  },
  {
    saved_item_id: 'flow_hubspot_sync',
    name: 'HubSpot ↔ Snowflake Sync',
    description: 'Hourly two-way CRM sync with conflict resolution.',
    created_ts: isoOffset(60 * 24 * 45),
    workbook_id: 'wb_revops',
    workbook_name: 'RevOps',
  },
  {
    saved_item_id: 'flow_weekly_report',
    name: 'Weekly Exec Report',
    description: 'Aggregates revenue, pipeline, and product KPIs into a Slack digest.',
    created_ts: isoOffset(60 * 24 * 90),
    workbook_id: 'wb_revops',
    workbook_name: 'RevOps',
  },
  {
    saved_item_id: 'flow_support_triage',
    name: 'Support Ticket Triage',
    description: 'Classifies Zendesk tickets and routes critical issues to on-call.',
    created_ts: isoOffset(60 * 24 * 7),
    workbook_id: 'wb_internal_ai',
    workbook_name: 'Internal AI',
  },
  {
    saved_item_id: 'flow_release_notes',
    name: 'AI Release Notes',
    description: 'Summarizes shipped PRs into customer-facing release notes.',
    created_ts: isoOffset(60 * 24 * 5),
    workbook_id: 'wb_internal_ai',
    workbook_name: 'Internal AI',
  },
  {
    saved_item_id: 'flow_warehouse_ingest',
    name: 'Warehouse Ingest',
    description: 'Ingests S3 events into Snowflake with schema enforcement.',
    created_ts: isoOffset(60 * 24 * 30),
    workbook_id: 'wb_data_pipelines',
    workbook_name: 'Data Pipelines',
  },
  {
    saved_item_id: 'flow_data_quality',
    name: 'Data Quality Checks',
    description: 'Nightly anomaly detection across core warehouse tables.',
    created_ts: isoOffset(60 * 24 * 12),
    workbook_id: 'wb_data_pipelines',
    workbook_name: 'Data Pipelines',
  },
];

for (const wb of MOCK_WORKBOOKS) {
  wb.saved_items = MOCK_SAVED_FLOWS.filter((f) => f.workbook_id === wb.workbook_id);
}

const SAMPLE_LOG_LINES = (flowName: string): string[] => [
  `\u001b[34m__system__: __STARTING__:${flowName}\u001b[0m`,
  '[input] Loaded webhook payload (size=412 bytes)',
  '[node:filter] Removed 12 records below ICP threshold',
  '[node:http] GET https://api.clearbit.com/v2/people/email — 200 OK (218ms)',
  '[node:http] GET https://api.apollo.io/v1/people/search — 200 OK (412ms)',
  '[node:llm] gpt-4o-mini → generated 8 personalized intros (3.2s)',
  '[node:crm] HubSpot upsert 8 contacts — 6 created, 2 updated',
  '[node:slack] Notified #growth-ops channel',
];

const FAIL_LOG = (flowName: string): string[] => [
  `\u001b[34m__system__: __STARTING__:${flowName}\u001b[0m`,
  '[input] Loaded webhook payload (size=512 bytes)',
  '[node:http] GET https://api.clearbit.com — 200 OK (180ms)',
  '[node:http] POST https://api.hubspot.com/crm/v3/objects/contacts — 502 Bad Gateway',
  '[node:http] Retrying (1/3) ...',
  '[node:http] POST https://api.hubspot.com/crm/v3/objects/contacts — 502 Bad Gateway',
  '[node:http] Retrying (2/3) ...',
  '\u001b[31m[error] HubSpot CRM unreachable after 3 retries\u001b[0m',
];

function buildRun(
  flow: SavedFlow,
  state: RunState,
  minutesAgo: number,
  durationSec: number,
): FlowRun {
  const createdAt = new Date(Date.now() - minutesAgo * 60_000);
  const finishedAt =
    state === 'RUNNING' || state === 'STARTED' || state === 'QUEUED'
      ? null
      : new Date(createdAt.getTime() + durationSec * 1000);
  const failed = state === 'FAILED';
  return {
    run_id: shortId('run'),
    saved_item_id: flow.saved_item_id,
    state,
    created_ts: createdAt.toISOString(),
    finished_ts: finishedAt ? finishedAt.toISOString() : null,
    duration_ms: finishedAt ? finishedAt.getTime() - createdAt.getTime() : null,
    log: failed ? FAIL_LOG(flow.name) : SAMPLE_LOG_LINES(flow.name),
    outputs:
      state === 'DONE'
        ? {
            summary: `Processed batch for ${flow.name}.`,
            records_processed: 42 + Math.floor(Math.random() * 30),
            success_rate: 0.98,
          }
        : {},
    triggered_by: ['ana@acme.co', 'system', 'cron', 'webhook'][Math.floor(Math.random() * 4)],
    trigger_type: (['manual', 'api', 'schedule', 'webhook'] as const)[Math.floor(Math.random() * 4)],
    inputs: {
      recipient: 'recipient@example.com',
      subject: `${flow.name} run`,
      payload_size: 412,
    },
    error_message: failed ? 'HubSpot CRM unreachable after 3 retries.' : null,
    flow_name: flow.name,
    workbook_id: flow.workbook_id,
    workbook_name: flow.workbook_name,
  };
}

function bootstrapRuns(): FlowRun[] {
  const runs: FlowRun[] = [];
  MOCK_SAVED_FLOWS.forEach((flow, index) => {
    // each flow gets a recent run mix
    const states: RunState[] = [
      'DONE',
      'DONE',
      'RUNNING',
      'FAILED',
      'DONE',
      'TERMINATED',
      'QUEUED',
    ];
    states.forEach((state, runIndex) => {
      const minutesAgo = runIndex * 47 + index * 9 + 3;
      const duration = 20 + Math.floor(Math.random() * 240);
      runs.push(buildRun(flow, state, minutesAgo, duration));
    });
  });
  return runs.sort((a, b) => (a.created_ts < b.created_ts ? 1 : -1));
}

const AUDIT_EVENT_TYPES = [
  'auth.login',
  'auth.logout',
  'auth.failed_login',
  'credential.created',
  'credential.deleted',
  'workflow.created',
  'workflow.updated',
  'workflow.deleted',
  'workflow.executed',
  'workflow.kill',
  'team.member_invited',
  'team.member_removed',
  'role.assigned',
  'organization.settings_updated',
  'file.uploaded',
  'file.deleted',
];

const SAMPLE_USERS = [
  { id: 'usr_ana', email: 'ana@acme.co' },
  { id: 'usr_marco', email: 'marco@acme.co' },
  { id: 'usr_priya', email: 'priya@acme.co' },
  { id: 'usr_lee', email: 'lee@acme.co' },
  { id: 'usr_kai', email: 'kai@acme.co' },
];

const SAMPLE_USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0 Safari/537.36',
  'GumloopNative/1.0 (iPhone; iOS 17.4; iPhone15,3)',
  'GumloopNative/1.0 (Android 14; Pixel 8)',
  'curl/8.4.0',
  'PostmanRuntime/7.36.0',
];

function bootstrapAuditLogs(): AuditLogEntry[] {
  const entries: AuditLogEntry[] = [];
  for (let i = 0; i < 240; i += 1) {
    const user = SAMPLE_USERS[i % SAMPLE_USERS.length];
    const event = AUDIT_EVENT_TYPES[i % AUDIT_EVENT_TYPES.length];
    entries.push({
      event_id: shortId('evt'),
      timestamp: isoOffset(i * 17 + Math.floor(Math.random() * 12)),
      event_type: event,
      user_id: user.id,
      user_email: user.email,
      details: humanizeAuditEvent(event, user.email),
      source_ip: `10.${(i * 7) % 255}.${(i * 13) % 255}.${(i * 19) % 255}`,
      user_agent: SAMPLE_USER_AGENTS[i % SAMPLE_USER_AGENTS.length],
    });
  }
  return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

function humanizeAuditEvent(event: string, email: string): string {
  switch (event) {
    case 'auth.login':
      return `${email} signed in successfully.`;
    case 'auth.logout':
      return `${email} signed out.`;
    case 'auth.failed_login':
      return `Failed sign-in attempt for ${email}.`;
    case 'credential.created':
      return `${email} added a new API credential.`;
    case 'credential.deleted':
      return `${email} removed an API credential.`;
    case 'workflow.created':
      return `${email} created a new workflow.`;
    case 'workflow.updated':
      return `${email} updated a workflow definition.`;
    case 'workflow.deleted':
      return `${email} deleted a workflow.`;
    case 'workflow.executed':
      return `${email} executed a workflow run.`;
    case 'workflow.kill':
      return `${email} terminated a running workflow.`;
    case 'team.member_invited':
      return `${email} invited a new team member.`;
    case 'team.member_removed':
      return `${email} removed a team member.`;
    case 'role.assigned':
      return `${email} assigned a custom role.`;
    case 'organization.settings_updated':
      return `${email} updated organization settings.`;
    case 'file.uploaded':
      return `${email} uploaded a file.`;
    case 'file.deleted':
      return `${email} deleted a file.`;
    default:
      return `${email} performed ${event}.`;
  }
}

/**
 * In-memory mutable store used to power realistic mocks.
 *
 * Exported as a singleton so screens hitting the API observe consistent
 * state across the session (e.g. starting a run and then polling it).
 */
class MockStore {
  savedFlows: SavedFlow[] = MOCK_SAVED_FLOWS;
  workbooks: Workbook[] = MOCK_WORKBOOKS;
  runs: FlowRun[] = bootstrapRuns();
  auditLogs: AuditLogEntry[] = bootstrapAuditLogs();
  lastTickAt: number = Date.now();

  /** Advance live state — flip a few RUNNING runs to DONE/FAILED. */
  tick(): void {
    const now = Date.now();
    if (now - this.lastTickAt < 7_000) return;
    this.lastTickAt = now;

    for (const run of this.runs) {
      if (run.state === 'QUEUED' && Math.random() < 0.4) {
        run.state = 'RUNNING';
      } else if (run.state === 'RUNNING' && Math.random() < 0.35) {
        const finished = NOW();
        run.state = Math.random() < 0.18 ? 'FAILED' : 'DONE';
        run.finished_ts = finished.toISOString();
        run.duration_ms = finished.getTime() - new Date(run.created_ts).getTime();
        if (run.state === 'FAILED') {
          run.log = FAIL_LOG(run.flow_name ?? 'flow');
          run.error_message = 'HubSpot CRM unreachable after 3 retries.';
        } else {
          run.outputs = {
            summary: `Processed batch for ${run.flow_name}.`,
            records_processed: 42 + Math.floor(Math.random() * 30),
            success_rate: 0.98,
          };
        }
      }
    }

    // Occasionally inject a fresh run
    if (Math.random() < 0.4) {
      const flow = this.savedFlows[Math.floor(Math.random() * this.savedFlows.length)];
      this.runs.unshift(buildRun(flow, 'RUNNING', 0, 0));
    }
  }

  startRun(flow: SavedFlow, inputs?: Record<string, unknown>): FlowRun {
    const run = buildRun(flow, 'RUNNING', 0, 0);
    run.inputs = { ...(run.inputs ?? {}), ...(inputs ?? {}) };
    run.trigger_type = 'api';
    this.runs.unshift(run);
    return run;
  }

  killRun(runId: string): FlowRun | undefined {
    const run = this.runs.find((r) => r.run_id === runId);
    if (!run) return undefined;
    run.state = 'TERMINATED';
    run.finished_ts = new Date().toISOString();
    run.duration_ms = new Date(run.finished_ts).getTime() - new Date(run.created_ts).getTime();
    run.error_message = 'Run terminated by user.';
    run.log = [...run.log, '\u001b[33m[system] Run terminated by user.\u001b[0m'];
    return run;
  }
}

export const mockStore = new MockStore();

export function buildInputSchema(savedItemId: string): InputSchemaResponse {
  const flow = MOCK_SAVED_FLOWS.find((f) => f.saved_item_id === savedItemId);
  const flowName = flow?.name ?? 'Workflow';
  return {
    saved_item_id: savedItemId,
    fields: [
      { name: 'recipient', type: 'string', required: true, description: `Where ${flowName} should send results.` },
      { name: 'subject', type: 'string', required: false, default: `${flowName} run` },
      { name: 'dry_run', type: 'boolean', required: false, default: false, description: 'Run without side effects.' },
      { name: 'metadata', type: 'json', required: false, description: 'Arbitrary metadata to attach to outputs.' },
    ],
  };
}
