import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadows, typography } from '../../lib/theme'; 
const FILTERS = ['All', 'Favorites', 'Spring', 'Summer', 'Fall', 'Winter'];

const seasonColors = {
  Spring: '#b5d6a7',
  Summer: '#f4a261',
  Fall: '#eab308',
  Winter: '#60a5fa',
};

export default function HeaderControls({ searchQuery, setSearchQuery, activeFilter, setActiveFilter }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Outfits</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          placeholder="Search"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.input}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
        {FILTERS.map(filter => {
          const isActive = activeFilter === filter;
          const pillStyle = {
            backgroundColor: isActive
              ? seasonColors[filter] || '#8abfa3'
              : '#eee',
          };
          const textStyle = isActive ? styles.activePillText : styles.pillText;

          return (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.pill, pillStyle]}
            >
              <Text style={textStyle}>{filter}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Georgia', // editorial style
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md - 2,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  pillRow: {
    flexDirection: 'row',
  },
  pill: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radii.pill,
    marginRight: spacing.sm + 2,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: typography.fontFamily,
  },
  activePillText: {
    color: colors.textOnAccent,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
});
