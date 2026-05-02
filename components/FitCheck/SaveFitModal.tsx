import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FitActionModalShell from './FitActionModalShell';
import { colors, radii, typography } from '../../lib/theme';
import type { FitCheckBoardOption } from '../../types/fitCheck';

const SAVE_OPTIONS = ['Saved Fits', 'Campus Fits', 'Date Night', 'Travel Looks'];

export default function SaveFitModal({
  visible,
  initialSelection,
  options,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialSelection?: string | null;
  options?: FitCheckBoardOption[];
  onClose: () => void;
  onSave: (collection: FitCheckBoardOption) => void;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(initialSelection || null);
  const renderedOptions: FitCheckBoardOption[] =
    options?.length
      ? options
      : SAVE_OPTIONS.map((title) => ({
          title,
        }));

  useEffect(() => {
    if (visible) {
      setSelectedOption(initialSelection || null);
    }
  }, [initialSelection, visible]);

  return (
    <FitActionModalShell
      visible={visible}
      title="Save this fit"
      subtitle="Keep it for later or organize it into a board."
      onClose={onClose}
      footer={(
        <TouchableOpacity
          activeOpacity={selectedOption ? 0.9 : 1}
          disabled={!selectedOption}
          onPress={() => {
            const matched = renderedOptions.find((option) => option.title === selectedOption);
            if (matched) onSave(matched);
          }}
          style={[styles.primaryButton, !selectedOption && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>Save Fit</Text>
        </TouchableOpacity>
      )}
    >
      {renderedOptions.map((option) => {
        const isActive = selectedOption === option.title;
        return (
          <TouchableOpacity
            key={`${option.id || option.title}`}
            activeOpacity={0.88}
            onPress={() => setSelectedOption(option.title)}
            style={[styles.optionCard, isActive && styles.optionCardActive]}
          >
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>
                {option.subtitle
                  ? option.subtitle
                  : option.title === 'Saved Fits'
                  ? 'Quick access for fits you want to revisit.'
                  : `Store this fit inside ${option.title.toLowerCase()}.`}
              </Text>
            </View>
            {isActive ? (
              <Ionicons name="checkmark-circle" size={20} color={colors.textPrimary} />
            ) : (
              <Ionicons name="ellipse-outline" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        );
      })}
    </FitActionModalShell>
  );
}

const styles = StyleSheet.create({
  optionCard: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.accentSoft,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  optionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
