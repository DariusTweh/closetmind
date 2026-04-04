
import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from 'react-native';

import { colors, spacing, radii, typography } from '../../lib/theme';
const MAIN_CATEGORIES = ['all','top', 'bottom', 'shoes', 'outerwear', 'accessory', 'layer', 'onepiece'];

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
                { backgroundColor: isActive ? '#111' : '#eaeaea' },
              ]}
            >
              <Text style={[styles.text, isActive && styles.activeText]}>
                {filter}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
});