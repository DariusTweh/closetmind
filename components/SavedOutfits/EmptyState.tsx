import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HangerHeartIcon from '../icons/HangerHeartIcon';
import { spacing, typography } from '../../lib/theme';


export default function EmptyState() {
  return (
    <View style={styles.container}>
      <HangerHeartIcon size={88} color="#2c2622" />
      <Text style={styles.eyebrow}>Archive empty</Text>
      <Text style={styles.title}>No saved looks yet</Text>
      <Text style={styles.subtitle}>Build your archive by keeping the outfits you return to and want to restyle later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  eyebrow: {
    marginTop: spacing.md,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Georgia',
    color: '#1c1c1c',
    marginTop: 10,
    marginBottom: spacing.sm,
  },
  subtitle: {
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(28, 28, 28, 0.72)',
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
});
