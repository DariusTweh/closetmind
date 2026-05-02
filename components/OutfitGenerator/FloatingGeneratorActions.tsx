import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';
import { useOptionalBottomTabBarHeight } from '../../lib/useOptionalBottomTabBarHeight';

type FloatingGeneratorActionsProps = {
  onSave: () => void;
  onGenerateAgain: () => void;
  onEditInputs: () => void;
  loading: boolean;
};

export default function FloatingGeneratorActions({
  onSave,
  onGenerateAgain,
  onEditInputs,
  loading,
}: FloatingGeneratorActionsProps) {
  const tabBarHeight = useOptionalBottomTabBarHeight();

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(tabBarHeight + 10, 12) }]}>
      <View style={styles.bar}>
        <View style={styles.editRow}>
          <Text style={styles.helperLabel}>Want a different direction?</Text>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onEditInputs}
            disabled={loading}
            style={styles.editAction}
          >
            <Text style={styles.editActionText}>Edit Inputs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onGenerateAgain}
            disabled={loading}
            style={[styles.secondaryButton, loading && styles.disabledButton]}
          >
            <Text style={styles.secondaryButtonText}>
              {loading ? 'Generating...' : 'Generate Again'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onSave}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>Save Fit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: 'rgba(250, 250, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  helperLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  editAction: {
    minHeight: 34,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#fafaff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
