import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../lib/theme';
import type { FitCheckItem } from '../../types/fitCheck';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

export default function FitItemStrip({
  items,
}: {
  items: FitCheckItem[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Pieces in this fit</Text>
      {items.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <WardrobeItemImage item={item} style={styles.itemImage} imagePreference="thumbnail" />
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Pieces not attached yet</Text>
          <Text style={styles.emptyCopy}>The fit is posted without a closet breakdown for now.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  content: {
    paddingRight: 10,
  },
  itemCard: {
    width: 110,
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    marginRight: 10,
  },
  itemImage: {
    width: 94,
    height: 94,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  itemName: {
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    paddingHorizontal: 2,
    minHeight: 30,
  },
  emptyCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 14,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  emptyCopy: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
});
