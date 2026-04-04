import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../lib/theme'; // adjust path as needed

export default function ClosetHeader({ searchQuery, setSearchQuery, onEditPress, editMode }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>All Clothing</Text>

        <TouchableOpacity
          style={[
            styles.editButton,
            editMode && styles.editButtonActive,
          ]}
          onPress={onEditPress}
        >
          <Ionicons
            name="pencil"
            size={16}
            color={editMode ? '#fff' : '#111'}
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

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search your closet..."
          placeholderTextColor="#999"
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
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.header.fontSize,
    fontWeight: typography.header.fontWeight,
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  editButtonActive: {
    backgroundColor: colors.accent,
  },
  editText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  editTextActive: {
    color: colors.textOnAccent,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 4,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});