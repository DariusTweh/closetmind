import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

type GeneratorSummaryCardProps = {
  vibe: string;
  context: string;
  season: string;
  temperature: string;
};

function SummaryPill({ value }: { value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function GeneratorSummaryCard({
  vibe,
  context,
  season,
  temperature,
}: GeneratorSummaryCardProps) {
  const summaryLine = [vibe || 'Open brief', context ? `for ${context}` : 'for any plan']
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Styled for you</Text>
      <Text style={styles.title} numberOfLines={1}>
        {summaryLine}
      </Text>
      <View style={styles.pillRow}>
        <SummaryPill value={context || 'Any plan'} />
        <SummaryPill value={season || 'All season'} />
        <SummaryPill value={temperature ? `${temperature}°F` : 'Flexible'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
