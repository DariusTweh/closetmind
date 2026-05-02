import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../../lib/theme';
import { editorialPalette } from '../../lib/editorialTheme';

type InsightTone = 'positive' | 'warning' | 'neutral';

type Props = {
  title: string;
  message: string;
  tone?: InsightTone;
};

const PALETTES: Record<InsightTone, { backgroundColor: string; accent: string }> = {
  positive: {
    backgroundColor: editorialPalette.verdictStrong,
    accent: editorialPalette.onSurface,
  },
  warning: {
    backgroundColor: editorialPalette.verdictSkip,
    accent: editorialPalette.error,
  },
  neutral: {
    backgroundColor: editorialPalette.surfaceContainer,
    accent: editorialPalette.onSurfaceVariant,
  },
};

export default function VerdictInsightCard({ title, message, tone = 'neutral' }: Props) {
  const palette = PALETTES[tone] || PALETTES.neutral;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.backgroundColor,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: palette.accent }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: spacing.md + 2,
    gap: 8,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  message: {
    color: editorialPalette.onSurface,
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '600',
  },
});
