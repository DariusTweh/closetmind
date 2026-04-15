import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../../lib/theme';
import { editorialPalette } from '../../lib/editorialTheme';

type Props = {
  reasons: string[];
};

export default function VerdictReasonList({ reasons }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Why This Verdict</Text>
      <View style={styles.list}>
        {reasons.map((reason, index) => (
          <View key={`${reason}-${index}`} style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.reason}>{reason}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md + 2,
    gap: 10,
  },
  title: {
    color: editorialPalette.onSurface,
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: editorialPalette.primaryDim,
    marginTop: 9,
  },
  reason: {
    flex: 1,
    color: editorialPalette.onSurfaceVariant,
    fontSize: 14.5,
    lineHeight: 21,
  },
});
