import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '../../lib/theme';

export default function TravelCollectionEmptyState({
  onCreateTrip,
}: {
  onCreateTrip: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="airplane-outline" size={38} color="#2c2622" />
      </View>
      <Text style={styles.eyebrow}>Travel archive</Text>
      <Text style={styles.title}>No trips yet</Text>
      <Text style={styles.subtitle}>
        Create a travel collection to organize outfits by trip, activity, and day.
      </Text>
      <TouchableOpacity activeOpacity={0.88} onPress={onCreateTrip} style={styles.button}>
        <Text style={styles.buttonText}>Create Travel Collection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl * 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
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
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(28, 28, 28, 0.72)',
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  button: {
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fafaff',
    fontFamily: typography.fontFamily,
  },
});
