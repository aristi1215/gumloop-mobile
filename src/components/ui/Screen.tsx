import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/ThemeProvider';

interface ScreenProps extends PropsWithChildren {
  edges?: Edge[];
  style?: ViewStyle;
  scroll?: boolean;
}

export function Screen({ children, edges = ['top'], style }: ScreenProps) {
  const { theme, mode } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView edges={edges} style={[{ flex: 1 }, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}
