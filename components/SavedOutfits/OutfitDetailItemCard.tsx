import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { spacing, typography } from '../../lib/theme';

function formatRole(mainCategory?: string | null) {
  const raw = String(mainCategory || '').trim();
  if (!raw) return 'Piece';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function OutfitDetailItemCard({
  item,
  onPress,
}: {
  item: any;
  onPress?: () => void;
}) {
  const sourceLabel = item?.source_type === 'external' ? 'Product' : 'Closet piece';
  const metaLabel =
    item?.source_type === 'external'
      ? [item?.brand, item?.retailer].filter(Boolean).join(' · ') || item?.product_url || 'Tap to reopen product'
      : item?.type || item?.primary_color || 'Tap to style this piece';

  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      <WardrobeItemImage item={item} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{formatRole(item?.main_category)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item?.name || item?.title || item?.type || sourceLabel}
        </Text>

        <Text style={styles.meta} numberOfLines={2}>
          {metaLabel}
        </Text>

        <View style={styles.reasonBlock}>
          <Text style={styles.reasonLabel}>
            {item?.source_type === 'external' ? 'Open Product' : 'Why it works'}
          </Text>
          <Text style={styles.reasonText}>
            {item?.source_type === 'external'
              ? item?.product_url || 'Reopen this product in the browser flow.'
              : item?.reason || 'Locked into the saved look.'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    padding: 14,
    marginBottom: 14,
  },
  image: {
    width: 96,
    height: 118,
    borderRadius: 12,
    backgroundColor: '#eef0f2',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
  },
  roleText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.72)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  meta: {
    marginTop: 4,
    fontSize: 12.5,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  reasonBlock: {
    marginTop: 12,
  },
  reasonLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
  },
  reasonText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
});
