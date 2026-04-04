// components/StatsRow.tsx
import React from 'react';
import { spacing, colors, radii, typography } from '../../lib/theme';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function StatsRow({ stats = {}, onPressStat }) {
  return (
    <View style={styles.row}>
      {['Closet', 'Favorites'].map((label) => (
        <TouchableOpacity
          key={label}
          style={styles.statBox}
          onPress={() => onPressStat?.(label.toLowerCase())}
        >
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{stats[label.toLowerCase()] || 0}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  statBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.md - 4,
    paddingHorizontal: spacing.sm + 2,
    alignItems: 'center',
    width: '45%',
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
