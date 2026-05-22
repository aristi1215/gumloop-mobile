export const queryKeys = {
  savedFlows: ['saved-flows'] as const,
  workbooks: ['workbooks'] as const,
  recentRuns: ['runs', 'recent'] as const,
  run: (runId: string) => ['runs', runId] as const,
  runHistory: (savedItemId: string) => ['runs', 'history', savedItemId] as const,
  inputSchema: (savedItemId: string) => ['input-schema', savedItemId] as const,
  auditLogs: (params: Record<string, unknown>) => ['audit-logs', params] as const,
};
