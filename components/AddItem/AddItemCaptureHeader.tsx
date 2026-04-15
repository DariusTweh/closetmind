import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

type AddItemCaptureHeaderProps = {
  hasImage: boolean;
  imageCount: number;
};

export default function AddItemCaptureHeader({
  hasImage,
  imageCount,
}: AddItemCaptureHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Item</Text>
      <Text style={styles.subtitle}>
        {hasImage
          ? `Preview the piece, then save fast${imageCount > 1 ? ` or switch between ${imageCount} images` : ''}.`
          : 'Capture a piece or pull one from your camera roll to add it to your closet.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    maxWidth: 280,
  },
});
