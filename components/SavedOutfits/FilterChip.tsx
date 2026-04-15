import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { typography } from '../../lib/theme';

export default function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#5a5148',
    fontFamily: typography.fontFamily,
  },
  labelActive: {
    color: '#fafaff',
  },
});
