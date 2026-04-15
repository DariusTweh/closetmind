import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { spacing } from '../../lib/theme';
import { editorialPalette, editorialShadow } from '../../lib/editorialTheme';
import { VerdictItem } from '../../lib/itemVerdict';

type Props = {
  item: VerdictItem;
};

function getSourceLabel(item: VerdictItem) {
  if (item.brand) return item.brand;
  const rawUrl = String(item.source_url || '').trim();
  if (!rawUrl) return 'ClosetMind Verdict';

  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '');
  } catch {
    return 'ClosetMind Verdict';
  }
}

export default function VerdictHeroCard({ item }: Props) {
  const sourceLabel = getSourceLabel(item);
  const categoryLabel = item.category || item.main_category || item.type || 'Wardrobe item';
  const detailChips = [
    categoryLabel,
    item.primary_color,
    Array.isArray(item.season) ? item.season[0] : item.season,
  ].filter(Boolean);
  const descriptor = item.pattern_description || item.type || item.retailer_name || null;

  return (
    <View style={styles.card}>
      <View style={styles.imageStage}>
        {item.image_path || item.image_url ? (
          <WardrobeItemImage item={item} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
      </View>

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{sourceLabel}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.name || 'Imported Item'}
        </Text>

        {detailChips.length ? (
          <View style={styles.metaRow}>
            {detailChips.map((value) => (
              <View key={String(value)} style={styles.metaChip}>
                <Text style={styles.metaChipText}>{String(value)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {descriptor ? (
          <Text style={styles.summary} numberOfLines={1}>
            {descriptor}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 14,
    marginBottom: spacing.md + 2,
    padding: spacing.md,
    gap: spacing.md,
    ...editorialShadow,
  },
  imageStage: {
    width: 122,
    alignSelf: 'stretch',
  },
  image: {
    width: '100%',
    height: 158,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainer,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 12.5,
    fontWeight: '600',
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  eyebrow: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: editorialPalette.onSurface,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainer,
  },
  metaChipText: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.15,
    textTransform: 'capitalize',
  },
  summary: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 13.5,
    lineHeight: 18,
  },
});
