import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';
import type { OutfitCanvasReasonItem } from './types';

type WhyItWorksPanelProps = {
  title?: string;
  summary?: string | null;
  items?: OutfitCanvasReasonItem[];
  activeItemId?: string | null;
  onChangeActiveItemId?: (itemId: string | null) => void;
};

export default function WhyItWorksPanel({
  title = 'Why this works',
  summary,
  items = [],
  activeItemId,
  onChangeActiveItemId,
}: WhyItWorksPanelProps) {
  const [internalActiveItemId, setInternalActiveItemId] = useState<string | null>(null);
  const resolvedActiveItemId = activeItemId !== undefined ? activeItemId : internalActiveItemId;
  const activeItem = useMemo(
    () => (items || []).find((item) => item.id === resolvedActiveItemId) || null,
    [items, resolvedActiveItemId],
  );

  const setNextActiveItem = (itemId: string) => {
    const nextValue = resolvedActiveItemId === itemId ? null : itemId;
    if (onChangeActiveItemId) {
      onChangeActiveItemId(nextValue);
      return;
    }
    setInternalActiveItemId(nextValue);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}

      {items.length ? (
        <View style={styles.chipRow}>
          {items.map((item) => {
            const selected = item.id === resolvedActiveItemId;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() => setNextActiveItem(item.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {activeItem?.reason ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>
            {activeItem.role ? `${activeItem.role}${activeItem.locked ? ' · Locked' : ''}` : activeItem.locked ? 'Locked item' : 'Item note'}
          </Text>
          <Text style={styles.reasonText}>{activeItem.reason}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  summary: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  chipTextSelected: {
    color: colors.textOnAccent,
  },
  reasonCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  reasonText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});
