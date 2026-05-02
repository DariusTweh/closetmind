import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';

export default function TryOnHeader({
  onBack,
  tryOnsRemaining,
}: {
  onBack: () => void;
  tryOnsRemaining?: number | 'unlimited' | null;
}) {
  const badgeLabel =
    tryOnsRemaining === 'unlimited'
      ? 'Unlimited'
      : typeof tryOnsRemaining === 'number'
        ? `${tryOnsRemaining} left`
        : null;

  return (
    <View style={styles.row}>
      <TouchableOpacity activeOpacity={0.84} onPress={onBack} style={styles.iconButton}>
        <Ionicons name="chevron-back" size={21} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.titleWrap}>
        <Text style={styles.eyebrow}>Fitting Room</Text>
        <Text style={styles.title}>Try On</Text>
      </View>

      {badgeLabel ? (
        <View style={styles.badge}>
          <Text style={styles.badgeEyebrow}>Try-Ons</Text>
          <Text style={styles.badgeValue}>{badgeLabel}</Text>
        </View>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 3,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  placeholder: {
    width: 74,
    height: 40,
  },
  badge: {
    minWidth: 74,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEyebrow: {
    fontSize: 8.5,
    lineHeight: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  badgeValue: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
