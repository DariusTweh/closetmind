import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';
import type { FeatureName, PlanTier, UiLimitValue } from '../../lib/subscriptions/types';

type UpgradeLimitModalProps = {
  visible: boolean;
  featureName: FeatureName;
  used?: number;
  limit?: UiLimitValue;
  remaining?: UiLimitValue;
  tier: PlanTier;
  recommendedUpgrade?: 'plus' | 'pro' | 'tryon_pack';
  isPaywallAvailable: boolean;
  onClose: () => void;
  onUpgrade: () => void | Promise<void>;
  onBuyTryOnPack?: (() => void | Promise<void>) | null;
};

function getFeatureCopy(featureName: FeatureName) {
  switch (featureName) {
    case 'closet_item':
      return {
        title: "You've reached your closet limit.",
        body: 'Upgrade to add more pieces and keep building your wardrobe.',
      };
    case 'saved_outfit':
      return {
        title: "You've reached your saved outfit limit.",
        body: 'Upgrade to save unlimited looks.',
      };
    case 'outfit_generation':
      return {
        title: "You've used your monthly outfit generations.",
        body: 'Upgrade for more styling power.',
      };
    case 'style_this_item':
      return {
        title: "You've used your monthly Style This Item generations.",
        body: 'Upgrade for more item-based outfit ideas.',
      };
    case 'ai_tryon':
      return {
        title: "You're out of AI try-ons.",
        body: 'Upgrade or add more try-on credits.',
      };
    case 'premium_organization':
      return {
        title: 'Premium organization is locked.',
        body: 'Upgrade to unlock travel collections and premium organization tools.',
      };
    default:
      return {
        title: 'This premium feature is locked.',
        body: 'Upgrade to keep going.',
      };
  }
}

function formatLimitValue(value?: UiLimitValue) {
  if (value === 'unlimited') return 'unlimited';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function getUpgradeLabel(recommendedUpgrade?: 'plus' | 'pro' | 'tryon_pack') {
  if (recommendedUpgrade === 'pro') return 'Upgrade to Pro';
  if (recommendedUpgrade === 'tryon_pack') return 'Get Try-On Credits';
  return 'Upgrade to Plus';
}

export default function UpgradeLimitModal({
  visible,
  featureName,
  used,
  limit,
  remaining,
  tier,
  recommendedUpgrade,
  isPaywallAvailable,
  onClose,
  onUpgrade,
  onBuyTryOnPack,
}: UpgradeLimitModalProps) {
  const copy = getFeatureCopy(featureName);
  const usedLabel = typeof used === 'number' ? String(used) : null;
  const limitLabel = formatLimitValue(limit);
  const remainingLabel = formatLimitValue(remaining);
  const shouldShowTryOnPackButton =
    isPaywallAvailable &&
    featureName === 'ai_tryon' &&
    recommendedUpgrade !== 'plus' &&
    Boolean(onBuyTryOnPack);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>
            {isPaywallAvailable ? 'Upgrade required' : 'Premium is coming soon'}
          </Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>
            {isPaywallAvailable
              ? copy.body
              : `${copy.body} Purchases are not live yet, but these limits are already being enforced.`}
          </Text>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current plan</Text>
            <Text style={styles.statValue}>{tier.toUpperCase()}</Text>
            {usedLabel && limitLabel ? (
              <Text style={styles.statSub}>
                Used {usedLabel} of {limitLabel}
              </Text>
            ) : null}
            {remainingLabel ? (
              <Text style={styles.statSub}>Remaining: {remainingLabel}</Text>
            ) : null}
          </View>

          {isPaywallAvailable ? (
            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.primaryButton}
                onPress={() => {
                  void onUpgrade();
                }}
              >
                <Text style={styles.primaryButtonText}>{getUpgradeLabel(recommendedUpgrade)}</Text>
              </TouchableOpacity>

              {shouldShowTryOnPackButton ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.secondaryButton}
                  onPress={() => {
                    void onBuyTryOnPack?.();
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Buy Try-On Pack</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity activeOpacity={0.84} style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Not now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity activeOpacity={0.9} style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 17, 15, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.05,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  statCard: {
    marginTop: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  statValue: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  statSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  actions: {
    marginTop: spacing.lg,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryButton: {
    minHeight: 48,
    marginTop: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  closeButton: {
    minHeight: 42,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
});
