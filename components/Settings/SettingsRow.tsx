import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../lib/theme';

export default function SettingsRow({
  label,
  description,
  value,
  onPress,
  danger = false,
  isLast = false,
  disabled = false,
}: {
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
  disabled?: boolean;
}) {
  const showChevron = !!onPress && !disabled;
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      disabled={!onPress || disabled}
      style={[styles.row, !isLast && styles.rowDivider, disabled && styles.disabled]}
    >
      <View style={styles.copy}>
        <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <View style={styles.trailing}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {showChevron ? <Ionicons name="chevron-forward" size={16} color="rgba(28, 28, 28, 0.52)" /> : null}
      </View>
    </TouchableOpacity>
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
    opacity: 0.7,
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
  labelDanger: {
    color: '#9e4a3e',
  },
  description: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#6f645a',
    fontFamily: typography.fontFamily,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    marginRight: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
  },
});
