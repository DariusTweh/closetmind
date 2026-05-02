import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { spacing } from '../../lib/theme';
import { editorialPalette } from '../../lib/editorialTheme';
import { VerdictItem } from '../../lib/itemVerdict';

type ProofItem = VerdictItem;

type Props = {
  label: string;
  reason?: string | null;
  items: ProofItem[];
  context?: string | null;
  onPress?: () => void;
};

export default function VerdictOutfitProof({ label, reason, items, context, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={onPress ? 0.92 : 1} onPress={onPress} disabled={!onPress}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.label}>{label}</Text>
          {context ? <Text style={styles.context}>{context}</Text> : null}
          {reason ? <Text style={styles.reason}>{reason}</Text> : null}
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.count}>{items.length} pieces</Text>
          {onPress ? <Text style={styles.cta}>Style this</Text> : null}
        </View>
      </View>

      <FlatList
        horizontal
        data={items.slice(0, 4)}
        keyExtractor={(item, index) => item.id || `${label}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContent}
        renderItem={({ item }) => (
          <View style={styles.thumbCard}>
            {item.cutout_url || item.cutout_image_url || item.image_path || item.image_url ? (
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.md + 2,
    gap: 14,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
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
  headerMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  label: {
    color: editorialPalette.onSurface,
    fontSize: 16,
    fontWeight: '800',
  },
  context: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  reason: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  count: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cta: {
    color: editorialPalette.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  stripContent: {
    paddingRight: 2,
  },
  thumbCard: {
    width: 96,
    gap: 8,
    marginRight: 10,
  },
  thumb: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 16,
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
