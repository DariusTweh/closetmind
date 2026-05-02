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
      <Text style={styles.eyebrow}>Why This Verdict</Text>
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
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
    marginBottom: spacing.lg,
    gap: 12,
  },
  eyebrow: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  list: {
    gap: 12,
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
    marginTop: 8,
  },
  reason: {
    flex: 1,
    color: editorialPalette.onSurface,
    fontSize: 14,
    lineHeight: 21,
  },
});
