import type { PropsWithChildren } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

interface CardProps extends ViewProps {
  padding?: keyof typeof Spacing;
  radius?: keyof typeof Radius;
  variant?: 'default' | 'subtle' | 'outlined';
}

export function Card({
  padding = '4',
  radius = 'lg',
  variant = 'default',
  style,
  children,
  ...rest
}: PropsWithChildren<CardProps>) {
  const { theme } = useTheme();

  const base: ViewStyle = {
    backgroundColor:
      variant === 'subtle' ? theme.surfaceSubtle : variant === 'outlined' ? 'transparent' : theme.surface,
    borderRadius: Radius[radius],
    padding: Spacing[padding],
    borderWidth: variant === 'outlined' ? 1 : variant === 'default' ? 1 : 0,
    borderColor: theme.border,
  };

  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}
