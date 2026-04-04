// /components/OutfitGenerator/OutfitForm.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radii, typography, shadows } from '../../lib/theme'; // adjust path if needed

export default function OutfitForm({ vibe, setVibe, context, setContext, season, setSeason, temperature, setTemperature, onGenerate }) {
  return (
    <>
      <Text style={styles.title}>Your AI Stylist</Text>
      <Text style={styles.subtitle}>Tell us the vibe. We’ll build your look.</Text>
      <View style={styles.card}>
        <TextInput placeholder="Vibe (e.g. confident)" value={vibe} onChangeText={setVibe} style={styles.input} />
        <TextInput placeholder="Context (e.g. party in Atlanta)" value={context} onChangeText={setContext} style={styles.input} />
        <TextInput placeholder="Season (e.g. summer)" value={season} onChangeText={setSeason} style={styles.input} />
        <TextInput placeholder="Temperature °F" keyboardType="numeric" value={temperature} onChangeText={setTemperature} style={styles.input} />
        <TouchableOpacity style={styles.button} onPress={onGenerate}>
          <Text style={styles.buttonText}>Generate My Fit</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    fontFamily: typography.fontFamily,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md - 2,
    ...shadows.card,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md - 2,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  button: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.textOnAccent,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: typography.fontFamily,
  },
});
