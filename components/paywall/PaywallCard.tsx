import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors, spacing, typography } from '../../lib/theme';

export default function PaywallCard({
  monthlyPackage,
  isLoading = false,
  error = null,
  onPurchase,
  onRetry,
}: {
  monthlyPackage: PurchasesPackage | null;
  isLoading?: boolean;
  error?: string | null;
  onPurchase: () => void;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={styles.loadingText}>Loading Klozu Premium…</Text>
        </View>
      </View>
    );
  }

  if (!monthlyPackage) {
    return (
      <View style={styles.card}>
        <Text style={styles.packageEyebrow}>Monthly access</Text>
        <Text style={styles.packageTitle}>Klozu Premium is not available yet.</Text>
        <Text style={styles.packageSubtitle}>
          {error || 'RevenueCat did not return the monthly offering. Check the default offering and package mapping, then retry.'}
        </Text>
        <TouchableOpacity activeOpacity={0.88} onPress={onRetry} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const priceLabel = monthlyPackage.product?.priceString || '—';

  return (
    <View style={styles.card}>
      <Text style={styles.packageEyebrow}>Monthly access</Text>
      <Text style={styles.packageTitle}>Klozu Premium</Text>
      <Text style={styles.packageSubtitle}>
        Unlimited closet and saved looks, all premium tools, and 15 AI try-ons each month.
      </Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{priceLabel}</Text>
        <Text style={styles.priceNote}>per month</Text>
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onPurchase} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Start Premium</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  loadingWrap: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  packageEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  packageTitle: {
    marginTop: 12,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  packageSubtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: spacing.xl,
  },
  price: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  priceNote: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    marginTop: spacing.lg,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
  errorText: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#9e4a3e',
    fontFamily: typography.fontFamily,
  },
});
