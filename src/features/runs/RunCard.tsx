import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, StatusBadge, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { FlowRun } from '@/types/gumloop';
import { formatDuration, formatRelativeTime } from '@/utils/format';

interface RunCardProps {
  run: FlowRun;
  onPress?: () => void;
}

export function RunCard({ run, onPress }: RunCardProps) {
  const { theme } = useTheme();
  const isAlert = run.state === 'FAILED' || run.state === 'TERMINATED';

  return (
    <Pressable onPress={onPress}>
      <Card
        style={{
          gap: Spacing[3],
          borderColor: isAlert ? `${theme.text}10` : theme.border,
          borderLeftWidth: isAlert ? 3 : 1,
          borderLeftColor:
            run.state === 'FAILED'
              ? '#EF4444'
              : run.state === 'TERMINATED'
                ? '#F59E0B'
                : theme.border,
        }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: Spacing[3],
          }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h2" numberOfLines={1}>
              {run.flow_name ?? 'Untitled flow'}
            </Text>
            {run.workbook_name ? (
              <Text variant="caption" tone="subtle" numberOfLines={1}>
                {run.workbook_name}
              </Text>
            ) : null}
          </View>
          <StatusBadge state={run.state} />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: Spacing[4],
            flexWrap: 'wrap',
          }}>
          <Metric icon="time-outline" label="Started" value={formatRelativeTime(run.created_ts)} />
          <Metric
            icon="hourglass-outline"
            label="Duration"
            value={
              run.duration_ms
                ? formatDuration(run.duration_ms)
                : run.state === 'RUNNING'
                  ? 'in flight'
                  : '—'
            }
          />
          {run.trigger_type ? (
            <Metric icon="flash-outline" label="Trigger" value={run.trigger_type} />
          ) : null}
        </View>

        {run.error_message ? (
          <View
            style={{
              backgroundColor: `${theme.primary}08`,
              borderRadius: 8,
              padding: Spacing[3],
              flexDirection: 'row',
              gap: Spacing[2],
              alignItems: 'flex-start',
              borderWidth: 1,
              borderColor: '#FECACA40',
            }}>
            <Ionicons name="alert-circle-outline" color="#EF4444" size={16} />
            <Text variant="caption" tone="danger" style={{ flex: 1 }} numberOfLines={2}>
              {run.error_message}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={14} color={theme.textSubtle} />
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text variant="caption" style={{ color: theme.text }}>
        {value}
      </Text>
    </View>
  );
}
