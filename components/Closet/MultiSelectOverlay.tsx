import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../../lib/theme'; // adjust path as needed

export default function MultiSelectOverlay() {
  return (
    <View style={styles.overlay}>
      <Ionicons name="checkmark-circle" size={28} color="#8abfa3" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: `${colors.background}cc`, // translucent sand
    borderRadius: radii.pill,
    padding: 2,
    zIndex: 2,
  },
});