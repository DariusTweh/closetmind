import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';

type AddCaptureTopBarProps = {
  canSave: boolean;
  loading?: boolean;
  saveLabel?: string;
  onClose: () => void;
  onOpenDetails: () => void;
  onSave: () => void;
};

export default function AddCaptureTopBar({
  canSave,
  loading = false,
  saveLabel = 'Save',
  onClose,
  onOpenDetails,
  onSave,
}: AddCaptureTopBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconButton} onPress={onClose} activeOpacity={0.82}>
        <Ionicons name="close-outline" size={26} color="#1c1c1c" />
      </TouchableOpacity>

      <Text style={styles.title}>NEW ENTRY</Text>

      <View style={styles.rightActions}>
        {canSave ? (
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={loading}
            activeOpacity={0.82}
          >
            <Text style={styles.saveButtonText}>{loading ? 'Saving' : saveLabel}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.iconButton} onPress={onOpenDetails} activeOpacity={0.82}>
          <Ionicons name="options-outline" size={22} color="#1c1c1c" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: 3.2,
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
    fontWeight: '600',
    marginHorizontal: spacing.md,
  },
  rightActions: {
    minWidth: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  saveButton: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1c1c1c',
  },
  saveButtonDisabled: {
    opacity: 0.64,
  },
  saveButtonText: {
    color: '#eef0f2',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    fontFamily: typography.fontFamily,
  },
});
