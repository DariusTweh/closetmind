import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

type OutfitSummaryCardProps = {
  eyebrow?: string;
  title: string;
  summary?: string | null;
  chips?: Array<string | null | undefined>;
};

function SummaryChip({ value }: { value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function OutfitSummaryCard({
  eyebrow = 'Outfit summary',
  title,
  summary,
  chips = [],
}: OutfitSummaryCardProps) {
  const visibleChips = (chips || []).map((value) => String(value || '').trim()).filter(Boolean);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      {visibleChips.length ? (
        <View style={styles.chipRow}>
          {visibleChips.map((chip) => (
            <SummaryChip key={chip} value={chip} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
    paddingBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  summary: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily: typography.fontFamily,
  },
});
