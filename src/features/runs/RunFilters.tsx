import { ScrollView, View } from 'react-native';

import { Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { RunState } from '@/types/gumloop';

interface RunFiltersProps {
  state: RunState | 'ALL';
  onChangeState: (next: RunState | 'ALL') => void;
  workbook: string | 'ALL';
  workbooks: { id: string; name: string }[];
  onChangeWorkbook: (next: string | 'ALL') => void;
}

const STATE_OPTIONS: (RunState | 'ALL')[] = [
  'ALL',
  'FAILED',
  'TERMINATED',
  'RUNNING',
  'QUEUED',
  'DONE',
];

const STATE_LABELS: Record<RunState | 'ALL', string> = {
  ALL: 'All',
  FAILED: 'Failed',
  TERMINATED: 'Terminated',
  RUNNING: 'Running',
  QUEUED: 'Queued',
  DONE: 'Completed',
  STARTED: 'Started',
};

export function RunFilters({
  state,
  onChangeState,
  workbook,
  workbooks,
  onChangeWorkbook,
}: RunFiltersProps) {
  return (
    <View style={{ gap: Spacing[2] }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing[4], gap: 8 }}>
        {STATE_OPTIONS.map((opt) => (
          <Chip
            key={opt}
            label={STATE_LABELS[opt]}
            selected={state === opt}
            onPress={() => onChangeState(opt)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing[4], gap: 8 }}>
        <Chip
          label="All workspaces"
          selected={workbook === 'ALL'}
          onPress={() => onChangeWorkbook('ALL')}
        />
        {workbooks.map((wb) => (
          <Chip
            key={wb.id}
            label={wb.name}
            selected={workbook === wb.id}
            onPress={() => onChangeWorkbook(wb.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
