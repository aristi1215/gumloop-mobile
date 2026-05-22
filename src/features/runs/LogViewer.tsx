import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Card, Input, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const ANSI_REGEX = /\u001b\[[0-9;]*m/g;

interface LogViewerProps {
  log: string[];
}

export function LogViewer({ log }: LogViewerProps) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 200);

  const filtered = useMemo(() => {
    const cleaned = log.map((line) => line.replace(ANSI_REGEX, ''));
    if (!debouncedSearch) return cleaned;
    const needle = debouncedSearch.toLowerCase();
    return cleaned.filter((line) => line.toLowerCase().includes(needle));
  }, [log, debouncedSearch]);

  return (
    <Card variant="subtle" style={{ gap: Spacing[3] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Pressable
          onPress={() => setCollapsed((c) => !c)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
          <Ionicons
            name={collapsed ? 'chevron-forward' : 'chevron-down'}
            size={16}
            color={theme.text}
          />
          <Text variant="h2">Execution log</Text>
          <Text variant="caption" tone="subtle">
            ({log.length} lines)
          </Text>
        </Pressable>
      </View>
      {!collapsed ? (
        <>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Filter log lines"
            leftIcon="search-outline"
          />
          <ScrollView
            style={{
              maxHeight: 320,
              borderRadius: 8,
              padding: Spacing[3],
              backgroundColor: theme.mode === 'dark' ? '#000000' : '#0E141F',
            }}>
            {filtered.length === 0 ? (
              <Text variant="mono" style={{ color: theme.textSubtle }}>
                No matching log lines.
              </Text>
            ) : (
              filtered.map((line, idx) => (
                <Text
                  key={`${idx}-${line.slice(0, 20)}`}
                  variant="mono"
                  style={{
                    color: line.toLowerCase().includes('error')
                      ? '#F87171'
                      : line.toLowerCase().includes('retry')
                        ? '#FBBF24'
                        : '#E5E7EB',
                    fontFamily: 'SFMono-Regular',
                    marginBottom: 2,
                  }}>
                  {line}
                </Text>
              ))
            )}
          </ScrollView>
        </>
      ) : null}
    </Card>
  );
}
