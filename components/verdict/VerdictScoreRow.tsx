import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VerdictSignals } from '../../lib/itemVerdict';
import { spacing } from '../../lib/theme';
import { editorialPalette } from '../../lib/editorialTheme';

type Props = {
  signals?: VerdictSignals | null;
};

const DISPLAY_ORDER: Array<keyof VerdictSignals> = ['style_fit', 'closet_proof', 'gap_value', 'versatility'];

function progressWidth(score: number): `${number}%` {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  return `${clamped}%` as `${number}%`;
}

export default function VerdictScoreRow({ signals }: Props) {
  if (!signals) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Signal Read</Text>
      <View style={styles.stack}>
        {DISPLAY_ORDER.map((key) => {
          const signal = signals[key];
          if (!signal) return null;

          return (
            <View key={key} style={styles.row}>
              <View style={styles.topRow}>
                <Text style={styles.label}>{signal.label}</Text>
                <Text style={styles.value}>{signal.score}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: progressWidth(signal.score) }]} />
              </View>
              <Text style={styles.summary}>{signal.summary}</Text>
            </View>
          );
        })}
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
    gap: 12,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  stack: {
    gap: 16,
  },
  row: {
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    flex: 1,
    color: editorialPalette.onSurface,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  value: {
    color: editorialPalette.onSurface,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: editorialPalette.surfaceContainer,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: editorialPalette.primary,
  },
  summary: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 13.5,
    lineHeight: 19,
  },
});
