import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows, spacing, typography } from '../../lib/theme';

export type FitCheckDropStory = {
  id: string;
  username: string;
  avatar_url: string;
  posted: boolean;
  seen?: boolean;
  isCurrentUser?: boolean;
  isRealUser?: boolean;
};

export default function FitCheckStoriesRow({
  stories,
  hasPostedToday,
  currentUserAvatarUrl,
  emptyState,
  onPressYourTurn,
  onPressStory,
  onLongPressStory,
}: {
  stories: FitCheckDropStory[];
  hasPostedToday: boolean;
  currentUserAvatarUrl?: string | null;
  emptyState?: {
    title: string;
    buttonLabel: string;
    onPress: () => void;
  } | null;
  onPressYourTurn: () => void;
  onPressStory: (story: FitCheckDropStory) => void;
  onLongPressStory?: (story: FitCheckDropStory) => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Today&apos;s Drops</Text>
      </View>

      {emptyState ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <TouchableOpacity activeOpacity={0.88} onPress={emptyState.onPress} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>{emptyState.buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <TouchableOpacity activeOpacity={0.9} onPress={onPressYourTurn} style={styles.storyWrap}>
            <View style={[styles.avatarShell, styles.currentUserShell, hasPostedToday && styles.avatarShellSeen]}>
              {hasPostedToday ? (
                currentUserAvatarUrl ? (
                  <Image source={{ uri: currentUserAvatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )
              ) : (
                <>
                  <Text style={styles.yourTurnText}>Your turn</Text>
                  <View style={styles.plusBadge}>
                    <Ionicons name="add" size={14} color={colors.textOnAccent} />
                  </View>
                </>
              )}
            </View>
            <Text style={styles.storyLabel}>{hasPostedToday ? 'You' : 'Post'}</Text>
          </TouchableOpacity>

          {stories.map((story) => (
            <TouchableOpacity
              key={story.id}
              activeOpacity={0.9}
              style={styles.storyWrap}
              onPress={() => onPressStory(story)}
              onLongPress={story.isRealUser ? () => onLongPressStory?.(story) : undefined}
            >
              <View
                style={[
                  styles.avatarShell,
                  story.posted ? styles.avatarShellActive : styles.avatarShellDimmed,
                  story.seen && styles.avatarShellSeen,
                ]}
              >
                {story.avatar_url ? (
                  <Image source={{ uri: story.avatar_url }} style={[styles.avatar, !story.posted && styles.avatarDimmed]} />
                ) : (
                  <View style={[styles.avatarPlaceholder, !story.posted && styles.avatarDimmed]} />
                )}
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {story.username}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  headerRow: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  content: {
    paddingRight: spacing.lg,
    paddingBottom: 8,
    gap: 12,
  },
  storyWrap: {
    width: 70,
    alignItems: 'center',
    gap: 6,
  },
  avatarShell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2.5,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: 'rgba(30,30,30,0.12)',
    ...shadows.card,
  },
  avatarShellActive: {
    borderColor: '#ba7f54',
    backgroundColor: '#F1EBDD',
  },
  avatarShellSeen: {
    backgroundColor: colors.surfaceContainer,
    borderColor: 'rgba(30,30,30,0.08)',
  },
  avatarShellDimmed: {
    backgroundColor: colors.surfaceContainer,
    borderColor: 'rgba(30,30,30,0.08)',
  },
  currentUserShell: {
    backgroundColor: '#F1EBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 29.5,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 29.5,
    backgroundColor: colors.surfaceContainer,
  },
  avatarDimmed: {
    opacity: 0.42,
  },
  yourTurnText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    maxWidth: 42,
    textAlign: 'center',
  },
  youLabel: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  plusBadge: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#FAFAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  emptyButton: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
