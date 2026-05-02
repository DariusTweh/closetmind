import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import FitActionModalShell from './FitActionModalShell';
import { colors, radii, typography } from '../../lib/theme';

export default function StyleNotesModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) setNote('');
  }, [visible]);

  const trimmed = note.trim();

  return (
    <FitActionModalShell
      visible={visible}
      title="Style Notes"
      subtitle="Drop a quick note on what works in the fit."
      onClose={onClose}
      footer={(
        <TouchableOpacity
          activeOpacity={trimmed ? 0.9 : 1}
          disabled={!trimmed}
          onPress={() => {
            onAdd(trimmed);
            setNote('');
          }}
          style={[styles.primaryButton, !trimmed && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>Add Style Note</Text>
        </TouchableOpacity>
      )}
    >
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Layer makes the fit cleaner."
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={140}
        style={styles.input}
      />
      <Text style={styles.counter}>{trimmed.length}/140</Text>
    </FitActionModalShell>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 140,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
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
