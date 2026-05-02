import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

const DEFAULT_FEATURES = [
  'Unlimited closet',
  'Unlimited saved outfits',
  'All premium tools',
  '15 AI try-ons / month',
];

export default function PaywallFeatureList({
  features = DEFAULT_FEATURES,
}: {
  features?: string[];
}) {
  return (
    <View style={styles.wrap}>
      {features.map((feature) => (
        <View key={feature} style={styles.row}>
          <View style={styles.dot} />
          <Text style={styles.text}>{feature}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 7,
    backgroundColor: colors.textPrimary,
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
