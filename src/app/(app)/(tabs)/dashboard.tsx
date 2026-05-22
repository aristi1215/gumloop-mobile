import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EmptyState, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { RunCard } from '@/features/runs/RunCard';
import { RunCardSkeleton } from '@/features/runs/RunCardSkeleton';
import { RunFilters } from '@/features/runs/RunFilters';
import { sortRunsByPriority } from '@/features/runs/sortRuns';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useNotificationPreferences } from '@/hooks/useNotifications';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useRecentRuns, useSavedFlows } from '@/services/queries/flows';
import { gumloopAdapter } from '@/services/api';
import type { RunState } from '@/types/gumloop';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();

  const [stateFilter, setStateFilter] = useState<RunState | 'ALL'>('ALL');
  const [workbookFilter, setWorkbookFilter] = useState<string | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [pageLimit, setPageLimit] = useState(20);

  const debouncedSearch = useDebouncedValue(search, 200);

  const recentRuns = useRecentRuns({ pollIntervalMs: preferences.pollingIntervalMs });
  const savedFlows = useSavedFlows();

  const workbooks = useMemo(() => {
    const map = new Map<string, string>();
    (savedFlows.data ?? []).forEach((flow) => {
      if (flow.workbook_id && flow.workbook_name) map.set(flow.workbook_id, flow.workbook_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [savedFlows.data]);

  const runs = useMemo(() => {
    const all = recentRuns.data ?? [];
    const filtered = all.filter((run) => {
      if (stateFilter !== 'ALL' && run.state !== stateFilter) return false;
      if (workbookFilter !== 'ALL' && run.workbook_id !== workbookFilter) return false;
      if (debouncedSearch) {
        const needle = debouncedSearch.toLowerCase();
        const haystack = `${run.flow_name ?? ''} ${run.run_id} ${run.workbook_name ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
    return sortRunsByPriority(filtered);
  }, [recentRuns.data, stateFilter, workbookFilter, debouncedSearch]);

  const visibleRuns = runs.slice(0, pageLimit);

  const failingCount = (recentRuns.data ?? []).filter(
    (r) => r.state === 'FAILED' || r.state === 'TERMINATED',
  ).length;

  return (
    <Screen>
      <FlatList
        data={visibleRuns}
        keyExtractor={(item) => item.run_id}
        ListHeaderComponent={
          <View style={{ gap: Spacing[3], paddingBottom: Spacing[3] }}>
            <ScreenHeader
              title={`Welcome, ${greetName(user)}`}
              subtitle={`${recentRuns.data?.length ?? 0} recent runs · ${gumloopAdapter.mode === 'mock' ? 'mock data' : 'live data'}`}
              trailing={
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: theme.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="person-outline" size={18} color={theme.text} />
                </View>
              }
            />
            <View style={{ paddingHorizontal: Spacing[4] }}>
              <Input
                placeholder="Search runs, flows, workspaces"
                value={search}
                onChangeText={setSearch}
                leftIcon="search-outline"
              />
            </View>
            <RunFilters
              state={stateFilter}
              onChangeState={setStateFilter}
              workbook={workbookFilter}
              workbooks={workbooks}
              onChangeWorkbook={setWorkbookFilter}
            />
            {failingCount > 0 ? (
              <View
                style={{
                  marginHorizontal: Spacing[4],
                  padding: Spacing[3],
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing[2],
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FECACA',
                }}>
                <Ionicons name="alert-circle" color="#EF4444" size={18} />
                <Text variant="caption" style={{ color: '#991B1B', flex: 1 }}>
                  {failingCount} run{failingCount === 1 ? '' : 's'} need attention.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing[3] }} />}
        contentContainerStyle={{
          paddingHorizontal: Spacing[4],
          paddingBottom: Spacing[8],
        }}
        renderItem={({ item }) => (
          <RunCard run={item} onPress={() => router.push(`/(app)/flow/${item.saved_item_id}?runId=${item.run_id}`)} />
        )}
        refreshControl={
          <RefreshControl
            tintColor={theme.primary}
            refreshing={recentRuns.isRefetching}
            onRefresh={() => {
              void recentRuns.refetch();
              void savedFlows.refetch();
            }}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (visibleRuns.length < runs.length) setPageLimit((p) => p + 20);
        }}
        ListEmptyComponent={
          recentRuns.isLoading ? (
            <View style={{ gap: Spacing[3] }}>
              {[1, 2, 3, 4].map((i) => (
                <RunCardSkeleton key={i} />
              ))}
            </View>
          ) : recentRuns.isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load runs"
              description={(recentRuns.error as Error)?.message ?? 'Try pulling to refresh.'}
            />
          ) : (
            <EmptyState
              icon="checkmark-done-outline"
              title="No runs to show"
              description={
                debouncedSearch || stateFilter !== 'ALL' || workbookFilter !== 'ALL'
                  ? 'Try clearing your filters.'
                  : 'When your team triggers a flow, it will appear here.'
              }
            />
          )
        }
      />
    </Screen>
  );
}

function greetName(user: unknown): string {
   
  const u = user as { user_metadata?: { display_name?: string }; email?: string } | null;
  if (!u) return 'Operator';
  if (u.user_metadata?.display_name) return u.user_metadata.display_name;
  if (u.email) return u.email.split('@')[0];
  return 'Operator';
}
