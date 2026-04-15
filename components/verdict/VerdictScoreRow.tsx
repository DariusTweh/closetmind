import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VerdictScores } from '../../lib/itemVerdict';
import { spacing } from '../../lib/theme';
import { editorialPalette, editorialShadow } from '../../lib/editorialTheme';

type Props = {
  scores: VerdictScores;
};

const SCORE_LABELS: Array<keyof VerdictScores> = ['style_match', 'closet_fit', 'versatility'];

function formatLabel(label: keyof VerdictScores) {
  return label.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export default function VerdictScoreRow({ scores }: Props) {
  return (
    <View style={styles.row}>
      {SCORE_LABELS.map((key) => (
        <View key={key} style={styles.card}>
          <Text style={styles.value}>{scores[key]}</Text>
          <Text style={styles.label}>{formatLabel(key)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md + 2,
  },
  card: {
    flex: 1,
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
    ...editorialShadow,
  },
  value: {
    color: editorialPalette.onSurface,
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    textAlign: 'center',
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
});
