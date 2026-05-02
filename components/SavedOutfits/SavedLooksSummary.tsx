import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

export default function SavedLooksSummary({
  total,
  favorites,
  topSeason,
}: {
  total: number;
  favorites: number;
  topSeason?: string | null;
}) {
  const chips = [
    `${total} total`,
    `${favorites} ${favorites === 1 ? 'favorite' : 'favorites'}`,
    topSeason ? `Top season: ${topSeason}` : null,
  ].filter(Boolean);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Saved Looks</Text>
      <Text style={styles.title}>Your outfit archive</Text>
      <Text style={styles.subtitle}>
        Revisit the fits you keep, compare what you favorite, and track the seasons you return to most.
      </Text>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg - 2,
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  chip: {
    minHeight: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
