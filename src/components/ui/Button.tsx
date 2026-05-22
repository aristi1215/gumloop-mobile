import { ActivityIndicator, Pressable, View, type PressableProps, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'muted' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

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
      case 'tertiary':
      case 'muted':
        return { bg: theme.mode === 'dark' ? 'rgba(39,39,42,0.5)' : '#F4F4F5', fg: theme.textMuted, border: 'transparent' };
      case 'outline':
        return { bg: 'transparent', fg: theme.text, border: theme.border };
      case 'ghost':
        return { bg: 'transparent', fg: theme.text, border: 'transparent' };
      case 'danger':
        return { bg: '#EF4444', fg: '#FFFFFF', border: '#EF4444' };
    }
  })();

  const sizing =
    size === 'xs'
      ? { height: 28, paddingH: 10, radius: Radius.md }
      : size === 'sm'
        ? { height: 32, paddingH: 12, radius: Radius.md }
        : size === 'lg'
          ? { height: 40, paddingH: 24, radius: Radius.md }
          : size === 'xl'
            ? { height: 48, paddingH: 32, radius: Radius.lg }
            : { height: 36, paddingH: 16, radius: Radius.md };

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
          paddingHorizontal: sizing.paddingH,
          minHeight: sizing.height,
          borderRadius: sizing.radius,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: pressed ? [{ scale: 0.98 }] : undefined,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          shadowColor: variant === 'primary' ? theme.primary : 'transparent',
          shadowOpacity: variant === 'primary' && theme.mode === 'dark' ? 0.3 : 0,
          shadowRadius: 20,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.fg} size="small" />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text
            variant={size === 'xs' || size === 'sm' ? 'caption' : 'bodyStrong'}
            style={{ color: colors.fg }}>
            {label}
          </Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
