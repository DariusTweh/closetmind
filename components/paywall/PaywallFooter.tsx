import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';

export default function PaywallFooter({
  busy = false,
  entitlementId = 'closana Pro',
  onRestore,
  onOpenCustomerCenter,
}: {
  busy?: boolean;
  entitlementId?: string;
  onRestore: () => void;
  onOpenCustomerCenter?: (() => void) | null;
}) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onRestore}
        disabled={busy}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>{busy ? 'Working…' : 'Restore Purchases'}</Text>
      </TouchableOpacity>

      {onOpenCustomerCenter ? (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onOpenCustomerCenter}
          disabled={busy}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Customer Center</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.note}>
        Cancel anytime through Apple. Klozu Premium unlocks the {'`'}
        {entitlementId}
        {'`'} entitlement on this account.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  linkText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  note: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
});
