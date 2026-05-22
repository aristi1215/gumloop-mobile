import { useEffect, useState } from 'react';
import { Animated, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: keyof typeof Radius;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = 'sm', style }: SkeletonProps) {
  const { theme } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: Radius[radius],
          backgroundColor: theme.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}
