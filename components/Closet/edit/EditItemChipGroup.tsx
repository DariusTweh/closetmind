import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { typography } from '../../../lib/theme';

type ChipOption = string | { value: string; label: string };

export default function EditItemChipGroup({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<ChipOption>;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        const active = value === optionValue;
        return (
          <TouchableOpacity
            key={optionValue}
            activeOpacity={0.84}
            onPress={() => onChange(optionValue)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{optionLabel}</Text>
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
