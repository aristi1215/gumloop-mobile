import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  rightSlot?: React.ReactNode;
}

export function Input({
  label,
  helperText,
  errorText,
  leftIcon,
  rightSlot,
  style,
  ...rest
}: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: Spacing[1] }}>
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing[2],
          borderWidth: 1,
          borderColor: errorText ? '#EF4444' : focused ? theme.primary : theme.border,
          backgroundColor: 'transparent',
          borderRadius: Radius.md,
          paddingHorizontal: Spacing[3],
          minHeight: 36,
        }}>
        {leftIcon ? <Ionicons name={leftIcon} size={16} color={theme.textMuted} /> : null}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={theme.textSubtle}
          style={[
            { flex: 1, color: theme.text, fontSize: Typography.body.fontSize, paddingVertical: 4 },
            style,
          ]}
        />
        {rightSlot}
      </View>
      {errorText ? (
        <Text variant="caption" tone="danger">
          {errorText}
        </Text>
      ) : helperText ? (
        <Text variant="caption" tone="muted">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
