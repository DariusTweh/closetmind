import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { spacing, typography } from '../../lib/theme';

type QuickPickChipsProps = {
  label: string;
  options: string[];
  selectedValue: string | string[] | null;
  onSelect: (value: string | string[]) => void;
  multiSelect?: boolean;
  horizontal?: boolean;
};

export default function QuickPickChips({
  label,
  options,
  selectedValue,
  onSelect,
  multiSelect = false,
  horizontal = false,
}: QuickPickChipsProps) {
  const selectedList = Array.isArray(selectedValue)
    ? selectedValue.map((entry) => String(entry).toLowerCase())
    : [String(selectedValue || '').toLowerCase()];

  const content = (
    <>
      {options.map((option) => {
        const isSelected = selectedList.includes(option.toLowerCase());

        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.86}
            onPress={() => {
              if (!multiSelect) {
                onSelect(option);
                return;
              }

              const next = new Set(selectedList);
              if (isSelected) {
                next.delete(option.toLowerCase());
              } else {
                next.add(option.toLowerCase());
              }
              onSelect(Array.from(next));
            }}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8a7d71',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  horizontalRow: {
    paddingRight: spacing.md,
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    marginRight: 6,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#211d1a',
    borderColor: '#211d1a',
  },
  chipText: {
    color: '#504840',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  chipTextSelected: {
    color: '#fafaff',
  },
});
