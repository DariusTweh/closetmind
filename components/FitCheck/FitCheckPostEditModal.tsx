import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import FitActionModalShell from './FitActionModalShell';
import { colors, radii, typography } from '../../lib/theme';

type FitCheckPostEditValues = {
  caption: string;
  context: string;
  weatherLabel: string;
  mood: string;
};

export default function FitCheckPostEditModal({
  visible,
  initialValues,
  loading = false,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialValues: FitCheckPostEditValues;
  loading?: boolean;
  onClose: () => void;
  onSave: (values: FitCheckPostEditValues) => void;
}) {
  const [caption, setCaption] = useState(initialValues.caption);
  const [context, setContext] = useState(initialValues.context);
  const [weatherLabel, setWeatherLabel] = useState(initialValues.weatherLabel);
  const [mood, setMood] = useState(initialValues.mood);

  useEffect(() => {
    if (!visible) return;
    setCaption(initialValues.caption);
    setContext(initialValues.context);
    setWeatherLabel(initialValues.weatherLabel);
    setMood(initialValues.mood);
  }, [initialValues.caption, initialValues.context, initialValues.mood, initialValues.weatherLabel, visible]);

  const isDisabled =
    loading ||
    !caption.trim() ||
    !context.trim() ||
    !weatherLabel.trim() ||
    !mood.trim();

  return (
    <FitActionModalShell
      visible={visible}
      title="Edit Details"
      subtitle="Update the caption and context for this Fit Check."
      onClose={onClose}
      footer={(
        <TouchableOpacity
          activeOpacity={isDisabled ? 1 : 0.9}
          disabled={isDisabled}
          onPress={() =>
            onSave({
              caption: caption.trim(),
              context: context.trim(),
              weatherLabel: weatherLabel.trim(),
              mood: mood.trim(),
            })
          }
          style={[styles.primaryButton, isDisabled && styles.primaryButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      )}
    >
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Caption</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Simple fit for class today"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={220}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Context</Text>
        <TextInput
          value={context}
          onChangeText={setContext}
          placeholder="Campus"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Weather</Text>
        <TextInput
          value={weatherLabel}
          onChangeText={setWeatherLabel}
          placeholder="72°F Sunny"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Mood</Text>
        <TextInput
          value={mood}
          onChangeText={setMood}
          placeholder="Chill"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          style={styles.input}
        />
      </View>
    </FitActionModalShell>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 10,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 56,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  textArea: {
    minHeight: 132,
    textAlignVertical: 'top',
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
