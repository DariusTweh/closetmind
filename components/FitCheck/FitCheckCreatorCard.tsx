import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';
import type { FitCheckCreator } from '../../types/fitCheck';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function FitCheckCreatorCard({
  creator,
  isFollowing,
  onToggleFollow,
  fullWidth = false,
  onPressProfile,
}: {
  creator: FitCheckCreator;
  isFollowing: boolean;
  onToggleFollow: () => void;
  fullWidth?: boolean;
  onPressProfile?: (creator: FitCheckCreator) => void;
}) {
  const isDemoProfile = !UUID_RE.test(String(creator.id || '').trim());
  const hasDisplayName =
    Boolean(String(creator.display_name || '').trim()) &&
    String(creator.display_name || '').trim().toLowerCase() !==
      String(creator.username || '').trim().toLowerCase();

  const identityBlock = (
    <>
      <View style={styles.identityRow}>
        {creator.avatar_url ? (
          <Image source={{ uri: creator.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View style={styles.copyWrap}>
          {hasDisplayName ? (
            <>
              <Text style={styles.displayName} numberOfLines={1}>
                {creator.display_name}
              </Text>
              <Text style={styles.handle} numberOfLines={1}>
                @{creator.username}
              </Text>
            </>
          ) : (
            <Text style={styles.username} numberOfLines={1}>
              {creator.username}
            </Text>
          )}
          {creator.bio ? (
            <Text style={styles.bio} numberOfLines={3}>
              {creator.bio}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.tagWrap}>
        {creator.style_tags.map((tag) => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.card, fullWidth && styles.cardFullWidth]}>
      <View style={styles.topRow}>
        <View style={styles.eyebrowWrap}>
          <Text style={styles.eyebrow} numberOfLines={1}>
            {creator.label || 'Creator'}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onToggleFollow}
          style={[
            styles.followButton,
            isFollowing && !isDemoProfile && styles.followButtonActive,
            isDemoProfile && styles.demoButton,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.followText,
              isFollowing && !isDemoProfile && styles.followTextActive,
              isDemoProfile && styles.demoText,
            ]}
          >
            {isDemoProfile ? 'Demo' : isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>

      {onPressProfile ? (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onPressProfile(creator)}
          style={styles.identityPressable}
        >
          {identityBlock}
        </TouchableOpacity>
      ) : (
        <View style={styles.identityPressable}>{identityBlock}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    padding: 18,
    ...shadows.card,
  },
  cardFullWidth: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  eyebrowWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
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
    flexShrink: 0,
    maxWidth: 138,
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
  identityPressable: {
    marginTop: 16,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainer,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  displayName: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  handle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  bio: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  demoButton: {
    backgroundColor: colors.cardBackground,
  },
  demoText: {
    color: colors.textMuted,
  },
  tagWrap: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
});
