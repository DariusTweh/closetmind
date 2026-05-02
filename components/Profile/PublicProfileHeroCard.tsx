import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../lib/theme';

export default function PublicProfileHeroCard({
  displayName,
  username,
  bio,
  avatarUrl,
  styleTags = [],
  isFollowing,
  isBlocked = false,
  isDemoProfile = false,
  onToggleFollow,
}: {
  displayName: string;
  username?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  styleTags?: string[];
  isFollowing: boolean;
  isBlocked?: boolean;
  isDemoProfile?: boolean;
  onToggleFollow: () => void;
}) {
  const cleanBio = String(bio || '').trim();
  const handle = username ? `@${String(username).trim()}` : 'No username yet';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>Public profile</Text>
        <TouchableOpacity
          activeOpacity={isBlocked ? 1 : 0.88}
          disabled={isBlocked}
          onPress={onToggleFollow}
          style={[
            styles.followButton,
            isFollowing && !isDemoProfile && styles.followButtonActive,
            isBlocked && styles.followButtonBlocked,
            isDemoProfile && styles.followButtonDemo,
          ]}
        >
          <Text
            style={[
              styles.followButtonText,
              isFollowing && !isDemoProfile && styles.followButtonTextActive,
              isBlocked && styles.followButtonTextBlocked,
              isDemoProfile && styles.followButtonTextDemo,
            ]}
          >
            {isDemoProfile ? 'Demo' : isBlocked ? 'Blocked' : isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.identityRow}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback} />
        )}

        <View style={styles.identityCopy}>
          <Text style={styles.displayName}>{displayName || 'Klozu member'}</Text>
          <Text style={styles.handle}>{handle}</Text>
        </View>
      </View>

      <Text style={[styles.bio, !cleanBio && styles.bioPlaceholder]}>
        {cleanBio || 'No bio yet'}
      </Text>

      {styleTags.length ? (
        <View style={styles.tagWrap}>
          {styleTags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  followButton: {
    minHeight: 42,
    paddingHorizontal: 16,
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
  followButtonBlocked: {
    backgroundColor: colors.surfaceContainer,
  },
  followButtonText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  followButtonTextActive: {
    color: colors.textOnAccent,
  },
  followButtonTextBlocked: {
    color: colors.textMuted,
  },
  followButtonDemo: {
    backgroundColor: colors.cardBackground,
  },
  followButtonTextDemo: {
    color: colors.textMuted,
  },
  identityRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identityCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  displayName: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  handle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  bio: {
    marginTop: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  bioPlaceholder: {
    color: colors.textMuted,
  },
  tagWrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  tagChipText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
});
