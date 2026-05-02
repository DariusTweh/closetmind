import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';
import CanvasItem from './CanvasItem';
import { getOutfitCanvasBoardAspectRatio } from './utils';
import type { OutfitCanvasItem as OutfitCanvasItemType } from './types';

type OutfitCanvasProps = {
  items: OutfitCanvasItemType[];
  highlightedItemId?: string | null;
  compact?: boolean;
  imagePreference?: 'thumbnail' | 'display' | 'original';
  style?: StyleProp<ViewStyle>;
  boardStyle?: StyleProp<ViewStyle>;
  emptyLabel?: string;
  onPressItem?: (itemId: string) => void;
  onLongPressItem?: (itemId: string) => void;
  onItemImageLoadEnd?: (itemId: string) => void;
};

export default function OutfitCanvas({
  items,
  highlightedItemId,
  compact = false,
  imagePreference = 'thumbnail',
  style,
  boardStyle,
  emptyLabel = 'Your outfit board will appear here.',
  onPressItem,
  onLongPressItem,
  onItemImageLoadEnd,
}: OutfitCanvasProps) {
  const orderedItems = (items || []).slice().sort((left, right) => (left.layout.zIndex ?? 1) - (right.layout.zIndex ?? 1));

  return (
    <View style={[styles.shell, compact && styles.shellCompact, style]}>
      <View
        style={[
          styles.board,
          compact && styles.boardCompact,
          { aspectRatio: getOutfitCanvasBoardAspectRatio() },
          boardStyle,
        ]}
      >
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />

        {!orderedItems.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{emptyLabel}</Text>
          </View>
        ) : null}

        {orderedItems.map((item) => (
          <CanvasItem
            key={item.id}
            item={item}
            compact={compact}
            imagePreference={imagePreference}
            highlighted={highlightedItemId === item.id}
            onPress={onPressItem}
            onLongPress={onLongPressItem}
            onImageLoadEnd={onItemImageLoadEnd}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  shellCompact: {
    borderRadius: 22,
  },
  board: {
    minHeight: 420,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(218, 221, 216, 0.88)',
    backgroundColor: '#f3f5f8',
  },
  boardCompact: {
    minHeight: 238,
    borderRadius: 22,
  },
  glowLarge: {
    position: 'absolute',
    top: 20,
    right: -36,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  glowSmall: {
    position: 'absolute',
    bottom: 34,
    left: -18,
    width: 118,
    height: 118,
    borderRadius: 999,
    backgroundColor: 'rgba(238, 240, 242, 0.78)',
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
});
