import React from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { spacing, radii, colors } from '../../lib/theme'; // adjust path as n

const CARD_WIDTH = Dimensions.get('window').width * 0.42;

export default function LoadingSkeleton({ count = 4 }) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <FlatList
      data={skeletons}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(i) => `skeleton-${i}`}
      renderItem={() => (
        <View style={styles.card}>
          <View style={styles.image} />
          <View style={styles.label} />
        </View>
      )}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.sm + 4,
  },
  image: {
    height: CARD_WIDTH * 1.1,
    borderRadius: radii.lg,
    backgroundColor: colors.border, // subtle neutral for skeleton bg
  },
  label: {
    height: 14,
    width: '60%',
    backgroundColor: colors.border, // consistent tone with image skeleton
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
});

