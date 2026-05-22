import { ActivityIndicator, Pressable, View, type PressableProps, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const colors = (() => {
    switch (variant) {
      case 'primary':
        return { bg: theme.primary, fg: theme.textInverse, border: theme.primary };
      case 'secondary':
        return { bg: theme.surfaceMuted, fg: theme.text, border: theme.border };
      case 'ghost':
        return { bg: 'transparent', fg: theme.text, border: 'transparent' };
      case 'danger':
        return { bg: '#EF4444', fg: '#FFFFFF', border: '#EF4444' };
    }
  })();

  const sizing =
    size === 'sm'
      ? { paddingV: Spacing[2], paddingH: Spacing[3] }
      : size === 'lg'
        ? { paddingV: Spacing[4], paddingH: Spacing[5] }
        : { paddingV: Spacing[3], paddingH: Spacing[4] };

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: sizing.paddingV,
          paddingHorizontal: sizing.paddingH,
          borderRadius: Radius.md,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.fg} size="small" />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text
            variant={size === 'sm' ? 'caption' : 'bodyStrong'}
            style={{ color: colors.fg }}>
            {label}
          </Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
