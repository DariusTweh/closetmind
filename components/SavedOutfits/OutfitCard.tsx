import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, typography } from '../../lib/theme';
import OutfitMetaRow from './OutfitMetaRow';
import OutfitPreviewStrip from './OutfitPreviewStrip';

export default function OutfitCard({ outfit, onPress, onToggleFavorite }) {
  const previewItems = Array.isArray(outfit.resolvedItems)
    ? outfit.resolvedItems
    : Array.isArray(outfit.wardrobeItems)
      ? outfit.wardrobeItems
      : [];
  const itemCount = previewItems.length;
  const summary = [outfit.context, outfit.season ? String(outfit.season).charAt(0).toUpperCase() + String(outfit.season).slice(1) : null]
    .filter(Boolean)
    .join(' • ');
  const badges = [
    outfit.outfit_mode === 'travel' ? 'Travel' : null,
    outfit.activity_label ? outfit.activity_label : null,
    outfit.day_label ? outfit.day_label : null,
    outfit.source_kind === 'canvas' ? 'Canvas' : null,
    outfit.has_external_items ? 'Mixed Source' : null,
  ].filter(Boolean);

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={2}>
            {outfit.name || 'Untitled Fit'}
          </Text>

          <Pressable
            style={styles.heartButton}
            onPress={onToggleFavorite}
            hitSlop={10}
            pressRetentionOffset={10}
          >
            <Icon
              name={outfit.is_favorite ? 'heart' : 'heart-outline'}
              size={18}
              color={outfit.is_favorite ? '#2f2a26' : '#8e8479'}
            />
          </Pressable>
        </View>

        {summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}

        {badges.length ? (
          <View style={styles.badgeRow}>
            {badges.map((badge) => (
              <View key={badge} style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <OutfitPreviewStrip items={previewItems} />

        <View style={styles.metaRow}>
          <OutfitMetaRow
            itemCount={itemCount}
            season={outfit.season}
            isFavorite={outfit.is_favorite}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbd3c9',
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: '#1e1916',
    fontFamily: 'Georgia',
    paddingRight: spacing.md,
  },
  heartButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f0e7dd',
    borderWidth: 1,
    borderColor: '#e4d7ca',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5e4030',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: typography.fontFamily,
  },
  metaRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5ddd3',
  },
});
