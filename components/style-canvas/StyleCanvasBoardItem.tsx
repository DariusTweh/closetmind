import React, { useEffect } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { CanvasItem } from '../../types/styleCanvas';
import { colors } from '../../lib/theme';
import { getCanvasItemDisplayUri } from '../../utils/styleCanvasAdapters';

type StyleCanvasBoardItemProps = {
  item: CanvasItem;
  selected: boolean;
  stageWidth: number;
  stageHeight: number;
  onSelect?: (itemId: string) => void;
  onTransformEnd?: (itemId: string, patch: Partial<CanvasItem>) => void;
  interactive?: boolean;
  showLockedBadge?: boolean;
  onImageLoadEnd?: (itemId: string) => void;
};

const BASE_ITEM_WIDTH = 146;
const BASE_ITEM_HEIGHT = 196;
const MIN_SCALE = 0.58;
const MAX_SCALE = 2.3;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export default function StyleCanvasBoardItem({
  item,
  selected,
  stageWidth,
  stageHeight,
  onSelect,
  onTransformEnd,
  interactive = true,
  showLockedBadge = true,
  onImageLoadEnd,
}: StyleCanvasBoardItemProps) {
  const translateX = useSharedValue(item.x);
  const translateY = useSharedValue(item.y);
  const scale = useSharedValue(item.scale);
  const rotation = useSharedValue(item.rotation);

  const panStartX = useSharedValue(item.x);
  const panStartY = useSharedValue(item.y);
  const pinchStartScale = useSharedValue(item.scale);
  const rotationStart = useSharedValue(item.rotation);
  const selectedProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    translateX.value = item.x;
    translateY.value = item.y;
    scale.value = item.scale;
    rotation.value = item.rotation;
  }, [item.rotation, item.scale, item.x, item.y, rotation, scale, translateX, translateY]);

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, { duration: 160 });
  }, [selected, selectedProgress]);

  const tapGesture = Gesture.Tap()
    .maxDuration(220)
    .onEnd(() => {
      if (onSelect) {
        runOnJS(onSelect)(item.id);
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(!item.locked)
    .onBegin(() => {
      if (onSelect) {
        runOnJS(onSelect)(item.id);
      }
    })
    .onStart(() => {
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const nextX = panStartX.value + event.translationX;
      const nextY = panStartY.value + event.translationY;
      const maxX = Math.max(stageWidth - BASE_ITEM_WIDTH, BASE_ITEM_WIDTH * -0.2);
      const maxY = Math.max(stageHeight - BASE_ITEM_HEIGHT, BASE_ITEM_HEIGHT * -0.2);

      translateX.value = clamp(nextX, -BASE_ITEM_WIDTH * 0.3, maxX);
      translateY.value = clamp(nextY, -BASE_ITEM_HEIGHT * 0.3, maxY);
    })
    .onEnd(() => {
      if (onTransformEnd) {
        runOnJS(onTransformEnd)(item.id, {
          x: translateX.value,
          y: translateY.value,
        });
      }
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(!item.locked)
    .onBegin(() => {
      if (onSelect) {
        runOnJS(onSelect)(item.id);
      }
    })
    .onStart(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clamp(pinchStartScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      if (onTransformEnd) {
        runOnJS(onTransformEnd)(item.id, {
          scale: scale.value,
        });
      }
    });

  const rotationGesture = Gesture.Rotation()
    .enabled(!item.locked)
    .onBegin(() => {
      if (onSelect) {
        runOnJS(onSelect)(item.id);
      }
    })
    .onStart(() => {
      rotationStart.value = rotation.value;
    })
    .onUpdate((event) => {
      rotation.value = rotationStart.value + event.rotation;
    })
    .onEnd(() => {
      if (onTransformEnd) {
        runOnJS(onTransformEnd)(item.id, {
          rotation: rotation.value,
        });
      }
    });

  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture, pinchGesture, rotationGesture);

  const animatedStyle = useAnimatedStyle<ViewStyle>(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation.value}rad` },
        { scale: scale.value },
      ] as ViewStyle['transform'],
      borderColor: `rgba(28, 28, 28, ${selectedProgress.value * 0.18})`,
      backgroundColor: `rgba(255, 255, 255, ${selectedProgress.value * 0.08})`,
      shadowOpacity: 0,
    };
  });

  const imageUri = getCanvasItemDisplayUri(item);
  if (!imageUri) return null;

  const content = (
    <Animated.View
      style={[
        styles.itemFrame,
        animatedStyle,
        {
          zIndex: item.zIndex,
        },
      ]}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="contain"
        onLoadEnd={() => onImageLoadEnd?.(item.id)}
        onError={() => onImageLoadEnd?.(item.id)}
      />
      {item.locked && showLockedBadge ? (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={11} color={colors.textOnAccent} />
        </View>
      ) : null}
    </Animated.View>
  );

  if (!interactive) {
    return content;
  }

  return <GestureDetector gesture={composedGesture}>{content}</GestureDetector>;
}

const styles = StyleSheet.create({
  itemFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BASE_ITEM_WIDTH,
    height: BASE_ITEM_HEIGHT,
    borderRadius: 18,
    borderWidth: 1.1,
    backgroundColor: 'transparent',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
