import { Pressable, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
}

export function Chip({ label, selected, onPress, icon }: ChipProps) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: Spacing[3],
          paddingVertical: Spacing[2],
          borderRadius: Radius.full,
          backgroundColor: selected ? theme.primarySubtle : theme.surfaceMuted,
          borderWidth: 1,
          borderColor: selected ? theme.primary : 'transparent',
        }}>
        {icon}
        <Text variant="caption" style={{ color: selected ? theme.primary : theme.text }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
