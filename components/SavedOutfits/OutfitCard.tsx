import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, radii, shadows, typography } from '../../lib/theme'; // adjust if needed

export default function OutfitCard({ outfit, onPress, onToggleFavorite }) {
  const tags = (outfit.context || '').split(/[,.•|]+/).map(tag => tag.trim()).filter(Boolean);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <TouchableOpacity style={styles.heartIcon} onPress={onToggleFavorite}>
        <Icon
          name={outfit.is_favorite ? 'heart' : 'heart-outline'}
          size={22}
          color={outfit.is_favorite ? '#8abfa3' : '#aaa'}
        />
      </TouchableOpacity>

      <Text style={styles.title}>{outfit.name || 'Untitled Fit'}</Text>

      {tags.length > 0 && (
        <Text style={styles.tags}>
          {tags.join(' • ')}
        </Text>
      )}

      <View style={styles.imageRow}>
        {outfit.wardrobeItems?.map(item => (
          <Image
            key={item.id}
            source={{ uri: item.image_url }}
            style={styles.image}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md + 2,
    position: 'relative',
    ...shadows.card,
  },
  heartIcon: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia', // keeps editorial flair as you used
    paddingRight: 32, // for heart icon
    marginBottom: spacing.xs,
  },
  tags: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md - 2,
    fontFamily: typography.fontFamily,
  },
  imageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
});