import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

type OnboardingChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export default function OnboardingChip({
  label,
  selected = false,
  onPress,
}: OnboardingChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  text: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  textSelected: {
    color: colors.textOnAccent,
  },
});
