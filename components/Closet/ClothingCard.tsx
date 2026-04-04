import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import MultiSelectOverlay from './MultiSelectOverlay';
import { colors, spacing, radii, typography, shadows } from '../../lib/theme'; // adjust path if needed


const CARD_WIDTH = Dimensions.get('window').width * 0.42;

export default function ClothingCard({ item, onPress, onLongPress, isSelected }) {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={() => onPress?.(item)}
      onLongPress={() => onLongPress?.(item)}
    >
      {isSelected && <MultiSelectOverlay />}
      <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      <Text style={styles.label}>{item.name}</Text>
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: radii.lg,
    backgroundColor: colors.cardBackground,
    marginRight: spacing.md - 4,
    paddingBottom: spacing.md - 2,
    ...shadows.card,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  image: {
    width: '100%',
    height: CARD_WIDTH * 1.1,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily,
  },
});