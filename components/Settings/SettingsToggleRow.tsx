import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { typography } from '../../lib/theme';

export default function SettingsToggleRow({
  label,
  description,
  value,
  onValueChange,
  isLast = false,
  disabled = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  isLast?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowDivider, disabled && styles.disabled]}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#d7cfc4', true: '#7f8b73' }}
        thumbColor="#fafaff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7dfd5',
  },
  disabled: {
    opacity: 0.6,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  description: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#6f645a',
    fontFamily: typography.fontFamily,
  },
});
