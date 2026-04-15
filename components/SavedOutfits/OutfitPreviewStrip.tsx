import React from 'react';
import { StyleSheet, View } from 'react-native';
import WardrobeItemImage from '../Closet/WardrobeItemImage';

const PREVIEW_SLOTS = 4;

export default function OutfitPreviewStrip({ items = [] }: { items?: any[] }) {
  const previewItems = items.slice(0, PREVIEW_SLOTS);
  const placeholders = Math.max(PREVIEW_SLOTS - previewItems.length, 0);
  const total = previewItems.length + placeholders;

  return (
    <View style={styles.row}>
      {previewItems.map((item, index) => (
        <View
          key={item?.id || `preview-${index}`}
          style={[styles.frame, index < total - 1 && styles.frameGap]}
        >
          <WardrobeItemImage item={item} style={styles.image} />
        </View>
      ))}
      {Array.from({ length: placeholders }).map((_, index) => {
        const offset = previewItems.length + index;
        return (
          <View
            key={`placeholder-${index}`}
            style={[styles.frame, styles.placeholder, offset < total - 1 && styles.frameGap]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    aspectRatio: 0.88,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#e4ddd3',
  },
  frameGap: {
    marginRight: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#fafaff',
    borderStyle: 'solid',
  },
});
