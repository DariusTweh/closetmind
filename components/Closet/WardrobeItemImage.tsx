import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import {
  getItemImageImmediateUri,
  getItemImageResizeMode,
  invalidateItemImageCache,
  resolveItemImage,
} from '../../lib/itemImage';
import { colors } from '../../lib/theme';

type WardrobeItemImageProps = {
  item: {
    cutout_url?: string | null;
    cutout_image_url?: string | null;
    cutout_thumbnail_url?: string | null;
    cutout_display_url?: string | null;
    image_url?: string | null;
    image_path?: string | null;
    thumbnail_url?: string | null;
    display_image_url?: string | null;
    original_image_url?: string | null;
  };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  imagePreference?: 'thumbnail' | 'display' | 'original';
  onLoadEnd?: () => void;
};

const WARDROBE_MEDIA_BUCKET = 'clothes';

export default function WardrobeItemImage({
  item,
  style,
  resizeMode = 'cover',
  imagePreference = 'thumbnail',
  onLoadEnd,
}: WardrobeItemImageProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(getItemImageImmediateUri(item, imagePreference));
  const [resolvedIsCutout, setResolvedIsCutout] = useState<boolean>(
    Boolean(
      item?.cutout_url ||
      item?.cutout_image_url ||
      item?.cutout_thumbnail_url ||
      item?.cutout_display_url,
    ),
  );
  const [refreshTick, setRefreshTick] = useState(0);
  const [hasRetried, setHasRetried] = useState(false);
  const lastDebugKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setResolvedUri(getItemImageImmediateUri(item, imagePreference));
    setResolvedIsCutout(
      Boolean(
        item?.cutout_url ||
        item?.cutout_image_url ||
        item?.cutout_thumbnail_url ||
        item?.cutout_display_url,
      ),
    );
    setHasRetried(false);
  }, [
    imagePreference,
    item?.cutout_image_url,
    item?.cutout_display_url,
    item?.cutout_thumbnail_url,
    item?.cutout_url,
    item?.display_image_url,
    item?.image_path,
    item?.image_url,
    item?.original_image_url,
    item?.thumbnail_url,
  ]);

  useEffect(() => {
    let cancelled = false;

    const resolveUri = async () => {
      const nextImage = await resolveItemImage(item, {
        bucket: WARDROBE_MEDIA_BUCKET,
        preferBackendSigner: true,
        preference: imagePreference,
      }).catch(() => ({
        uri: getItemImageImmediateUri(item, imagePreference),
        isCutout: Boolean(
          item?.cutout_url ||
          item?.cutout_image_url ||
          item?.cutout_thumbnail_url ||
          item?.cutout_display_url,
        ),
        sourceKind: 'missing' as const,
        fellBackToOriginal: false,
      }));

      if (!cancelled) {
        if (!nextImage?.uri) {
          console.warn('WardrobeItemImage failed to resolve URI:', {
            item_id: (item as any)?.id || null,
            image_path: item?.image_path || null,
            cutout_image_url: item?.cutout_image_url || null,
            cutout_thumbnail_url: item?.cutout_thumbnail_url || null,
            cutout_display_url: item?.cutout_display_url || null,
            cutout_url: item?.cutout_url || null,
            image_url: item?.image_url || null,
          });
        } else if (__DEV__) {
          const debugKey = [
            String((item as any)?.id || ''),
            String(nextImage?.sourceKind || ''),
            String(nextImage?.uri || ''),
          ].join(':');
          if (lastDebugKeyRef.current !== debugKey) {
            lastDebugKeyRef.current = debugKey;
            console.log('[wardrobe-image]', {
              itemId: (item as any)?.id || null,
              sourceKind: nextImage?.sourceKind || null,
              fellBackToOriginal: Boolean((nextImage as any)?.fellBackToOriginal),
              imagePreference,
              hasImagePath: Boolean(item?.image_path),
              hasCutoutImage: Boolean(item?.cutout_image_url || item?.cutout_url),
              hasMainDerivatives: Boolean(item?.thumbnail_url || item?.display_image_url),
              hasCutoutDerivatives: Boolean(item?.cutout_thumbnail_url || item?.cutout_display_url),
            });
          }
        }
        setResolvedUri(nextImage?.uri || null);
        setResolvedIsCutout(Boolean(nextImage?.isCutout));
      }
    };

    resolveUri();

    return () => {
      cancelled = true;
    };
  }, [imagePreference, item, refreshTick]);

  if (!resolvedUri) {
    return <View style={[style, styles.placeholder]} />;
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      resizeMode={getItemImageResizeMode(resizeMode, resolvedIsCutout)}
      onLoadEnd={onLoadEnd}
      onError={() => {
        onLoadEnd?.();
        if ((
          item?.image_path ||
          item?.cutout_image_url ||
          item?.cutout_thumbnail_url ||
          item?.cutout_display_url ||
          item?.cutout_url ||
          item?.image_url
        ) && !hasRetried) {
          invalidateItemImageCache(item, {
            bucket: WARDROBE_MEDIA_BUCKET,
            preference: imagePreference,
          });
          setHasRetried(true);
          setResolvedUri(null);
          setRefreshTick((value) => value + 1);
          return;
        }

        console.warn('WardrobeItemImage failed to load image:', {
          item_id: (item as any)?.id || null,
          uri: resolvedUri,
          isCutout: resolvedIsCutout,
          image_path: item?.image_path || null,
          cutout_image_url: item?.cutout_image_url || null,
          cutout_thumbnail_url: item?.cutout_thumbnail_url || null,
          cutout_display_url: item?.cutout_display_url || null,
          cutout_url: item?.cutout_url || null,
          image_url: item?.image_url || null,
          thumbnail_url: item?.thumbnail_url || null,
          display_image_url: item?.display_image_url || null,
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.border,
  },
});
