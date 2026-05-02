import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';
import OutfitCanvas from './OutfitCanvas';
import type { OutfitCanvasItem } from './types';

type OutfitPreviewCardProps = {
  title: string;
  summary?: string | null;
  items: OutfitCanvasItem[];
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function OutfitPreviewCard({
  title,
  summary,
  items,
  selected = false,
  onPress,
  onLongPress,
}: OutfitPreviewCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={220}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <OutfitCanvas items={items} compact style={styles.canvasWrap} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 270,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 12,
    marginRight: 12,
  },
  cardSelected: {
    borderColor: colors.accent,
  },
  canvasWrap: {
    borderRadius: 18,
  },
  copy: {
    marginTop: 12,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  summary: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
