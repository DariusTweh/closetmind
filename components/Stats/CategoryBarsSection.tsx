import React from 'react';
import { View } from 'react-native';
import BreakdownRow from './BreakdownRow';

export default function CategoryBarsSection({
  items,
  total,
}: {
  items: Array<{ key: string; label: string; count: number }>;
  total: number;
}) {
  return (
    <View>
      {items.map((item) => (
        <BreakdownRow
          key={item.key}
          label={item.label}
          count={item.count}
          ratio={total ? item.count / total : 0}
        />
      ))}
    </View>
  );
}
