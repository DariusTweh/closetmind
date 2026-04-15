import React, { useEffect, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { invalidatePrivateMediaUrlCache, resolvePrivateMediaUrl } from '../../lib/privateMedia';
import { colors } from '../../lib/theme';

type WardrobeItemImageProps = {
  item: {
    cutout_url?: string | null;
    image_url?: string | null;
    image_path?: string | null;
  };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
};

const WARDROBE_MEDIA_BUCKET = 'clothes';

export default function WardrobeItemImage({
  item,
  style,
  resizeMode = 'cover',
}: WardrobeItemImageProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(
    item?.cutout_url || (item?.image_path ? null : item?.image_url || null)
  );
  const [refreshTick, setRefreshTick] = useState(0);
  const [hasRetried, setHasRetried] = useState(false);

  useEffect(() => {
    setResolvedUri(item?.cutout_url || (item?.image_path ? null : item?.image_url || null));
    setHasRetried(false);
  }, [item?.cutout_url, item?.image_path, item?.image_url]);

  useEffect(() => {
    let cancelled = false;

    const resolveUri = async () => {
      if (item?.cutout_url) {
        if (!cancelled) {
          setResolvedUri(item.cutout_url);
        }
        return;
      }

      const nextUri = await resolvePrivateMediaUrl({
        path: item?.image_path,
        legacyUrl: item?.image_url,
        bucket: WARDROBE_MEDIA_BUCKET,
        preferBackendSigner: true,
      }).catch(() => item?.image_url || null);

      if (!cancelled) {
        if (!nextUri) {
          console.warn('WardrobeItemImage failed to resolve URI:', {
            image_path: item?.image_path || null,
            image_url: item?.image_url || null,
          });
        }
        setResolvedUri(nextUri || item?.image_url || null);
      }
    };

    resolveUri();

    return () => {
      cancelled = true;
    };
  }, [item?.cutout_url, item?.image_path, item?.image_url, refreshTick]);

  if (!resolvedUri) {
    return <View style={[style, styles.placeholder]} />;
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      resizeMode={resizeMode}
      onError={(event) => {
        if (item?.image_path && !hasRetried) {
          invalidatePrivateMediaUrlCache({
            path: item?.image_path,
            legacyUrl: item?.image_url,
            bucket: WARDROBE_MEDIA_BUCKET,
          });
          setHasRetried(true);
          setResolvedUri(null);
          setRefreshTick((value) => value + 1);
          return;
        }

        console.warn('WardrobeItemImage failed to load image:', {
          uri: resolvedUri,
          image_path: item?.image_path || null,
          image_url: item?.image_url || null,
          error: event?.nativeEvent,
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
