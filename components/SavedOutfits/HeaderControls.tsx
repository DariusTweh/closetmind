import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { spacing } from '../../lib/theme';
import FilterChip from './FilterChip';
import SearchField from './SearchField';

const FILTERS = ['All', 'Favorites', 'Spring', 'Summer', 'Fall', 'Winter'];

export default function HeaderControls({
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  children,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  activeFilter: string;
  setActiveFilter: (value: any) => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      {children ? <View style={styles.extraContent}>{children}</View> : null}

      <SearchField value={searchQuery} onChangeText={setSearchQuery} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(filter => {
          return (
            <FilterChip
              key={filter}
              label={filter}
              active={activeFilter === filter}
              onPress={() => setActiveFilter(filter)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  extraContent: {
    marginBottom: spacing.xs,
  },
  filterScroll: {
    marginTop: spacing.sm,
  },
  filterRow: {
    paddingRight: spacing.md,
  },
});
