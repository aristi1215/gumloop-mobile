import { View } from 'react-native';

import { Palette, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { RunState } from '@/types/gumloop';
import { RunStateLabel } from '@/types/gumloop';
import { Text } from './Text';

const STATE_TO_COLOR: Record<RunState, { fg: string; bg: string; border: string; dot: string }> = {
  RUNNING: {
    fg: Palette.status.running.fg,
    bg: Palette.status.running.bg,
    border: Palette.status.running.border,
    dot: Palette.status.running.fg,
  },
  STARTED: {
    fg: Palette.status.running.fg,
    bg: Palette.status.running.bg,
    border: Palette.status.running.border,
    dot: Palette.status.running.fg,
  },
  DONE: {
    fg: Palette.status.completed.fg,
    bg: Palette.status.completed.bg,
    border: Palette.status.completed.border,
    dot: Palette.status.completed.fg,
  },
  FAILED: {
    fg: Palette.status.failed.fg,
    bg: Palette.status.failed.bg,
    border: Palette.status.failed.border,
    dot: Palette.status.failed.fg,
  },
  TERMINATED: {
    fg: Palette.status.terminated.fg,
    bg: Palette.status.terminated.bg,
    border: Palette.status.terminated.border,
    dot: Palette.status.terminated.fg,
  },
  QUEUED: {
    fg: Palette.status.queued.fg,
    bg: Palette.status.queued.bg,
    border: Palette.status.queued.border,
    dot: Palette.status.queued.fg,
  },
};

export interface StatusBadgeProps {
  state: RunState;
  size?: 'sm' | 'md';
}

export function StatusBadge({ state, size = 'md' }: StatusBadgeProps) {
  const { mode } = useTheme();
  const colors = STATE_TO_COLOR[state];
  const isPulsing = state === 'RUNNING' || state === 'STARTED' || state === 'QUEUED';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: size === 'sm' ? Spacing[2] : Spacing[3],
        paddingVertical: size === 'sm' ? 2 : Spacing[1],
        borderRadius: Radius.full,
        backgroundColor: mode === 'dark' ? `${colors.fg}22` : colors.bg,
        borderWidth: 1,
        borderColor: mode === 'dark' ? `${colors.fg}44` : colors.border,
        alignSelf: 'flex-start',
      }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: Radius.full,
          backgroundColor: colors.dot,
          opacity: isPulsing ? 0.95 : 1,
        }}
      />
      <Text variant="micro" style={{ color: colors.fg, textTransform: 'uppercase' }}>
        {RunStateLabel[state]}
      </Text>
    </View>
  );
}
