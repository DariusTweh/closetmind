import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { spacing, typography } from '../../lib/theme';

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
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(tabBarHeight - 1, 0) }]}>
      <View style={styles.bar}>
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onEditInputs}
          disabled={loading}
          style={styles.editAction}
        >
          <Text style={styles.editActionText}>Edit Inputs</Text>
        </TouchableOpacity>

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
  },
  bar: {
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
    backgroundColor: 'rgba(247, 244, 239, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#daddd8',
  },
  editAction: {
    alignSelf: 'center',
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#daddd8',
  },
  editActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(28, 28, 28, 0.72)',
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#211d1a',
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
