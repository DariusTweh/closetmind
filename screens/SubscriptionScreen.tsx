import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors, spacing, typography } from '../lib/theme';
import PaywallFooter from '../components/paywall/PaywallFooter';
import { useRevenueCat } from '../providers/RevenueCatProvider';

function formatEquivalentMonthly(pkg: PurchasesPackage | null) {
  const price = Number((pkg?.product as any)?.price ?? NaN);
  if (!Number.isFinite(price) || price <= 0) return '$4.17/month';
  return `$${(price / 12).toFixed(2)}/month`;
}

function PlanCard({
  eyebrow,
  title,
  description,
  priceLabel,
  periodLabel,
  buttonLabel,
  badge,
  loading,
  disabled,
  onPress,
  onRetry,
  error,
}: {
  eyebrow: string;
  title: string;
  description: string;
  priceLabel: string;
  periodLabel: string;
  buttonLabel: string;
  badge?: string | null;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onRetry: () => void;
  error?: string | null;
}) {
  return (
    <View style={styles.planCard}>
      <Text style={styles.planEyebrow}>{eyebrow}</Text>
      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planDescription}>{description}</Text>

      <View style={styles.planPriceRow}>
        <Text style={styles.planPrice}>{priceLabel}</Text>
        <Text style={styles.planPeriod}>{periodLabel}</Text>
        {badge ? (
          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={error ? onRetry : onPress}
        disabled={disabled}
        style={[styles.planButton, disabled && styles.disabledButton]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.planButtonText}>{error ? 'Retry' : buttonLabel}</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.cardError}>{error}</Text> : null}
    </View>
  );
}

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {
    nativeAvailable,
    nativeUnavailableMessage,
    configurationIssue,
    revenueCatMode,
    ready,
    loading,
    syncingAuth,
    currentOffering,
    entitlementId,
    offeringId,
    monthlyPackageId,
    monthlyProductId,
    yearlyPackageId,
    yearlyProductId,
    isPro,
    lastError,
    availablePackages,
    purchaseNamedPackage,
    refreshAll,
    restorePurchases,
    presentCustomerCenter,
  } = useRevenueCat();

  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [screenError, setScreenError] = React.useState<string | null>(null);

  const monthlyPackage = availablePackages.monthly;
  const yearlyPackage = availablePackages.yearly;

  React.useEffect(() => {
    if (!lastError) return;
    setScreenError(lastError);
  }, [lastError]);

  const closeScreen = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const runAction = React.useCallback(
    async (actionKey: string, fn: () => Promise<void>) => {
      if (busyAction) return;
      setBusyAction(actionKey);
      setScreenError(null);
      try {
        await fn();
      } catch (error: any) {
        const message = String(error?.message || 'Please try again.');
        setScreenError(message);
        Alert.alert('Klozu Premium', message);
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction],
  );

  const handleRetry = React.useCallback(() => {
    void runAction('refresh', async () => {
      await refreshAll();
    });
  }, [refreshAll, runAction]);

  const handlePurchase = React.useCallback(
    (packageKey: 'monthly' | 'yearly') => {
      void runAction(`purchase_${packageKey}`, async () => {
        const result = await purchaseNamedPackage(packageKey);
        if (result.cancelled) return;

        const unlocked = Boolean(result.customerInfo?.entitlements.active?.[entitlementId]?.isActive);
        if (unlocked) {
          Alert.alert('Premium unlocked', 'Klozu Plus is now active on this account.', [
            { text: 'Continue', onPress: closeScreen },
          ]);
          return;
        }

        Alert.alert(
          'Purchase completed',
          'The purchase finished, but the entitlement is not active yet. Pull to refresh or restore if needed.',
        );
      });
    },
    [closeScreen, entitlementId, purchaseNamedPackage, runAction],
  );

  const handleRestore = React.useCallback(() => {
    void runAction('restore', async () => {
      const info = await restorePurchases();
      const unlocked = Boolean(info?.entitlements.active?.[entitlementId]?.isActive);

      if (unlocked) {
        Alert.alert('Purchases restored', 'Klozu Plus is active on this account.', [
          { text: 'Continue', onPress: closeScreen },
        ]);
        return;
      }

      Alert.alert('Nothing to restore', `No active ${entitlementId} purchase was restored.`);
    });
  }, [closeScreen, entitlementId, restorePurchases, runAction]);

  const handleCustomerCenter = React.useCallback(() => {
    void runAction('customerCenter', async () => {
      await presentCustomerCenter();
    });
  }, [presentCustomerCenter, runAction]);

  const showLoadingState = nativeAvailable && (loading || !ready || syncingAuth);
  const resolvedError =
    screenError ||
    (!nativeAvailable ? nativeUnavailableMessage : null) ||
    configurationIssue ||
    (ready && !currentOffering
      ? `RevenueCat loaded, but no offering could be resolved. Confirm offering \`${offeringId}\` exists in RevenueCat and is available to the ${revenueCatMode === 'test_store' ? 'test-store' : 'Klozu iOS'} app.`
      : null) ||
    (ready && currentOffering && (!monthlyPackage || !yearlyPackage)
      ? `RevenueCat loaded offering \`${currentOffering.identifier}\`, but one or more paywall packages are missing. Confirm monthly \`${monthlyPackageId}\` -> \`${monthlyProductId}\` and yearly \`${yearlyPackageId}\` -> \`${yearlyProductId}\` are attached to the offering.`
      : null);

  const monthlyPriceLabel = monthlyPackage?.product?.priceString || '$5.99';
  const yearlyPriceLabel = yearlyPackage?.product?.priceString || '$49.99';
  const yearlyEquivalentLabel = formatEquivalentMonthly(yearlyPackage);
  const purchaseDisabled = showLoadingState || Boolean(busyAction);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>Klozu plus</Text>
            <Text style={styles.title}>Premium access, kept simple.</Text>
          </View>
          <TouchableOpacity activeOpacity={0.88} onPress={closeScreen} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Unlock premium Klozu features with flexible monthly or annual plans. Add try-on credits and closet expansion whenever you need.
        </Text>

        <View style={styles.planStack}>
          <PlanCard
            eyebrow="Monthly access"
            title="Klozu Plus"
            description="300 closet items, unlimited saved looks, premium tools, and 3 AI try-ons each month."
            priceLabel={monthlyPriceLabel}
            periodLabel="per month"
            buttonLabel="Start Monthly"
            loading={busyAction === 'purchase_monthly'}
            disabled={purchaseDisabled}
            onPress={() => handlePurchase('monthly')}
            onRetry={handleRetry}
            error={!monthlyPackage && resolvedError ? resolvedError : null}
          />

          <PlanCard
            eyebrow="Annual access"
            title="Klozu Plus Annual"
            description={`Everything in Plus for a year. Best value at the equivalent of ${yearlyEquivalentLabel}.`}
            priceLabel={yearlyPriceLabel}
            periodLabel="per year"
            buttonLabel="Start Annual"
            badge="Best value"
            loading={busyAction === 'purchase_yearly'}
            disabled={purchaseDisabled}
            onPress={() => handlePurchase('yearly')}
            onRetry={handleRetry}
            error={!yearlyPackage && resolvedError ? resolvedError : null}
          />
        </View>

        <View style={styles.featureList}>
          {[
            '300 closet items',
            'Unlimited saved outfits',
            'All premium styling tools',
            '3 AI try-ons / month',
            'Optional try-on credits and closet expansion',
          ].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.addOnCard}>
          <View style={styles.addOnIconWrap}>
            <Ionicons name="bag-handle-outline" size={22} color={colors.textPrimary} />
          </View>
          <View style={styles.addOnCopy}>
            <Text style={styles.addOnTitle}>Optional add-ons</Text>
            <Text style={styles.addOnText}>Try-on credits from $1.99.</Text>
            <Text style={styles.addOnText}>Closet expansion from $2.99.</Text>
          </View>
        </View>

        {isPro ? (
          <View style={styles.activeState}>
            <Text style={styles.activeStateText}>Klozu Plus is currently active on this account.</Text>
          </View>
        ) : null}

        {showLoadingState ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
            <Text style={styles.loadingText}>
              {syncingAuth ? 'Syncing your account…' : 'Loading paywall details…'}
            </Text>
          </View>
        ) : null}

        <PaywallFooter
          busy={Boolean(busyAction)}
          entitlementId={entitlementId}
          onRestore={handleRestore}
          onOpenCustomerCenter={handleCustomerCenter}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 10,
    maxWidth: 330,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 14,
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  closeButton: {
    width: 52,
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planStack: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  planCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  planEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  planTitle: {
    marginTop: 12,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  planDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.xl,
  },
  planPrice: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  valueBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  valueBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  planButton: {
    marginTop: spacing.lg,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  planButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cardError: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#9e4a3e',
    fontFamily: typography.fontFamily,
  },
  featureList: {
    marginTop: spacing.xl,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureBullet: {
    width: 18,
    fontSize: 20,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  addOnCard: {
    marginTop: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  addOnIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOnCopy: {
    flex: 1,
  },
  addOnTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  addOnText: {
    marginTop: 2,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  activeState: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  activeStateText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
  },
  loadingRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13.5,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
