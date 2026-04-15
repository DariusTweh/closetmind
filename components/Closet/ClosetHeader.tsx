import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../lib/theme';

export default function ClosetHeader({
  searchQuery,
  setSearchQuery,
  onEditPress,
  editMode = false,
  selectedCount = 0,
  onFilterPress = null,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{editMode ? 'Selection Mode' : 'Browse Wardrobe'}</Text>
          {editMode ? (
            <Text style={styles.selectionText}>
              {selectedCount} {selectedCount === 1 ? 'item selected' : 'items selected'}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          {onFilterPress ? (
            <TouchableOpacity style={[styles.iconButton, editMode && styles.iconButtonActive]} onPress={onFilterPress}>
              <Ionicons name="options-outline" size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.editButton,
              editMode && styles.editButtonActive,
            ]}
            onPress={onEditPress}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color={editMode ? colors.textOnAccent : colors.textPrimary}
            />
            <Text
              style={[
                styles.editText,
                editMode && styles.editTextActive,
              ]}
            >
              {editMode ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search your closet..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xs + 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs + 6,
  },
  title: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    fontFamily: typography.fontFamily,
    color: colors.textSecondary,
  },
  selectionText: {
    marginTop: 3,
    fontSize: 12.5,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#daddd8',
  },
  iconButtonActive: {
    backgroundColor: '#fafaff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingVertical: 7,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 14,
  },
  editButtonActive: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  editText: {
    marginLeft: 5,
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  editTextActive: {
    color: colors.textOnAccent,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafaff',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: spacing.md - 1,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.025,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: spacing.sm - 1,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});
