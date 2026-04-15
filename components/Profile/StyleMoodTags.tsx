// components/StyleMoodTags.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, colors, radii, typography } from '../../lib/theme';

export default function StyleMoodTags({ tags = [], onEdit }) {
  const hasTags = Array.isArray(tags) && tags.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Style Mood</Text>
        <TouchableOpacity onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color="#666" />
        </TouchableOpacity>
      </View>

      {hasTags ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>Add a few style tags so recommendations feel more personal.</Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl - 4,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  label: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tag: {
    backgroundColor: colors.modalBackground,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  tagText: {
    fontSize: typography.label.fontSize,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: typography.label.fontSize,
    color: colors.textSecondary,
  },
});
