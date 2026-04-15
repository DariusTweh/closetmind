import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../../lib/theme';

export default function EditModeToolbar({
  onCancel,
  onDelete,
  selectedCount = 0,
}: {
  onCancel: () => void;
  onDelete: () => void;
  selectedCount?: number;
}) {
  const insets = useSafeAreaInsets();
  const deleteLabel = selectedCount === 1 ? 'Delete 1 Item' : `Delete ${selectedCount} Items`;

  return (
    <View style={[styles.safeArea, { bottom: 44 + insets.bottom }]}>
      <View style={styles.container}>
        <TouchableOpacity activeOpacity={0.84} style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.84} style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>{deleteLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10000,
    backgroundColor: '#fafaff',
    borderTopWidth: 1,
    borderTopColor: '#daddd8',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 14,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#daddd8',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#1c1c1c',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontWeight: '700',
    fontSize: 13.5,
    fontFamily: typography.fontFamily,
  },
  deleteText: {
    color: '#fafaff',
    fontWeight: '700',
    fontSize: 13.5,
    fontFamily: typography.fontFamily,
  },
});
