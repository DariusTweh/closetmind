import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { typography } from '../../../lib/theme';

export default function EditItemChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.84}
            onPress={() => onChange(option)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#504840',
    fontFamily: typography.fontFamily,
  },
  chipTextActive: {
    color: '#fafaff',
  },
});
