import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import FitActionModalShell from './FitActionModalShell';
import VisibilitySelector from './VisibilitySelector';
import { colors, radii, typography } from '../../lib/theme';
import type { FitCheckVisibility } from '../../types/fitCheck';

const VISIBILITY_OPTIONS: FitCheckVisibility[] = ['Friends', 'Followers', 'Public'];

export default function FitCheckPostVisibilityModal({
  visible,
  selected,
  loading = false,
  onClose,
  onSave,
}: {
  visible: boolean;
  selected: FitCheckVisibility;
  loading?: boolean;
  onClose: () => void;
  onSave: (value: FitCheckVisibility) => void;
}) {
  const [nextVisibility, setNextVisibility] = useState<FitCheckVisibility>(selected);

  useEffect(() => {
    if (visible) {
      setNextVisibility(selected);
    }
  }, [selected, visible]);

  return (
    <FitActionModalShell
      visible={visible}
      title="Change Visibility"
      subtitle="Control who can see this Fit Check post."
      onClose={onClose}
      footer={(
        <TouchableOpacity
          activeOpacity={loading ? 1 : 0.9}
          disabled={loading}
          onPress={() => onSave(nextVisibility)}
          style={styles.primaryButton}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>Save Visibility</Text>
          )}
        </TouchableOpacity>
      )}
    >
      <Text style={styles.label}>Who can see this fit</Text>
      <VisibilitySelector
        options={VISIBILITY_OPTIONS}
        selected={nextVisibility}
        onSelect={(value) => setNextVisibility(value as FitCheckVisibility)}
      />
    </FitActionModalShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
