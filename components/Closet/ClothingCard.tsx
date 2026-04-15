import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  View,
} from 'react-native';
import MultiSelectOverlay from './MultiSelectOverlay';
import WardrobeItemImage from './WardrobeItemImage';
import { colors, spacing, radii, typography } from '../../lib/theme';


const CARD_WIDTH = Dimensions.get('window').width * 0.42;

function formatEyebrow(item) {
  return String(item?.main_category || item?.type || 'wardrobe')
    .replace(/_/g, ' ')
    .toUpperCase();
}

export default function ClothingCard({ item, onPress, onLongPress, isSelected, gridMode = false }) {
  return (
    <TouchableOpacity
      style={[styles.card, gridMode && styles.cardGrid, isSelected && styles.cardSelected]}
      onPress={() => onPress?.(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      {isSelected && <MultiSelectOverlay />}
      <View style={[styles.imageWrap, gridMode && styles.imageWrapGrid, isSelected && styles.imageWrapSelected]}>
        <WardrobeItemImage item={item} style={[styles.image, gridMode && styles.imageGrid]} resizeMode="cover" />
      </View>
      <Text style={styles.eyebrow}>{formatEyebrow(item)}</Text>
      <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
        {item.name || item.type || 'Unnamed'}
      </Text>
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.sm + 4,
  },
  cardGrid: {
    width: '100%',
    marginRight: 0,
  },
  cardSelected: {
    opacity: 1,
  },
  imageWrap: {
    borderRadius: radii.lg,
    backgroundColor: '#eef0f2',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  imageWrapGrid: {
    marginBottom: 6,
  },
  imageWrapSelected: {
    borderWidth: 2,
    borderColor: '#1c1c1c',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: CARD_WIDTH * 1.1,
    borderRadius: radii.lg,
  },
  imageGrid: {
    height: undefined,
    aspectRatio: 0.9,
  },
  eyebrow: {
    fontSize: 8.5,
    lineHeight: 11,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 1,
    marginHorizontal: spacing.sm + 2,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'left',
    marginHorizontal: spacing.sm + 2,
    fontFamily: typography.fontFamily,
  },
});
