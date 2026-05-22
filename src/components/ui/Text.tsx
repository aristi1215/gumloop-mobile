import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type TextVariant = keyof typeof Typography;
export type TextTone = 'primary' | 'muted' | 'subtle' | 'inverse' | 'brand' | 'danger' | 'success';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

export function Text({
  variant = 'body',
  tone = 'primary',
  weight,
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const { theme } = useTheme();
  const toneColor: string =
    tone === 'primary'
      ? theme.text
      : tone === 'muted'
        ? theme.textMuted
        : tone === 'subtle'
          ? theme.textSubtle
          : tone === 'inverse'
            ? theme.textInverse
            : tone === 'brand'
              ? theme.primary
              : tone === 'danger'
                ? '#EF4444'
                : tone === 'success'
                  ? '#10B981'
                  : theme.text;

  return (
    <RNText
      {...rest}
      style={[
        Typography[variant],
        { color: toneColor },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}>
      {children}
    </RNText>
  );
}
