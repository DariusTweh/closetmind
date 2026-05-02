import React from 'react';
import { NativeModules } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { supabase } from '../lib/supabase';
import {
  REVENUECAT_PACKAGE_IDENTIFIERS,
  type RevenueCatPackageIdentifier,
  type RevenueCatRuntimeMode,
  isTestStoreApiKey,
  normalizeRevenueCatConfigurationError,
  resolveRevenueCatConfigurationIssue,
  resolveRevenueCatRuntimeConfig,
} from '../lib/revenuecatConfig';

type RevenueCatPackageMap = Record<RevenueCatPackageIdentifier, PurchasesPackage | null>;

type PurchaseOutcome = {
  cancelled: boolean;
  customerInfo: CustomerInfo | null;
  packageId?: string | null;
};

type RevenueCatContextValue = {
  nativeAvailable: boolean;
  canPresentNativePaywalls: boolean;
  nativeUnavailableMessage: string | null;
  configurationIssue: string | null;
  revenueCatMode: RevenueCatRuntimeMode;
  ready: boolean;
  loading: boolean;
  syncingAuth: boolean;
  lastError: string | null;
  apiKey: string | null;
  isTestStore: boolean;
  entitlementId: string;
  offeringId: string;
  monthlyPackageId: string;
  monthlyProductId: string;
  yearlyPackageId: string;
  yearlyProductId: string;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  activeEntitlement: PurchasesEntitlementInfo | null;
  isPro: boolean;
  currentPlanLabel: string;
  availablePackages: RevenueCatPackageMap;
  monthlyPackage: PurchasesPackage | null;
  refreshAll: () => Promise<void>;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  refreshOfferings: () => Promise<PurchasesOfferings | null>;
  fetchCurrentOffering: () => Promise<PurchasesOffering | null>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<PurchaseOutcome>;
  purchaseNamedPackage: (identifier: RevenueCatPackageIdentifier) => Promise<PurchaseOutcome>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  syncPurchases: () => Promise<void>;
  presentPaywall: () => Promise<boolean>;
  presentPaywallIfNeeded: () => Promise<boolean>;
  presentCustomerCenter: () => Promise<void>;
  hasEntitlement: (entitlementId?: string) => boolean;
};

const RevenueCatContext = React.createContext<RevenueCatContextValue | null>(null);

function normalizeMessage(error: unknown, fallback: string) {
  return normalizeRevenueCatConfigurationError(error, fallback);
}

function wasUserCancelled(error: unknown) {
  return Boolean((error as any)?.userCancelled);
}

