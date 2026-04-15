import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';
import MultiSelectOverlay from './MultiSelectOverlay';
import WardrobeItemImage from './WardrobeItemImage';

type ClosetRecentlyAddedRowProps = {
  items?: any[];
  editMode?: boolean;
  selectedItemIds?: string[];
  onPressItem?: (item: any, index: number) => void;
};

function formatEyebrow(item: any) {
  return String(item?.main_category || item?.type || 'wardrobe')
    .replace(/_/g, ' ')
    .toUpperCase();
}

export default function ClosetRecentlyAddedRow({
  items = [],
  editMode = false,
  selectedItemIds = [],
  onPressItem,
}: ClosetRecentlyAddedRowProps) {
  const hasItems = items.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recently Added</Text>
        {hasItems ? (
          <Text style={styles.countLabel}>{items.length} pieces</Text>
        ) : null}
      </View>

      {hasItems ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {items.map((item, index) => {
            const isSelected = selectedItemIds.includes(item.id);

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                activeOpacity={0.86}
                onPress={() => onPressItem?.(item, index)}
              >
                {isSelected ? <MultiSelectOverlay /> : null}
                <WardrobeItemImage item={item} style={styles.image} resizeMode="cover" />
                <Text style={styles.eyebrow}>{formatEyebrow(item)}</Text>
                <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                  {item.name || item.type || 'Unnamed'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing added yet</Text>
          <Text style={styles.emptyText}>
            New pieces you save to your wardrobe will appear here.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs + 2,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  title: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  countLabel: {
    fontSize: 9.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 2,
  },
  card: {
    width: 104,
    marginRight: 7,
  },
  cardSelected: {
    opacity: 0.94,
  },
  image: {
    width: '100%',
    height: 126,
    borderRadius: 18,
    backgroundColor: '#eef0f2',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  eyebrow: {
    fontSize: 8.5,
    lineHeight: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 1,
  },
  name: {
    fontSize: 12.5,
    lineHeight: 15,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: 24,
    backgroundColor: '#eef0f2',
    ...shadows.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
