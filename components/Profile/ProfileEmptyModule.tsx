import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { typography } from '../../lib/theme';

export default function ProfileEmptyModule({
  title,
  description,
  ctaLabel,
  onPress,
  badgeLabel,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  onPress?: () => void;
  badgeLabel?: string;
}) {
  return (
    <View>
      {badgeLabel ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {ctaLabel && onPress ? (
        <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#eef0f2',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7e7267',
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1c1c1c',
    fontFamily: typography.fontFamily,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
  cta: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2f3d2f',
    fontFamily: typography.fontFamily,
  },
});
