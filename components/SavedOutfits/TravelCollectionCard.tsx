import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTripDateRange } from '../../lib/travelCollections';
import { colors, spacing, typography } from '../../lib/theme';
import type { TravelCollection } from '../../types/travelCollections';
import OutfitPreviewStrip from './OutfitPreviewStrip';

export default function TravelCollectionCard({
  collection,
  outfitCount,
  previewItems,
  onPress,
}: {
  collection: TravelCollection;
  outfitCount: number;
  previewItems: any[];
  onPress: () => void;
}) {
  const destination = String(collection?.destination || '').trim();
  const dateRange = formatTripDateRange(collection?.start_date, collection?.end_date);
  const subtitle = [destination || null, dateRange || null].filter(Boolean).join(' • ');

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {collection?.name || 'Untitled Trip'}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{outfitCount} Looks</Text>
        </View>
      </View>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}

      <View style={styles.previewWrap}>
        <OutfitPreviewStrip items={previewItems} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {outfitCount ? `${outfitCount} outfit${outfitCount === 1 ? '' : 's'} planned` : 'No outfits saved yet'}
        </Text>
        <View style={styles.footerAction}>
          <Text style={styles.footerActionText}>View Trip</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.textPrimary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbd3c9',
    padding: 16,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: '#1e1916',
    fontFamily: 'Georgia',
  },
  countBadge: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4d7ca',
    backgroundColor: '#f0e7dd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5e4030',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  previewWrap: {
    marginTop: 4,
  },
  footerRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5ddd3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  footerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});
