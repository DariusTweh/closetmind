import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

type OnboardingChoiceCardProps = {
  label: string;
  description: string;
  selected?: boolean;
  onPress: () => void;
  compact?: boolean;
};

export default function OnboardingChoiceCard({
  label,
  description,
  selected = false,
  onPress,
  compact = false,
}: OnboardingChoiceCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.card, compact && styles.cardCompact, selected && styles.cardSelected]}
    >
      <View style={[styles.indicator, selected && styles.indicatorSelected]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    minHeight: 132,
  },
  cardCompact: {
    minHeight: 150,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.backgroundAlt,
  },
  indicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceContainerLow,
  },
  indicatorSelected: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.lg,
    fontFamily: typography.fontFamily,
  },
  description: {
    marginTop: spacing.sm,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
