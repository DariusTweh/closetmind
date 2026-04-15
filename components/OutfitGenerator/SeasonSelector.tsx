import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { spacing, typography } from '../../lib/theme';

type SeasonSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All'];

export default function SeasonSelector({ value, onChange }: SeasonSelectorProps) {
  const current = String(value || '').toLowerCase();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Season</Text>
      <View style={styles.row}>
        {SEASONS.map((season) => {
          const nextValue = season.toLowerCase();
          const isSelected = current === nextValue;

          return (
            <TouchableOpacity
              key={season}
              activeOpacity={0.86}
              onPress={() => onChange(nextValue)}
              style={[styles.pill, isSelected && styles.pillSelected]}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {season}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8a7d71',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontFamily: typography.fontFamily,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    minHeight: 33,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    marginRight: 6,
    marginBottom: 6,
  },
  pillSelected: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#504840',
    fontFamily: typography.fontFamily,
  },
  pillTextSelected: {
    color: '#fafaff',
  },
});
