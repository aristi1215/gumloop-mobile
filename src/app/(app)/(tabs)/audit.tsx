import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, Chip, EmptyState, Input, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuditLogs } from '@/services/queries/flows';
import type { AuditLogEntry } from '@/types/gumloop';
import { formatDateTime, formatRelativeTime, truncate } from '@/utils/format';

const RANGES: { key: 'day' | 'week' | 'month' | 'quarter'; label: string; days: number }[] = [
  { key: 'day', label: 'Last 24h', days: 1 },
  { key: 'week', label: 'Last 7d', days: 7 },
  { key: 'month', label: 'Last 30d', days: 30 },
  { key: 'quarter', label: 'Last 90d', days: 90 },
];

const EVENT_FILTERS = [
  { key: 'all', label: 'All events', value: undefined },
  { key: 'auth', label: 'Auth', value: 'auth.login' },
  { key: 'workflow', label: 'Workflow', value: 'workflow.executed' },
  { key: 'team', label: 'Team', value: 'team.member_invited' },
];

export default function AuditScreen() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]['key']>('week');
  const [eventFilterKey, setEventFilterKey] = useState<string>('all');

  const debouncedSearch = useDebouncedValue(search, 250);

  const { start_time, end_time } = useMemo(() => {
    const range = RANGES.find((r) => r.key === rangeKey)!;
    const end = new Date();
    const start = new Date(end.getTime() - range.days * 24 * 60 * 60_000);
    return { start_time: start.toISOString(), end_time: end.toISOString() };
  }, [rangeKey]);

  const eventType = EVENT_FILTERS.find((e) => e.key === eventFilterKey)?.value;

  const auditQuery = useAuditLogs({
    start_time,
    end_time,
    page_size: 25,
    search: debouncedSearch || undefined,
    event_type: eventType,
  });

  const logs = useMemo(
    () => auditQuery.data?.pages.flatMap((p) => p.audit_logs) ?? [],
    [auditQuery.data],
  );

  const totalCount = auditQuery.data?.pages[0]?.total_count ?? 0;

  return (
    <Screen>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.event_id}
        ListHeaderComponent={
          <View style={{ gap: Spacing[3], paddingBottom: Spacing[3] }}>
            <ScreenHeader
              title="Audit log"
              subtitle={`${totalCount} events in selected range`}
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
                  <Ionicons name="shield-checkmark-outline" color={theme.text} size={18} />
                </View>
              }
            />
            <View style={{ paddingHorizontal: Spacing[4] }}>
              <Input
                placeholder="Search events, IPs, users"
                value={search}
                onChangeText={setSearch}
                leftIcon="search-outline"
              />
            </View>
            <FilterRow
              chips={RANGES.map((r) => ({ key: r.key, label: r.label }))}
              selected={rangeKey}
              onSelect={(key) => setRangeKey(key as typeof rangeKey)}
            />
            <FilterRow
              chips={EVENT_FILTERS.map((e) => ({ key: e.key, label: e.label }))}
              selected={eventFilterKey}
              onSelect={setEventFilterKey}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
        contentContainerStyle={{ paddingHorizontal: Spacing[4], paddingBottom: Spacing[8] }}
        renderItem={({ item }) => <AuditRow entry={item} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (auditQuery.hasNextPage && !auditQuery.isFetchingNextPage) {
            void auditQuery.fetchNextPage();
          }
        }}
        ListFooterComponent={
          auditQuery.isFetchingNextPage ? (
            <View style={{ paddingVertical: Spacing[4] }}>
              <Skeleton height={56} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          auditQuery.isLoading ? (
            <View style={{ gap: Spacing[2] }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={72} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="document-text-outline"
              title="No audit events"
              description="Try a wider date range or clear filters."
            />
          )
        }
      />
    </Screen>
  );
}

function FilterRow({
  chips,
  selected,
  onSelect,
}: {
  chips: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: Spacing[2],
        paddingHorizontal: Spacing[4],
        flexWrap: 'wrap',
      }}>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          selected={selected === chip.key}
          onPress={() => onSelect(chip.key)}
        />
      ))}
    </View>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const isFailure = entry.event_type.includes('failed') || entry.event_type.includes('deleted');

  return (
    <Card style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {entry.event_type}
        </Text>
        <Text variant="micro" tone="subtle">
          {formatRelativeTime(entry.timestamp)}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {entry.details}
      </Text>
      <View style={{ flexDirection: 'row', gap: Spacing[3], flexWrap: 'wrap', marginTop: 4 }}>
        <Meta icon="person-outline" value={entry.user_email ?? entry.user_id} />
        <Meta icon="location-outline" value={entry.source_ip} />
        <Meta icon="time-outline" value={formatDateTime(entry.timestamp)} />
        <Meta icon="phone-portrait-outline" value={truncate(entry.user_agent, 40)} />
      </View>
      {isFailure ? (
        <View
          style={{
            marginTop: Spacing[2],
            paddingHorizontal: Spacing[2],
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: '#FEF2F2',
            alignSelf: 'flex-start',
          }}>
          <Text variant="micro" style={{ color: '#991B1B' }}>
            Security relevant
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function Meta({
  icon,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={12} color={theme.textSubtle} />
      <Text variant="micro" tone="muted">
        {value}
      </Text>
    </View>
  );
}
