// components/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HangerHeartIcon from '../icons/HangerHeartIcon'; // ✅ correct
import { colors, spacing, radii, shadows, typography } from '../../lib/theme';


export default function EmptyState() {
  return (
    <View style={styles.container}>
      <HangerHeartIcon size={100} color="#8abfa3" />
      <Text style={styles.title}>No saved outfits</Text>
      <Text style={styles.subtitle}>Outfits you save will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl * 2.5, // ~80
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    fontFamily: typography.fontFamily,
  },
});
