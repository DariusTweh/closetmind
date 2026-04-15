// components/StatsRow.tsx
import React from 'react';
import { spacing, colors, radii, typography } from '../../lib/theme';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const STAT_ITEMS = [
  { key: 'closet', label: 'Closet' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'listed', label: 'Listed' },
];

export default function StatsRow({ stats = {}, onPressStat }) {
  return (
    <View style={styles.row}>
      {STAT_ITEMS.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={styles.statBox}
          onPress={() => onPressStat?.(key)}
        >
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{stats[key] || 0}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.sm + 2,
    alignItems: 'center',
  },
  label: {
    fontSize: typography.label.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.header.fontSize - 6,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
