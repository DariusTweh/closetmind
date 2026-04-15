import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../lib/theme';

type ActionButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
};

function ActionButton({
  label,
  icon,
  onPress,
  disabled = false,
  primary = false,
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
    >
      <Ionicons
        name={icon}
        size={17}
        color={primary ? '#fff' : disabled ? 'rgba(28, 28, 28, 0.52)' : colors.textPrimary}
        style={styles.buttonIcon}
      />
      <Text
        style={[
          styles.buttonText,
          primary ? styles.buttonTextPrimary : styles.buttonTextSecondary,
          disabled && styles.buttonTextDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type AddItemActionBarProps = {
  onCapture: () => void;
  onCameraRoll: () => void;
  onVerdict: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  verdictDisabled: boolean;
  loading?: boolean;
};

export default function AddItemActionBar({
  onCapture,
  onCameraRoll,
  onVerdict,
  onSave,
  saveDisabled,
  verdictDisabled,
  loading = false,
}: AddItemActionBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <ActionButton label="Capture" icon="camera-outline" onPress={onCapture} primary />
        <ActionButton label="Camera Roll" icon="images-outline" onPress={onCameraRoll} />
      </View>

      <View style={styles.row}>
        <ActionButton
          label="Verdict"
          icon="sparkles-outline"
          onPress={onVerdict}
          disabled={verdictDisabled || loading}
        />
        <ActionButton
          label={loading ? 'Saving...' : 'Save'}
          icon="checkmark-circle-outline"
          onPress={onSave}
          disabled={saveDisabled || loading}
          primary
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: '#f8f3ec',
    borderTopWidth: 1,
    borderTopColor: '#daddd8',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    borderRadius: radii.lg,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#423d38',
  },
  buttonSecondary: {
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#ded3c6',
  },
  buttonDisabled: {
    backgroundColor: '#eef0f2',
    borderColor: '#e9e0d5',
    opacity: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  buttonTextPrimary: {
    color: '#fff',
  },
  buttonTextSecondary: {
    color: colors.textPrimary,
  },
  buttonTextDisabled: {
    color: 'rgba(28, 28, 28, 0.52)',
  },
});
