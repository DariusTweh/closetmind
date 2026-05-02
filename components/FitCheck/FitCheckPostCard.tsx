import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';
import type { FitCheckPost, FitCheckReaction } from '../../types/fitCheck';
import FitItemStrip from './FitItemStrip';
import FitReactionChips from './FitReactionChips';

const { width } = Dimensions.get('window');
const imageHeight = Math.min(470, width * 1.22);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function FitCheckPostCard({
  post,
  onPress,
  onPressComment,
  onPressMenu,
  onPressRecreate,
  eyebrow,
  showFollowButton = false,
  isFollowing = false,
  onToggleFollow,
  onPressProfile,
  onPressReaction,
  activeReactionLabels,
}: {
  post: FitCheckPost;
  onPress?: (post: FitCheckPost) => void;
  onPressComment?: (post: FitCheckPost) => void;
  onPressMenu?: (post: FitCheckPost) => void;
  onPressRecreate: (post: FitCheckPost) => void;
  eyebrow?: string;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onPressProfile?: (post: FitCheckPost) => void;
  onPressReaction?: (post: FitCheckPost, reaction: FitCheckReaction) => void;
  activeReactionLabels?: string[];
}) {
  const [saved, setSaved] = useState(Boolean(post.is_saved));
  const isDemoProfile = !UUID_RE.test(String(post.author_key || post.user_id || '').trim());
  const postMetaTags = [post.context, post.mood].map((value) => String(value || '').trim()).filter(Boolean).slice(0, 2);
  const hardFitReaction = post.reactions.find((reaction) => reaction.label === 'Hard Fit') || {
    label: 'Hard Fit',
    emoji: '🔥',
    count: 0,
  };

  useEffect(() => {
    setSaved(Boolean(post.is_saved));
  }, [post.id, post.is_saved]);

  const identityContent = (
    <>
      {post.avatar_url ? (
        <Image source={{ uri: post.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={styles.identityText}>
        <Text style={styles.username}>{post.username}</Text>
        <Text style={styles.timeAgo}>{post.time_ago}</Text>
        {postMetaTags.length ? (
          <View style={styles.postMetaTagRow}>
            {postMetaTags.map((tag) => (
              <View key={tag} style={styles.postMetaTagChip}>
                <Text style={styles.postMetaTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.card}>
      {eyebrow ? (
        <View style={styles.eyebrowChip}>
          <Text style={styles.eyebrowChipText}>{eyebrow}</Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        {onPressProfile ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onPressProfile(post)}
            style={styles.identityRow}
          >
            {identityContent}
          </TouchableOpacity>
        ) : (
          <View style={styles.identityRow}>{identityContent}</View>
        )}
        {showFollowButton && onToggleFollow ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onToggleFollow}
            style={[
              styles.followButton,
              isFollowing && !isDemoProfile && styles.followButtonActive,
              isDemoProfile && styles.followButtonDemo,
            ]}
          >
            <Text
              style={[
                styles.followText,
                isFollowing && !isDemoProfile && styles.followTextActive,
                isDemoProfile && styles.followTextDemo,
              ]}
            >
              {isDemoProfile ? 'Demo' : isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            hitSlop={10}
            onPress={() => {
              if (onPressMenu) {
                onPressMenu(post);
              } else if (onPress) {
                onPress(post);
              } else {
                Alert.alert('Open the fit detail for more options.');
              }
            }}
            style={styles.iconButton}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {onPress ? (
        <TouchableOpacity activeOpacity={0.97} onPress={() => onPress(post)} style={styles.bodyPressable}>
          <View style={styles.imageShell}>
            <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
            <View style={styles.weatherPill}>
              <Text style={styles.weatherText}>{post.weather}</Text>
            </View>
            <View style={styles.bottomShade} />
            <View style={styles.overlayCopy}>
              <Text style={styles.context}>{post.context}</Text>
              <Text style={styles.mood}>{post.mood}</Text>
            </View>
          </View>

          <Text style={styles.caption}>{post.caption}</Text>

          <View style={styles.piecesWrap}>
            <FitItemStrip items={post.items} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.bodyPressable}>
          <View style={styles.imageShell}>
            <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
            <View style={styles.weatherPill}>
              <Text style={styles.weatherText}>{post.weather}</Text>
            </View>
            <View style={styles.bottomShade} />
            <View style={styles.overlayCopy}>
              <Text style={styles.context}>{post.context}</Text>
              <Text style={styles.mood}>{post.mood}</Text>
            </View>
          </View>

          <Text style={styles.caption}>{post.caption}</Text>

          <View style={styles.piecesWrap}>
            <FitItemStrip items={post.items} />
          </View>
        </View>
      )}

      <FitReactionChips
        reactions={post.reactions}
        onPressReaction={onPressReaction ? (reaction) => onPressReaction(post, reaction) : undefined}
        activeReactionLabels={activeReactionLabels}
      />

      <View style={styles.actionRow}>
        <View style={styles.iconActions}>
          <Pressable
            onPress={() => {
              if (onPressReaction) {
                onPressReaction(post, hardFitReaction);
              } else {
                Alert.alert('Likes coming soon.');
              }
            }}
            style={styles.actionIcon}
          >
            <Ionicons
              name={activeReactionLabels?.includes('Hard Fit') ? 'heart' : 'heart-outline'}
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>
          <Pressable
            onPress={() => {
              if (onPressComment) {
                onPressComment(post);
              } else if (onPress) {
                onPress(post);
              } else {
                Alert.alert('Open the fit detail to leave a style note.');
              }
            }}
            style={styles.actionIcon}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={() => setSaved((current) => !current)} style={styles.actionIcon}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => onPressRecreate(post)} style={styles.recreateButton}>
          <Ionicons name="sparkles-outline" size={15} color={colors.textOnAccent} />
          <Text style={styles.recreateText} numberOfLines={1}>Recreate Fit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 32,
    padding: 20,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(30,30,30,0.12)',
    marginBottom: 34,
    ...shadows.card,
  },
  bodyPressable: {
    gap: 0,
  },
  eyebrowChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  eyebrowChipText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceContainer,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identityText: {
    gap: 2,
    flex: 1,
  },
  username: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  timeAgo: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  postMetaTagRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  postMetaTagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  postMetaTagText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  followText: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  followTextActive: {
    color: colors.textOnAccent,
  },
  followButtonDemo: {
    backgroundColor: colors.cardBackground,
  },
  followTextDemo: {
    color: colors.textMuted,
  },
  imageShell: {
    height: imageHeight,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    marginTop: 18,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  weatherPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(250, 250, 255, 0.9)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(28, 28, 28, 0.08)',
  },
  weatherText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  bottomShade: {
    ...StyleSheet.absoluteFillObject,
    top: '54%',
    backgroundColor: 'rgba(12, 12, 12, 0.3)',
  },
  overlayCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 4,
  },
  context: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  mood: {
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(250, 250, 255, 0.82)',
    fontFamily: typography.fontFamily,
  },
  caption: {
    marginTop: 18,
    fontSize: 18,
    lineHeight: 27,
    color: '#5F5F5F',
    fontFamily: typography.fontFamily,
  },
  piecesWrap: {
    marginTop: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: 22,
    rowGap: 12,
    paddingBottom: 4,
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 29,
    minHeight: 54,
    paddingHorizontal: 20,
    justifyContent: 'center',
    flex: 1,
    minWidth: 172,
  },
  recreateText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
