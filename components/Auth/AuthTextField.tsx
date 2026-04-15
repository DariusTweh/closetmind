import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

type AuthTextFieldProps = TextInputProps & {
  label: string;
};

export default function AuthTextField({
  label,
  style,
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
});
