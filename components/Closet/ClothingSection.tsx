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
  editMode = false,
  selectedItems = [],
  toggleItemSelection = (_itemId) => {},
  setSelectedIndex = (_index) => {},
}) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.titleDivider} />
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.md - 2,
    backgroundColor: colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
    marginRight: spacing.sm + 2,
  },
  titleDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#daddd8',
  },
  listContent: {
    paddingRight: spacing.sm + 6,
  },
});
