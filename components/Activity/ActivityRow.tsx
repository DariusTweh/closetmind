import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';
import type { FitCheckActivityEvent } from '../../types/fitCheck';

function getEventCopy(event: FitCheckActivityEvent) {
  switch (event.event_type) {
    case 'follow':
      return 'followed you.';
    case 'reaction':
      return event.metadata?.reaction_label
        ? `reacted ${String(event.metadata.reaction_label)} to your fit.`
        : 'reacted to your fit.';
    case 'style_note':
      return 'left a style note on your fit.';
    case 'save':
      return 'saved your fit.';
    case 'recreate':
      return 'recreated your fit.';
    case 'fit_check_posted':
      return event.actor_id === event.recipient_id ? 'posted a Fit Check. It is live now.' : 'posted today.';
    case 'daily_prompt':
      return 'Fit Check is live today.';
    default:
      return 'interacted with your fit.';
  }
}

export default function ActivityRow({
  event,
  onPress,
}: {
  event: FitCheckActivityEvent;
  onPress: () => void;
}) {
  const eventCopy = useMemo(() => getEventCopy(event), [event]);
  const actorName = event.actor_id === event.recipient_id && event.event_type === 'fit_check_posted'
    ? 'You'
    : event.actor_username;

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
      {event.actor_avatar_url ? (
        <Image source={{ uri: event.actor_avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={styles.copyWrap}>
        <Text style={styles.message} numberOfLines={3}>
          <Text style={styles.actor}>{actorName} </Text>
          <Text>{eventCopy}</Text>
        </Text>
        {event.metadata?.note_preview ? (
          <Text style={styles.notePreview} numberOfLines={2}>
            “{String(event.metadata.note_preview)}”
          </Text>
        ) : null}
        <Text style={styles.timeAgo}>{event.time_ago}</Text>
      </View>
      {event.post_thumbnail_url ? (
        <Image source={{ uri: event.post_thumbnail_url }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}>
          {!event.read_at ? <View style={styles.unreadDot} /> : null}
        </View>
      )}
      {event.post_thumbnail_url && !event.read_at ? <View style={styles.readBadge} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.card,
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
  copyWrap: {
    flex: 1,
    gap: 6,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  actor: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  notePreview: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  timeAgo: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
  },
  thumbPlaceholder: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  readBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
});
