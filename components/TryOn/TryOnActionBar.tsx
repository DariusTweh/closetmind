import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows, spacing, typography } from '../../lib/theme';

export default function TryOnActionBar({
  onGenerate,
  onSave,
  generateLabel,
  generateDisabled,
  saveDisabled,
}: {
  onGenerate: () => void;
  onSave: () => void;
  generateLabel?: string;
  generateDisabled?: boolean;
  saveDisabled?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + spacing.xs }]}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onGenerate}
            disabled={generateDisabled}
            style={[styles.primaryButton, generateDisabled && styles.disabledButton]}
          >
            <Text style={styles.primaryText}>{generateLabel || 'Generate Try-On'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onSave}
            disabled={saveDisabled}
            style={[styles.secondaryButton, saveDisabled && styles.disabledButton]}
          >
            <Text style={[styles.secondaryText, saveDisabled && styles.secondaryTextDisabled]}>Save Image</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
  bar: {
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(250, 250, 255, 0.98)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    ...shadows.card,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1.15,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryText: {
    color: colors.textOnAccent,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryButton: {
    flex: 0.95,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryTextDisabled: {
    color: colors.textMuted,
  },
  disabledButton: {
    opacity: 0.62,
  },
});
