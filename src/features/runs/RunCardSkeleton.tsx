import { View } from 'react-native';

import { Card, Skeleton } from '@/components/ui';
import { Spacing } from '@/constants/theme';

export function RunCardSkeleton() {
  return (
    <Card style={{ gap: Spacing[3] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={180} height={18} />
        <Skeleton width={70} height={20} radius="full" />
      </View>
      <Skeleton width={120} height={12} />
      <View style={{ flexDirection: 'row', gap: Spacing[4] }}>
        <Skeleton width={70} height={12} />
        <Skeleton width={80} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </Card>
  );
}
