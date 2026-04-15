import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GapInsight } from '../../lib/itemVerdict';
import { spacing } from '../../lib/theme';
import { editorialPalette, editorialShadow } from '../../lib/editorialTheme';

type Props = {
  insight: GapInsight;
};

const INSIGHT_COPY = {
  gap_fill: {
    title: 'Gap Fill',
    backgroundColor: editorialPalette.verdictStrong,
    accent: editorialPalette.onSurface,
  },
  duplicate_risk: {
    title: 'Duplicate Risk',
    backgroundColor: editorialPalette.verdictSkip,
    accent: editorialPalette.error,
  },
  neutral: {
    title: 'Wardrobe Read',
    backgroundColor: editorialPalette.surfaceContainer,
    accent: editorialPalette.onSurfaceVariant,
  },
} as const;

export default function VerdictInsightCard({ insight }: Props) {
  const palette = INSIGHT_COPY[insight.type] || INSIGHT_COPY.neutral;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.backgroundColor,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: palette.accent }]}>{palette.title}</Text>
      <Text style={styles.message}>{insight.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: spacing.md + 2,
    marginBottom: spacing.md + 2,
    gap: 5,
    ...editorialShadow,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  message: {
    color: editorialPalette.onSurface,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
});
