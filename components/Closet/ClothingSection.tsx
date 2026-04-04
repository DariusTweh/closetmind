import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import ClothingCard from './ClothingCard';
import { colors, spacing, typography } from '../../lib/theme'; // adjust path as needed

export default function ClothingSection({
  title,
  items,
  editMode,
  selectedItems = [],
  toggleItemSelection,
  setSelectedIndex,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id?.toString() || item.name}
        renderItem={({ item, index }) => (
          <ClothingCard
            item={item}
            isSelected={selectedItems.includes(item.id)}
            onPress={() => {
              if (editMode) toggleItemSelection(item.id);
              else setSelectedIndex(index);
            }}
            onLongPress={() => {
              // Optional: implement long-press behavior here or pass down
            }}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.sm + 4,
  },
  listContent: {
    paddingRight: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
  },
});
