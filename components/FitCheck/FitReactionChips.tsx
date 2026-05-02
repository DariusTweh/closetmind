import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, typography } from '../../lib/theme';
import type { FitCheckReaction } from '../../types/fitCheck';

export default function FitReactionChips({
  reactions,
  onPressReaction,
  activeReactionLabels,
}: {
  reactions: FitCheckReaction[];
  onPressReaction?: (reaction: FitCheckReaction) => void;
  activeReactionLabels?: string[];
}) {
  const [localReactions, setLocalReactions] = useState<FitCheckReaction[]>(reactions);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(activeReactionLabels?.[0] || null);
  const hasExternalState = typeof onPressReaction === 'function' || Array.isArray(activeReactionLabels);

  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  useEffect(() => {
    if (Array.isArray(activeReactionLabels)) {
      setSelectedLabel(activeReactionLabels[0] || null);
    }
  }, [activeReactionLabels]);

  const displayedReactions = hasExternalState ? reactions : localReactions;
  const activeLabels = useMemo(
    () => (hasExternalState ? activeReactionLabels || [] : selectedLabel ? [selectedLabel] : []),
    [activeReactionLabels, hasExternalState, selectedLabel],
  );

  const handlePress = (target: FitCheckReaction) => {
    if (onPressReaction) {
      onPressReaction(target);
      return;
    }

    setLocalReactions((current) => {
      const previousLabel = selectedLabel;
      const nextLabel = previousLabel === target.label ? null : target.label;

      return current.map((reaction) => {
        let nextCount = reaction.count;
        if (previousLabel && reaction.label === previousLabel) {
          nextCount = Math.max(0, nextCount - 1);
        }
        if (nextLabel && reaction.label === nextLabel) {
          nextCount += 1;
        }
        return {
          ...reaction,
          count: nextCount,
        };
      });
    });

    setSelectedLabel((current) => (current === target.label ? null : target.label));
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.wrap}
    >
      {displayedReactions.map((reaction) => (
        <TouchableOpacity
          key={`${reaction.label}-${reaction.emoji}`}
          activeOpacity={0.88}
          onPress={() => handlePress(reaction)}
          style={[
            styles.chip,
            activeLabels.includes(reaction.label) && styles.chipActive,
          ]}
        >
          <Text style={styles.emoji}>{reaction.emoji}</Text>
          <Text
            style={[
              styles.label,
              activeLabels.includes(reaction.label) && styles.labelActive,
            ]}
          >
            {reaction.label}
          </Text>
          <Text
            style={[
              styles.count,
              activeLabels.includes(reaction.label) && styles.countActive,
            ]}
          >
            {reaction.count}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  emoji: {
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  labelActive: {
    color: colors.textOnAccent,
  },
  count: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  countActive: {
    color: colors.textOnAccent,
  },
});
