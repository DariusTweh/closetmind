import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';
import OutfitPreviewStrip from '../SavedOutfits/OutfitPreviewStrip';

export default function FeaturedFitCard({
  fit,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableMoveUp,
  disableMoveDown,
}: {
  fit: any;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  const outfit = fit?.outfit || {};
  const previewItems = Array.isArray(outfit?.resolvedItems) ? outfit.resolvedItems : [];
  const meta = [outfit?.context, outfit?.season].filter(Boolean).join(' • ');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Featured fit</Text>
          <Text style={styles.title} numberOfLines={2}>
            {outfit?.name || 'Untitled Fit'}
          </Text>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionsColumn}>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={disableMoveUp}
            onPress={onMoveUp}
            style={[styles.iconButton, disableMoveUp && styles.iconButtonDisabled]}
          >
            <Ionicons name="arrow-up-outline" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={disableMoveDown}
            onPress={onMoveDown}
            style={[styles.iconButton, disableMoveDown && styles.iconButtonDisabled]}
          >
            <Ionicons name="arrow-down-outline" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.84} onPress={onRemove} style={styles.iconButton}>
            <Ionicons name="close-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.previewWrap}>
        <OutfitPreviewStrip items={previewItems} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg - 2,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  meta: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  actionsColumn: {
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.38,
  },
  previewWrap: {
    marginTop: spacing.md,
  },
});
