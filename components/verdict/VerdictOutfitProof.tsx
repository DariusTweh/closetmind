import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { spacing } from '../../lib/theme';
import { editorialPalette, editorialShadow } from '../../lib/editorialTheme';
import { VerdictItem } from '../../lib/itemVerdict';

type ProofItem = VerdictItem;

type Props = {
  label: string;
  reason?: string | null;
  items: ProofItem[];
};

export default function VerdictOutfitProof({ label, reason, items }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.label}>{label}</Text>
          {reason ? <Text style={styles.reason}>{reason}</Text> : null}
        </View>
        <Text style={styles.count}>{items.length} pieces</Text>
      </View>

      <FlatList
        horizontal
        data={items.slice(0, 4)}
        keyExtractor={(item, index) => item.id || `${label}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContent}
        renderItem={({ item }) => (
          <View style={styles.thumbCard}>
            {item.image_path || item.image_url ? (
              <WardrobeItemImage item={item} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.placeholder]} />
            )}
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name || 'Item'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 14,
    padding: spacing.md,
    gap: 12,
    ...editorialShadow,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: editorialPalette.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  reason: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 13.5,
    lineHeight: 19,
  },
  count: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stripContent: {
    paddingRight: 2,
  },
  thumbCard: {
    width: 98,
    gap: 7,
    marginRight: 8,
  },
  thumb: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainer,
  },
  placeholder: {
    backgroundColor: editorialPalette.surfaceContainer,
  },
  itemName: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 11.5,
    fontWeight: '600',
  },
});
