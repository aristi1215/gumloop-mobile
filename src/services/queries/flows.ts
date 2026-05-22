import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { gumloopAdapter } from '@/services/api';
import type {
  AuditLogQuery,
  AuditLogResponse,
  FlowRun,
  InputSchemaResponse,
  KillRunResponse,
  ListSavedFlowsResponse,
  RunHistoryMap,
  SavedFlow,
  StartFlowRunRequest,
  StartFlowRunResponse,
} from '@/types/gumloop';
import { queryKeys } from './keys';

export function useSavedFlows(
  options?: Omit<UseQueryOptions<ListSavedFlowsResponse, Error, SavedFlow[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: queryKeys.savedFlows,
    queryFn: () => gumloopAdapter.listSavedFlows(),
    select: (data) => data.saved_items,
    staleTime: 30_000,
    ...options,
  });
}

export function useRecentRuns(options?: { pollIntervalMs?: number }) {
  return useQuery({
    queryKey: queryKeys.recentRuns,
    queryFn: () => gumloopAdapter.listRecentRuns(),
    staleTime: 5_000,
    refetchInterval: options?.pollIntervalMs ?? 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useRun(runId: string | undefined, options?: { pollIntervalMs?: number }) {
  return useQuery({
    queryKey: queryKeys.run(runId ?? ''),
    queryFn: () => gumloopAdapter.getRun(runId as string),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const data = query.state.data as FlowRun | undefined;
      if (!options?.pollIntervalMs) return false;
      // Stop polling once the run reaches a terminal state.
      if (data && ['DONE', 'FAILED', 'TERMINATED'].includes(data.state)) return false;
      return options.pollIntervalMs;
    },
  });
}

export function useRunHistory(savedItemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.runHistory(savedItemId ?? ''),
    queryFn: () => gumloopAdapter.getRunHistory({ saved_item_id: savedItemId as string }),
    enabled: Boolean(savedItemId),
    select: (data: RunHistoryMap) => (savedItemId ? (data[savedItemId] ?? []) : []),
  });
}

export function useInputSchema(savedItemId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inputSchema(savedItemId ?? ''),
    queryFn: () => gumloopAdapter.getInputSchema(savedItemId as string),
    enabled: Boolean(savedItemId),
    select: (data: InputSchemaResponse) => data.fields,
  });
}

export function useStartRun() {
  const queryClient = useQueryClient();
  return useMutation<StartFlowRunResponse, Error, StartFlowRunRequest>({
    mutationFn: (request) => gumloopAdapter.startRun(request),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recentRuns });
      void queryClient.invalidateQueries({ queryKey: queryKeys.runHistory(data.saved_item_id) });
    },
  });
}

export function useKillRun() {
  const queryClient = useQueryClient();
  return useMutation<KillRunResponse, Error, string>({
    mutationFn: (runId) => gumloopAdapter.killRun(runId),
    onSuccess: (_data, runId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.run(runId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recentRuns });
    },
  });
}

export function useAuditLogs(query: AuditLogQuery) {
  return useInfiniteQuery<AuditLogResponse, Error>({
    queryKey: queryKeys.auditLogs(query as unknown as Record<string, unknown>),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      gumloopAdapter.getAuditLogs({ ...query, page: pageParam as number }),
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
  });
}
