import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '../../lib/theme';

export default function FitCheckPromptCard({
  postedToday = false,
  compact = false,
  onPress,
  onPressSecondary,
}: {
  postedToday?: boolean;
  compact?: boolean;
  onPress: () => void;
  onPressSecondary?: () => void;
}) {
  const eyebrow = postedToday ? 'Daily Status' : 'Daily Prompt';
  const title = postedToday ? 'You posted today' : 'Fit Check is live';
  const subtitle = postedToday
    ? 'Today’s drops are unlocked.'
    : 'Post what you\'re really wearing today.';
  const metaText = postedToday
    ? 'Your fit is live. You can open it again or drop another look.'
    : 'Friends can see posts after you share yours';
  const primaryLabel = postedToday ? 'View Your Fit' : 'Post My Fit';

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.topRow, compact && styles.topRowCompact]}>
        <View style={styles.copyWrap}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
        </View>
        <View style={styles.pulsePill}>
          <View style={styles.pulseDot} />
          <Text style={styles.pulseText}>{postedToday ? 'Posted' : 'Live'}</Text>
        </View>
      </View>

      {!compact ? (
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.metaText}>{metaText}</Text>
        </View>
      ) : null}

      <View style={[styles.actionsRow, compact && styles.actionsRowCompact]}>
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.button, compact && styles.buttonCompact]}>
          <Text style={styles.buttonText}>{primaryLabel}</Text>
        </TouchableOpacity>
        {postedToday && onPressSecondary ? (
          <TouchableOpacity activeOpacity={0.9} onPress={onPressSecondary} style={[styles.secondaryButton, compact && styles.secondaryButtonCompact]}>
            <Text style={styles.secondaryButtonText}>Post Another</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(30,30,30,0.12)',
    ...shadows.card,
  },
  cardCompact: {
    padding: 14,
    borderRadius: 20,
  },
  topRow: {
    position: 'relative',
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
  },
  topRowCompact: {
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 14,
    borderRadius: 16,
  },
  copyWrap: {
    paddingRight: 92,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    lineHeight: 34,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  titleCompact: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 26,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    maxWidth: 250,
  },
  subtitleCompact: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: 220,
  },
  pulsePill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(250, 250, 255, 0.9)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(28, 28, 28, 0.06)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ba7f54',
  },
  pulseText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  metaRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  actionsRow: {
    marginTop: 22,
    gap: 12,
  },
  actionsRowCompact: {
    marginTop: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 32,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    minHeight: 50,
  },
  buttonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonCompact: {
    minHeight: 46,
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
