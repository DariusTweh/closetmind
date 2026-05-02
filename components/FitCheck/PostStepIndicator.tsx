import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../../lib/theme';

export default function PostStepIndicator({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <View style={styles.row}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isComplete = stepNumber < currentStep;
        return (
          <View key={step} style={styles.step}>
            <View style={[styles.badge, (isActive || isComplete) && styles.badgeActive]}>
              <Text style={[styles.badgeText, (isActive || isComplete) && styles.badgeTextActive]}>
                {stepNumber}
              </Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  step: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  badgeActive: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  badgeTextActive: {
    color: colors.textOnAccent,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  labelActive: {
    color: colors.textPrimary,
  },
});
