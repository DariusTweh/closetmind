import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import { colors, spacing, radii, shadows, typography } from '../../lib/theme'; // adjust import path

export default function EditModeToolbar({ onCancel, onDelete }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 60,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10000,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    ...shadows.card,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.md - 2 : spacing.sm + 2,
    paddingTop: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    paddingVertical: spacing.md - 4,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    marginLeft: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md - 4,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: typography.fontFamily,
  },
  deleteText: {
    color: colors.textOnAccent,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: typography.fontFamily,
  },
});
