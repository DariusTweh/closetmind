import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '../../lib/theme';

export default function OutfitDetailActions({
  onTryOn,
  onDelete,
  disabled,
}: {
  onTryOn: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onTryOn}
            disabled={disabled}
            style={[styles.primaryButton, disabled && styles.disabledButton]}
          >
            <Text style={styles.primaryText}>Try On</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onDelete}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Delete Outfit</Text>
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
    bottom: 0,
  },
  bar: {
    paddingTop: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(250, 250, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#daddd8',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 14,
  },
  primaryText: {
    color: '#fafaff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryText: {
    color: '#1c1c1c',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
