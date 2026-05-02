import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../lib/theme';

export default function FeaturedFitsEmptyState({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="sparkles-outline" size={22} color={colors.textPrimary} />
      </View>
      <Text style={styles.eyebrow}>Featured fits</Text>
      <Text style={styles.title}>No featured fits yet</Text>
      <Text style={styles.subtitle}>
        Choose standout looks from your saved outfits to shape your profile identity.
      </Text>
      <TouchableOpacity activeOpacity={0.88} onPress={onAdd} style={styles.button}>
        <Text style={styles.buttonText}>Add from Saved Looks</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl - 4,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    marginTop: spacing.md,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textOnAccent,
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
