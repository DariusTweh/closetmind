import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../../lib/theme';

export default function EditItemHeader({
  onBack,
  onSave,
  saving = false,
}: {
  onBack: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <View style={styles.row}>
      <TouchableOpacity activeOpacity={0.84} onPress={onBack} style={styles.iconButton}>
        <Ionicons name="chevron-back" size={22} color="#1c1c1c" />
      </TouchableOpacity>

      <Text style={styles.title}>Edit Item</Text>

      <TouchableOpacity
        activeOpacity={0.84}
        onPress={onSave}
        disabled={saving}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
      >
        <Text style={styles.saveText}>{saving ? 'Saving' : 'Save'}</Text>
      </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e2dbd1',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9d1c7',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: 'Georgia',
  },
  saveButton: {
    minWidth: 68,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#211d1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fafaff',
    fontFamily: typography.fontFamily,
  },
});
