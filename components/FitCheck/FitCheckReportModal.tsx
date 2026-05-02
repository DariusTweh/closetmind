import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import FitActionModalShell from './FitActionModalShell';
import {
  FIT_CHECK_REPORT_REASONS,
  type FitCheckReportReason,
} from '../../lib/fitCheckSafetyService';
import { colors, radii, typography } from '../../lib/theme';

export default function FitCheckReportModal({
  visible,
  loading = false,
  targetLabel,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  loading?: boolean;
  targetLabel: 'post' | 'profile';
  onClose: () => void;
  onSubmit: (payload: { reason: FitCheckReportReason; details: string }) => void;
}) {
  const [reason, setReason] = useState<FitCheckReportReason>('Spam');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!visible) {
      setReason('Spam');
      setDetails('');
    }
  }, [visible]);

  return (
    <FitActionModalShell
      visible={visible}
      title={targetLabel === 'profile' ? 'Report profile' : 'Report post'}
      subtitle={
        targetLabel === 'profile'
          ? 'Tell us what feels off about this profile.'
          : 'Tell us what feels off about this Fit Check post.'
      }
      onClose={onClose}
      footer={(
        <TouchableOpacity
          activeOpacity={loading ? 1 : 0.9}
          disabled={loading}
          onPress={() => onSubmit({ reason, details: details.trim() })}
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'Submitting…' : 'Submit Report'}</Text>
        </TouchableOpacity>
      )}
    >
      <View style={styles.reasonWrap}>
        {FIT_CHECK_REPORT_REASONS.map((option) => {
          const active = option === reason;
          return (
            <TouchableOpacity
              key={option}
              activeOpacity={0.88}
              onPress={() => setReason(option)}
              style={[styles.reasonChip, active && styles.reasonChipActive]}
            >
              <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>Details</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder="Add anything that would help explain the issue."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={240}
          style={styles.input}
        />
        <Text style={styles.counter}>{details.trim().length}/240</Text>
      </View>
    </FitActionModalShell>
  );
}

const styles = StyleSheet.create({
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
  },
  reasonChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  reasonTextActive: {
    color: colors.textOnAccent,
  },
  inputWrap: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
