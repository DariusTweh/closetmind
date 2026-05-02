import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../lib/theme';

export default function BreakdownRow({
  label,
  count,
  ratio,
}: {
  label: string;
  count: number;
  ratio: number;
}) {
  const widthPercent = count > 0 ? Math.max(8, Math.min(100, Math.round(ratio * 100))) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{count}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${widthPercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
  },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  count: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
});
