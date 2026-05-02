import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../lib/theme';

export default function ColorChipsSection({
  items,
}: {
  items: Array<{ key: string; label: string; count: number }>;
}) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <View key={item.key} style={styles.chip}>
          <Text style={styles.chipText}>{item.label}</Text>
          <Text style={styles.chipCount}>× {item.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: 38,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  chipCount: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
