import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';
import FilterChip from './FilterChip';
import SearchField from './SearchField';
import SavedOutfitsTabBar, { type SavedOutfitsContentMode } from './SavedOutfitsTabBar';

export type SavedOutfitsSeasonFilter = 'Any Season' | 'Spring' | 'Summer' | 'Fall' | 'Winter';

const SEASON_FILTERS: SavedOutfitsSeasonFilter[] = ['Any Season', 'Spring', 'Summer', 'Fall', 'Winter'];

export default function SavedOutfitsHeader({
  contentMode,
  onChangeMode,
  searchQuery,
  onChangeSearch,
  seasonFilter,
  onChangeSeasonFilter,
  summaryText,
  onPressCreateTrip,
}: {
  contentMode: SavedOutfitsContentMode;
  onChangeMode: (mode: SavedOutfitsContentMode) => void;
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  seasonFilter: SavedOutfitsSeasonFilter;
  onChangeSeasonFilter: (value: SavedOutfitsSeasonFilter) => void;
  summaryText?: string;
  onPressCreateTrip: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.eyebrow}>Closet archive</Text>
        <Text style={styles.title}>Saved Looks</Text>
      </View>

      <SearchField
        value={searchQuery}
        onChangeText={onChangeSearch}
        placeholder={contentMode === 'Travel' ? 'Search travel collections' : 'Search saved looks'}
      />

      <View style={styles.tabsWrap}>
        <SavedOutfitsTabBar activeMode={contentMode} onChange={onChangeMode} />
      </View>

      {summaryText ? <Text style={styles.summaryText}>{summaryText}</Text> : null}

      {contentMode === 'Travel' ? (
        <View style={styles.travelActions}>
          <Text style={styles.travelEyebrow}>Travel collections</Text>
          <TouchableOpacity activeOpacity={0.88} onPress={onPressCreateTrip} style={styles.createButton}>
            <Ionicons name="add" size={16} color={colors.textOnAccent} />
            <Text style={styles.createButtonText}>Create Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seasonRow}
          style={styles.seasonScroll}
        >
          {SEASON_FILTERS.map((filter) => (
            <FilterChip
              key={filter}
              label={filter}
              active={seasonFilter === filter}
              onPress={() => onChangeSeasonFilter(filter)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  tabsWrap: {
    marginTop: 10,
  },
  summaryText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  seasonScroll: {
    marginTop: 10,
  },
  seasonRow: {
    paddingRight: spacing.md,
  },
  travelActions: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  travelEyebrow: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  createButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
});
