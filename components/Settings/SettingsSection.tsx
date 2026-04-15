import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../lib/theme';

export default function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: 16,
  },
});
