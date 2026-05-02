import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';
import OutfitPreviewStrip from './OutfitPreviewStrip';

export default function FavoritesStrip({
  outfits,
  onOpen,
}: {
  outfits: any[];
  onOpen: (outfit: any) => void;
}) {
  if (!outfits.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>Favorite Looks</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {outfits.map((outfit) => (
          <TouchableOpacity
            key={outfit.id}
            activeOpacity={0.88}
            onPress={() => onOpen(outfit)}
            style={styles.card}
          >
            <Text style={styles.title} numberOfLines={2}>
              {outfit?.name || 'Untitled Fit'}
            </Text>
            <View style={styles.previewWrap}>
              <OutfitPreviewStrip items={Array.isArray(outfit?.resolvedItems) ? outfit.resolvedItems : []} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    marginBottom: spacing.sm,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  row: {
    paddingRight: spacing.md,
  },
  card: {
    width: 248,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  previewWrap: {
    marginTop: spacing.md,
  },
});
