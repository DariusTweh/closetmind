import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../lib/theme';
import FilterChip from './FilterChip';

export type SavedOutfitsContentMode = 'All' | 'Favorites' | 'Travel';

const MODES: SavedOutfitsContentMode[] = ['All', 'Favorites', 'Travel'];

export default function SavedOutfitsTabBar({
  activeMode,
  onChange,
}: {
  activeMode: SavedOutfitsContentMode;
  onChange: (mode: SavedOutfitsContentMode) => void;
}) {
  return (
    <View style={styles.row}>
      {MODES.map((mode) => (
        <FilterChip
          key={mode}
          label={mode}
          active={activeMode === mode}
          onPress={() => onChange(mode)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