function didUnlockFromPaywall(result: PAYWALL_RESULT) {
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

function getRevenueCatNativeState() {
  const purchasesModule = (NativeModules as any)?.RNPurchases;
  const paywallsModule = (NativeModules as any)?.RNPaywalls;
  const nativeAvailable = Boolean(purchasesModule);
  const canPresentNativePaywalls = nativeAvailable && Boolean(paywallsModule);
  const nativeUnavailableMessage = nativeAvailable
    ? null
    : 'RevenueCat native modules are not available in this runtime. Use a development build or TestFlight build, then rebuild iOS after installing pods. Expo Go cannot run real RevenueCat purchases.';

  return {
    nativeAvailable,
    canPresentNativePaywalls,
    nativeUnavailableMessage,
  };
}

function firstMatchingPackage(offering: PurchasesOffering | null, candidates: string[]) {
  if (!offering) return null;
  const lowered = candidates.map((candidate) => candidate.toLowerCase());
  return (
    offering.availablePackages.find((pkg) => {
      const packageIdentifier = String(pkg.identifier || '').toLowerCase();
      const productIdentifier = String(pkg.product?.identifier || '').toLowerCase();
      return lowered.includes(packageIdentifier) || lowered.includes(productIdentifier);
    }) || null
  );
}

function resolvePackageMap(
  offering: PurchasesOffering | null,
  monthlyProductId: string,
  monthlyPackageId: string,
  yearlyProductId: string,
  yearlyPackageId: string
): RevenueCatPackageMap {
  return {
    lifetime:
      offering?.lifetime ||
      firstMatchingPackage(offering, [REVENUECAT_PACKAGE_IDENTIFIERS.lifetime]) ||
      null,
    yearly:
      firstMatchingPackage(offering, [
        yearlyPackageId,
        yearlyProductId,
        REVENUECAT_PACKAGE_IDENTIFIERS.yearly,
        'annual',
        '$rc_annual',
      ]) ||
      offering?.annual ||
      null,
    monthly:
      firstMatchingPackage(offering, [
        monthlyPackageId,
        '$rc_monthly',
        monthlyProductId,
        REVENUECAT_PACKAGE_IDENTIFIERS.monthly,
      ]) ||
      offering?.monthly ||
      null,
  };
}

function resolveCurrentOfferingFromOfferings(
  offerings: PurchasesOfferings | null,
  offeringId: string
) {
  if (!offerings) return null;

  const defaultOffering = offerings.all?.[offeringId] || null;
  if (offerings.current) {
    return offerings.current;
  }

  if (defaultOffering) {
    return defaultOffering;
  }

  const firstAvailableOffering = Object.values(offerings.all || {}).find(Boolean) || null;
  return firstAvailableOffering;
}

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const runtimeConfig = React.useMemo(() => resolveRevenueCatRuntimeConfig(), []);
  const apiKey = runtimeConfig.apiKey;
  const isTestStore = React.useMemo(
    () => runtimeConfig.useTestStore || isTestStoreApiKey(apiKey),
    [apiKey, runtimeConfig.useTestStore]
  );
  const configurationIssue = React.useMemo(
    () => resolveRevenueCatConfigurationIssue(apiKey),
    [apiKey]
  );
  const { nativeAvailable, canPresentNativePaywalls, nativeUnavailableMessage } = React.useMemo(
    () => getRevenueCatNativeState(),
    []
  );

  const configuredRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const appUserIdRef = React.useRef<string | null>(null);
  const customerInfoListenerRef = React.useRef<((info: CustomerInfo) => void) | null>(null);

  const [ready, setReady] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [syncingAuth, setSyncingAuth] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = React.useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = React.useState<PurchasesOfferings | null>(null);

  const currentOffering = React.useMemo(
    () => resolveCurrentOfferingFromOfferings(offerings, runtimeConfig.offeringId),
    [offerings, runtimeConfig.offeringId]
  );
  const availablePackages = React.useMemo(
    () =>
      resolvePackageMap(
        currentOffering,
        runtimeConfig.monthlyProductId,
        runtimeConfig.monthlyPackageId,
        runtimeConfig.yearlyProductId,
        runtimeConfig.yearlyPackageId
      ),
    [
      currentOffering,
      runtimeConfig.monthlyPackageId,
      runtimeConfig.monthlyProductId,
      runtimeConfig.yearlyPackageId,
      runtimeConfig.yearlyProductId,
    ]
  );
  const monthlyPackage = availablePackages.monthly;
  const activeEntitlement = React.useMemo(
    () => customerInfo?.entitlements.active?.[runtimeConfig.entitlementId] || null,
    [customerInfo, runtimeConfig.entitlementId]
  );
  const isPro = Boolean(activeEntitlement?.isActive);
  const currentPlanLabel = isPro ? 'Klozu Plus' : 'Free';

  const assertNativeAvailable = React.useCallback(() => {
    if (!nativeAvailable) {
      throw new Error(nativeUnavailableMessage || 'RevenueCat native module is unavailable.');
    }
  }, [nativeAvailable, nativeUnavailableMessage]);

  const assertConfigurationReady = React.useCallback(() => {
    assertNativeAvailable();
    if (configurationIssue) {
      throw new Error(configurationIssue);
    }
  }, [assertNativeAvailable, configurationIssue]);

  const assertPaywallUiAvailable = React.useCallback(() => {
    assertConfigurationReady();
    if (!canPresentNativePaywalls) {
      throw new Error(
        'RevenueCatUI native paywall modules are unavailable in this build. Rebuild the iOS app and try again.'
      );
    }
  }, [assertConfigurationReady, canPresentNativePaywalls]);

  const refreshCustomerInfo = React.useCallback(async () => {
    if (!nativeAvailable) {
      if (mountedRef.current) {
        setLastError(nativeUnavailableMessage);
      }
      return null;
    }
    if (configurationIssue) {
      if (mountedRef.current) {
        setLastError(configurationIssue);
      }
      return null;
    }
    try {
      const nextCustomerInfo = await Purchases.getCustomerInfo();
      if (mountedRef.current) {
        setCustomerInfo(nextCustomerInfo);
        setLastError(null);
      }
      return nextCustomerInfo;
    } catch (error) {
      const message = normalizeMessage(error, 'Could not refresh subscription status.');
      if (mountedRef.current) {
        setLastError(message);
      }
      return null;
    }
  }, [configurationIssue, nativeAvailable, nativeUnavailableMessage]);

  const refreshOfferings = React.useCallback(async () => {
    if (!nativeAvailable) {
      if (mountedRef.current) {
        setLastError(nativeUnavailableMessage);
      }
      return null;
    }
    if (configurationIssue) {
      if (mountedRef.current) {
        setLastError(configurationIssue);
      }
      return null;
    }
    try {
      const nextOfferings = await Purchases.getOfferings();
      if (mountedRef.current) {
        setOfferings(nextOfferings);
        setLastError(null);
      }
      return nextOfferings;
    } catch (error) {
      const message = normalizeMessage(error, 'Could not load subscription offerings.');
      if (mountedRef.current) {
        setLastError(message);
      }
      return null;
    }
  }, [configurationIssue, nativeAvailable, nativeUnavailableMessage]);

  const refreshAll = React.useCallback(async () => {
    await Promise.all([refreshCustomerInfo(), refreshOfferings()]);
  }, [refreshCustomerInfo, refreshOfferings]);

  const fetchCurrentOffering = React.useCallback(async () => {
    const nextOfferings = await refreshOfferings();
    return resolveCurrentOfferingFromOfferings(nextOfferings, runtimeConfig.offeringId);
  }, [refreshOfferings, runtimeConfig.offeringId]);

  const syncRevenueCatUser = React.useCallback(async (appUserId: string | null) => {
    if (!nativeAvailable) {
      return;
    }

    if (configurationIssue) {
      if (mountedRef.current) {
        setLastError(configurationIssue);
      }
      return;
    }

    if (appUserId === appUserIdRef.current) {
      return;
    }

    setSyncingAuth(true);
    try {
      if (appUserId) {
        const result = await Purchases.logIn(appUserId);
        appUserIdRef.current = appUserId;
        if (mountedRef.current) {
          setCustomerInfo(result.customerInfo);
          setLastError(null);
        }
      } else {
        const nextCustomerInfo = await Purchases.logOut();
        appUserIdRef.current = null;
        if (mountedRef.current) {
          setCustomerInfo(nextCustomerInfo);
          setLastError(null);
        }
      }
    } catch (error) {
      const message = normalizeMessage(error, 'Could not sync purchases with your account.');
      if (mountedRef.current) {
        setLastError(message);
      }
    } finally {
      if (mountedRef.current) {
        setSyncingAuth(false);
      }
    }
  }, [configurationIssue, nativeAvailable]);

  React.useEffect(() => {
    mountedRef.current = true;
    const customerInfoListener = (nextCustomerInfo: CustomerInfo) => {
      if (mountedRef.current) {
        setCustomerInfo(nextCustomerInfo);
        setLastError(null);
      }
    };
    customerInfoListenerRef.current = customerInfoListener;

    const init = async () => {
      try {
        if (!nativeAvailable) {
          if (mountedRef.current) {
            setReady(true);
            setLastError(nativeUnavailableMessage);
          }
          return;
        }

        if (configurationIssue) {
          if (mountedRef.current) {
            setReady(true);
            setLastError(configurationIssue);
          }
          return;
        }

        await Purchases.setLogLevel(
          __DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN
        );

        if (!configuredRef.current) {
          Purchases.configure({
            apiKey,
            entitlementVerificationMode:
              Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
            diagnosticsEnabled: __DEV__,
            shouldShowInAppMessagesAutomatically: true,
          });
          configuredRef.current = true;
        }

        Purchases.addCustomerInfoUpdateListener(customerInfoListener);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        await syncRevenueCatUser(session?.user?.id || null);
        await refreshAll();

        if (mountedRef.current) {
          setReady(true);
          setLastError(null);
        }
      } catch (error) {
        const message = normalizeMessage(error, 'RevenueCat failed to initialize.');
        if (mountedRef.current) {
          setLastError(message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void init();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!nativeAvailable || configurationIssue) {
        return;
      }
      await syncRevenueCatUser(session?.user?.id || null);
      await refreshAll();
    });

    return () => {
      mountedRef.current = false;
      data.subscription?.unsubscribe();
      if (customerInfoListenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(customerInfoListenerRef.current);
      }
      customerInfoListenerRef.current = null;
    };
  }, [
    apiKey,
    configurationIssue,
    nativeAvailable,
    nativeUnavailableMessage,
    refreshAll,
    syncRevenueCatUser,
  ]);

  const purchasePackage = React.useCallback(
    async (pkg: PurchasesPackage): Promise<PurchaseOutcome> => {
      assertConfigurationReady();
      try {
        const result = await Purchases.purchasePackage(pkg);
        const nextCustomerInfo = result.customerInfo || null;
        if (nextCustomerInfo && mountedRef.current) {
          setCustomerInfo(nextCustomerInfo);
          setLastError(null);
        }
        return {
          cancelled: false,
          customerInfo: nextCustomerInfo,
          packageId: pkg.identifier,
        };
      } catch (error) {
        if (wasUserCancelled(error)) {
          return { cancelled: true, customerInfo: customerInfo || null, packageId: pkg.identifier };
        }
        throw new Error(normalizeMessage(error, 'Purchase could not be completed.'));
      }
    },
    [assertConfigurationReady, customerInfo]
  );

  const purchaseNamedPackage = React.useCallback(
    async (identifier: RevenueCatPackageIdentifier) => {
      const selectedPackage = availablePackages[identifier];
      if (!selectedPackage) {
        throw new Error(`The ${identifier} package is not configured in the current offering.`);
      }
      return purchasePackage(selectedPackage);
    },
    [availablePackages, purchasePackage]
  );

  const restorePurchases = React.useCallback(async () => {
    assertConfigurationReady();
    try {
      const restoredCustomerInfo = await Purchases.restorePurchases();
      if (mountedRef.current) {
        setCustomerInfo(restoredCustomerInfo);
        setLastError(null);
      }
      return restoredCustomerInfo;
    } catch (error) {
      throw new Error(normalizeMessage(error, 'Restore failed. Please try again.'));
    }
  }, [assertConfigurationReady]);

  const syncPurchases = React.useCallback(async () => {
    assertConfigurationReady();
    try {
      await Purchases.syncPurchases();
      await refreshCustomerInfo();
    } catch (error) {
      throw new Error(normalizeMessage(error, 'Purchase sync failed.'));
    }
  }, [assertConfigurationReady, refreshCustomerInfo]);

  const presentPaywall = React.useCallback(async () => {
    assertPaywallUiAvailable();
    try {
      const result = await RevenueCatUI.presentPaywall({
        offering: currentOffering || undefined,
        displayCloseButton: true,
      });
      if (didUnlockFromPaywall(result)) {
        await refreshCustomerInfo();
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(normalizeMessage(error, 'The paywall could not be presented.'));
    }
  }, [assertPaywallUiAvailable, currentOffering, refreshCustomerInfo]);

  const presentPaywallIfNeeded = React.useCallback(async () => {
    assertPaywallUiAvailable();
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: runtimeConfig.entitlementId,
        offering: currentOffering || undefined,
        displayCloseButton: true,
      });
      if (didUnlockFromPaywall(result)) {
        await refreshCustomerInfo();
        return true;
      }
      return isPro;
    } catch (error) {
      throw new Error(normalizeMessage(error, 'The paywall could not be presented.'));
    }
  }, [
    assertPaywallUiAvailable,
    currentOffering,
    isPro,
    refreshCustomerInfo,
    runtimeConfig.entitlementId,
  ]);

  const presentCustomerCenter = React.useCallback(async () => {
    assertPaywallUiAvailable();
    try {
      await RevenueCatUI.presentCustomerCenter();
      await refreshCustomerInfo();
    } catch (error) {
      throw new Error(normalizeMessage(error, 'Customer Center is not available right now.'));
    }
  }, [assertPaywallUiAvailable, refreshCustomerInfo]);

  const hasEntitlement = React.useCallback(
    (entitlementId = runtimeConfig.entitlementId) =>
      Boolean(customerInfo?.entitlements.active?.[entitlementId]?.isActive),
    [customerInfo, runtimeConfig.entitlementId]
  );

  const value = React.useMemo<RevenueCatContextValue>(
    () => ({
      nativeAvailable,
      canPresentNativePaywalls,
      nativeUnavailableMessage,
      configurationIssue,
      revenueCatMode: runtimeConfig.mode,
      ready,
      loading,
      syncingAuth,
      lastError,
      apiKey,
      isTestStore,
      entitlementId: runtimeConfig.entitlementId,
      offeringId: runtimeConfig.offeringId,
      monthlyPackageId: runtimeConfig.monthlyPackageId,
      monthlyProductId: runtimeConfig.monthlyProductId,
      yearlyPackageId: runtimeConfig.yearlyPackageId,
      yearlyProductId: runtimeConfig.yearlyProductId,
      customerInfo,
      offerings,
      currentOffering,
      activeEntitlement,
      isPro,
      currentPlanLabel,
      availablePackages,
      monthlyPackage,
      refreshAll,
      refreshCustomerInfo,
      refreshOfferings,
      fetchCurrentOffering,
      purchasePackage,
      purchaseNamedPackage,
      restorePurchases,
      syncPurchases,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
      hasEntitlement,
    }),
    [
      nativeAvailable,
      canPresentNativePaywalls,
      nativeUnavailableMessage,
      configurationIssue,
      runtimeConfig.mode,
      ready,
      loading,
      syncingAuth,
      lastError,
      apiKey,
      isTestStore,
      runtimeConfig.entitlementId,
      runtimeConfig.offeringId,
      runtimeConfig.monthlyPackageId,
      runtimeConfig.monthlyProductId,
      runtimeConfig.yearlyPackageId,
      runtimeConfig.yearlyProductId,
      customerInfo,
      offerings,
      currentOffering,
      activeEntitlement,
      isPro,
      currentPlanLabel,
      availablePackages,
      monthlyPackage,
      refreshAll,
      refreshCustomerInfo,
      refreshOfferings,
      fetchCurrentOffering,
      purchasePackage,
      purchaseNamedPackage,
      restorePurchases,
      syncPurchases,
      presentPaywall,
      presentPaywallIfNeeded,
      presentCustomerCenter,
      hasEntitlement,
    ]
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat() {
  const context = React.useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used inside RevenueCatProvider.');
  }
  return context;
}
