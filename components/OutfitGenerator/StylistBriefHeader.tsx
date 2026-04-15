import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../lib/theme';

type StylistBriefHeaderProps = {
  title: string;
  subtitle: string;
};

export default function StylistBriefHeader({
  title,
  subtitle,
}: StylistBriefHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>ClosetMind Stylist</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 14,
    paddingBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    color: '#1d1916',
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    marginTop: 7,
    fontSize: 14.5,
    lineHeight: 20,
    color: '#6d6259',
    maxWidth: 340,
    fontFamily: typography.fontFamily,
  },
});
