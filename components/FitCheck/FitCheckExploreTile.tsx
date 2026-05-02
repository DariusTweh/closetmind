import React from 'react';
import {
  StyleProp,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, typography } from '../../lib/theme';
import type { FitCheckPost } from '../../types/fitCheck';

export default function FitCheckExploreTile({
  post,
  eyebrow,
  style,
  onPress,
  onPressRecreate,
  onPressProfile,
}: {
  post: FitCheckPost;
  eyebrow?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: (post: FitCheckPost) => void;
  onPressRecreate?: (post: FitCheckPost) => void;
  onPressProfile?: (post: FitCheckPost) => void;
}) {
  const content = (
    <>
      <View style={styles.imageShell}>
        <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />

        {eyebrow ? (
          <View style={styles.eyebrowChip}>
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
          </View>
        ) : null}

        <View style={styles.weatherPill}>
          <Text style={styles.weatherText}>{post.weather}</Text>
        </View>

        <View style={styles.overlay} />
        <View style={styles.overlayCopy}>
          <Text style={styles.context} numberOfLines={1}>
            {post.context}
          </Text>
          {onPressProfile ? (
            <TouchableOpacity activeOpacity={0.88} onPress={() => onPressProfile(post)}>
              <Text style={styles.username} numberOfLines={1}>
                @{post.username}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.username} numberOfLines={1}>
              @{post.username}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.caption} numberOfLines={2}>
        {post.caption}
      </Text>

      <View style={styles.footerRow}>
        {post.style_tags?.[0] ? (
          <View style={styles.tagChip}>
            <Text style={styles.tagText}>{post.style_tags[0]}</Text>
          </View>
        ) : (
          <View />
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onPressRecreate?.(post)}
          style={styles.recreateButton}
        >
          <Ionicons name="sparkles-outline" size={12} color={colors.textPrimary} />
          <Text style={styles.recreateText}>Recreate</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.92} onPress={() => onPress(post)} style={[styles.card, style]}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageShell: {
    height: 218,
    backgroundColor: colors.surfaceContainer,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  eyebrowChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(250, 250, 255, 0.92)',
  },
  eyebrowText: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  weatherPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(250, 250, 255, 0.92)',
  },
  weatherText: {
    fontSize: 10.5,
    lineHeight: 13,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: '56%',
    backgroundColor: 'rgba(10, 10, 10, 0.28)',
  },
  overlayCopy: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  context: {
    fontSize: 17,
    lineHeight: 20,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  username: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 15,
    color: 'rgba(250, 250, 255, 0.9)',
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  caption: {
    paddingHorizontal: 14,
    paddingTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    minHeight: 50,
  },
  footerRow: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
  },
  tagText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  recreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  recreateText: {
    fontSize: 11.5,
    lineHeight: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
