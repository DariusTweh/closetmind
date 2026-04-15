import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { spacing, typography } from '../../lib/theme';
import FilterChip from './FilterChip';
import SearchField from './SearchField';

const FILTERS = ['All', 'Favorites', 'Spring', 'Summer', 'Fall', 'Winter'];

export default function HeaderControls({ searchQuery, setSearchQuery, activeFilter, setActiveFilter }) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Curated archive</Text>
      <Text style={styles.title}>Saved Outfits</Text>
      <Text style={styles.subtitle}>Revisit the looks you’ve already styled and kept.</Text>

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
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: '#1c1c1c',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: spacing.lg,
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  filterScroll: {
    marginTop: spacing.md,
  },
  filterRow: {
    paddingRight: spacing.md,
  },
});
