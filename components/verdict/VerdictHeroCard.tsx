import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { spacing } from '../../lib/theme';
import { editorialPalette } from '../../lib/editorialTheme';
import { OccasionUseCase, VerdictItem, VerdictMeta, ValueSignal } from '../../lib/itemVerdict';

type Props = {
  item: VerdictItem;
  verdictMeta?: VerdictMeta | null;
  bestUseCase?: OccasionUseCase | null;
  valueSignal?: ValueSignal | null;
};

function getSourceLabel(item: VerdictItem) {
  if (item.brand) return item.brand;
  const rawUrl = String(item.source_url || '').trim();
  if (!rawUrl) return 'Klozu Verdict';

  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '');
  } catch {
    return 'Klozu Verdict';
  }
}

function formatPrice(valueSignal?: ValueSignal | null, item?: VerdictItem) {
  const numeric = Number(valueSignal?.price ?? item?.price ?? item?.retail_price);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: item?.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `$${Math.round(numeric)}`;
  }
}

export default function VerdictHeroCard({ item, verdictMeta, bestUseCase, valueSignal }: Props) {
  const sourceLabel = getSourceLabel(item);
  const categoryLabel = item.category || item.main_category || item.type || 'Wardrobe item';
  const priceLabel = formatPrice(valueSignal, item);
  const detailChips = [
    categoryLabel,
    item.primary_color,
    Array.isArray(item.season) ? item.season[0] : item.season,
    priceLabel,
  ].filter(Boolean);
  const descriptor = bestUseCase?.message || item.pattern_description || item.type || item.retailer_name || null;

  return (
    <View style={styles.card}>
      <View style={styles.imageStage}>
        {item.cutout_url || item.cutout_image_url || item.image_path || item.image_url ? (
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

        {(verdictMeta?.label || valueSignal?.label) ? (
          <View style={styles.statusRow}>
            {verdictMeta?.label ? (
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{verdictMeta.label}</Text>
              </View>
            ) : null}
            {valueSignal?.label ? (
              <View style={styles.statusChip}>
                <Text style={styles.statusChipText}>{valueSignal.label}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

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
    borderRadius: 22,
    marginBottom: spacing.lg,
    padding: spacing.md + 2,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
  },
  imageStage: {
    width: 108,
    alignSelf: 'stretch',
  },
  image: {
    width: '100%',
    height: 148,
    borderRadius: 18,
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
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainer,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
  },
  statusChipText: {
    color: editorialPalette.onSurface,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eyebrow: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.9,
    textTransform: 'uppercase',
  },
  title: {
    color: editorialPalette.onSurface,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainer,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
  },
  metaChipText: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  summary: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
});
