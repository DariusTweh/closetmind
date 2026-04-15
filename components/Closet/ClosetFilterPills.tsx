
import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';

import { colors, spacing, radii, typography } from '../../lib/theme';
const MAIN_CATEGORIES = ['all', 'top', 'bottom', 'shoes', 'outerwear', 'accessory', 'layer', 'onepiece'];

const FILTER_LABELS = {
  all: 'All',
  top: 'Tops',
  bottom: 'Bottoms',
  shoes: 'Shoes',
  outerwear: 'Outerwear',
  accessory: 'Accessories',
  layer: 'Layers',
  onepiece: 'One-Piece',
};

export default function ClosetFilterPills({ activeFilter, setActiveFilter }) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {MAIN_CATEGORIES.map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.pill,
                isActive ? styles.activePill : styles.inactivePill,
              ]}
            >
              <Text style={[styles.text, isActive && styles.activeText]}>
                {FILTER_LABELS[filter] || filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm - 1,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md - 3,
    borderRadius: radii.pill,
    marginRight: 6,
  },
  activePill: {
    backgroundColor: '#1c1c1c',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },
  inactivePill: {
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#daddd8',
  },
  text: {
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
    color: colors.textPrimary,
  },
  activeText: {
    color: colors.textOnAccent,
  },
});
