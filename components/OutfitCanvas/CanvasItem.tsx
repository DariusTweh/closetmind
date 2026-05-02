import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';
import { colors, typography } from '../../lib/theme';
import { getCanvasItemVisualFrame, resolveCanvasRole } from './utils';
import type { OutfitCanvasItem as OutfitCanvasItemType } from './types';

type OutfitCanvasBoardItemProps = {
  item: OutfitCanvasItemType;
  highlighted?: boolean;
  compact?: boolean;
  imagePreference?: 'thumbnail' | 'display' | 'original';
  onPress?: (itemId: string) => void;
  onLongPress?: (itemId: string) => void;
  onImageLoadEnd?: (itemId: string) => void;
};

export default function CanvasItem({
  item,
  highlighted = false,
  compact = false,
  imagePreference = 'thumbnail',
  onPress,
  onLongPress,
  onImageLoadEnd,
}: OutfitCanvasBoardItemProps) {
  const rotation = Number(item?.layout?.rotation || 0);
  const role = resolveCanvasRole(item);
  const frame = getCanvasItemVisualFrame(item);
  const displayTitle = item.name || item.title || item.type || 'Item';
  const hasImage = Boolean(item.cutout_url || item.cutout_image_url || item.image_url || item.image_path);

  return (
    <Pressable
      onPress={onPress ? () => onPress(item.id) : undefined}
      onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
      delayLongPress={180}
      style={[
        styles.wrapper,
        {
          left: `${item.layout.x * 100}%`,
          top: `${item.layout.y * 100}%`,
          width: `${item.layout.w * 100}%`,
          height: `${item.layout.h * 100}%`,
          zIndex: item.layout.zIndex ?? 1,
          transform: [{ rotate: `${rotation}deg` }],
        },
      ]}
    >
      <View style={[styles.shadowWrap, compact && styles.shadowWrapCompact, highlighted && styles.shadowWrapHighlighted]}>
        {hasImage ? (
          <View
            style={[
              styles.mediaFrame,
              {
                width: `${frame.widthScale * 100}%`,
                height: `${frame.heightScale * 100}%`,
              },
            ]}
          >
            <WardrobeItemImage
              item={item}
              style={styles.image}
              resizeMode="contain"
              imagePreference={imagePreference}
              onLoadEnd={onImageLoadEnd ? () => onImageLoadEnd(item.id) : undefined}
            />
          </View>
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText} numberOfLines={2}>
              {displayTitle}
            </Text>
          </View>
        )}
        {item.locked ? <View style={styles.lockBadge} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  shadowWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#171412',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  shadowWrapCompact: {
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  shadowWrapHighlighted: {
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  mediaFrame: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  placeholder: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(218, 221, 216, 0.72)',
    backgroundColor: 'rgba(250, 250, 255, 0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  placeholderText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontWeight: '600',
  },
  lockBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
});
