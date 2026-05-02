import { Platform } from 'react-native';

export const CLOSANA_PRO_ENTITLEMENT_ID = 'closana Pro';
export const REVENUECAT_FALLBACK_TEST_API_KEY = 'test_OInIlDKMoYacxQGNvTnfuiTirrI';
export const REVENUECAT_MONTHLY_PRODUCT_ID = 'com.dariustweh.closana.premium.monthly';
export const REVENUECAT_YEARLY_PRODUCT_ID = 'com.dariustweh.closana.premium.yearly';
export const REVENUECAT_OFFERING_ID = 'default';
export const REVENUECAT_MONTHLY_PACKAGE_ID = 'monthly';
export const REVENUECAT_YEARLY_PACKAGE_ID = 'yearly';
export const REVENUECAT_TEST_PRO_ENTITLEMENT_ID = 'ClosPro';
export const REVENUECAT_TEST_MONTHLY_PRODUCT_ID = 'ClosanaPro';
export const REVENUECAT_TEST_YEARLY_PRODUCT_ID = 'ClosanaProYearly';

export const REVENUECAT_PACKAGE_IDENTIFIERS = {
  lifetime: 'lifetime',
  yearly: 'yearly',
  monthly: 'monthly',
} as const;

export type RevenueCatPackageIdentifier =
  (typeof REVENUECAT_PACKAGE_IDENTIFIERS)[keyof typeof REVENUECAT_PACKAGE_IDENTIFIERS];
export type RevenueCatRuntimeMode = 'production' | 'test_store';
export type RevenueCatRuntimeConfig = {
  mode: RevenueCatRuntimeMode;
  useTestStore: boolean;
  apiKey: string | null;
  entitlementId: string;
  offeringId: string;
  monthlyPackageId: string;
  monthlyProductId: string;
  yearlyPackageId: string;
  yearlyProductId: string;
};

function readValue(value: string | undefined | null) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function readBoolean(value: string | undefined | null) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

export function shouldUseRevenueCatTestStore() {
  const explicitMode = readValue(process.env.EXPO_PUBLIC_REVENUECAT_MODE)?.toLowerCase();
  const explicitToggle = readBoolean(process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE);
  return explicitToggle || explicitMode === 'test' || explicitMode === 'test_store';
}

export function resolveRevenueCatRuntimeConfig(): RevenueCatRuntimeConfig {
  const shared = readValue(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);
  const ios = readValue(process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY);
  const android = readValue(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY);
  const testApiKey = readValue(process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY);
  const useTestStore = shouldUseRevenueCatTestStore();

  if (useTestStore) {
    return {
      mode: 'test_store',
      useTestStore: true,
      apiKey: testApiKey,
      entitlementId: REVENUECAT_TEST_PRO_ENTITLEMENT_ID,
      offeringId: REVENUECAT_OFFERING_ID,
      monthlyPackageId: REVENUECAT_MONTHLY_PACKAGE_ID,
      monthlyProductId: REVENUECAT_TEST_MONTHLY_PRODUCT_ID,
      yearlyPackageId: REVENUECAT_YEARLY_PACKAGE_ID,
      yearlyProductId: REVENUECAT_TEST_YEARLY_PRODUCT_ID,
    };
  }

  let apiKey: string | null = shared || ios || android || null;

  if (Platform.OS === 'ios') {
    apiKey = ios;
  } else if (Platform.OS === 'android') {
    apiKey = android || shared || null;
  }

  return {
    mode: 'production',
    useTestStore: false,
    apiKey,
    entitlementId: CLOSANA_PRO_ENTITLEMENT_ID,
    offeringId: REVENUECAT_OFFERING_ID,
    monthlyPackageId: REVENUECAT_MONTHLY_PACKAGE_ID,
    monthlyProductId: REVENUECAT_MONTHLY_PRODUCT_ID,
    yearlyPackageId: REVENUECAT_YEARLY_PACKAGE_ID,
    yearlyProductId: REVENUECAT_YEARLY_PRODUCT_ID,
  };
}

export function resolveRevenueCatApiKey() {
  return resolveRevenueCatRuntimeConfig().apiKey;
}

export function isTestStoreApiKey(apiKey: string | null | undefined) {
  return String(apiKey || '').trim().toLowerCase().startsWith('test_');
}

export function resolveRevenueCatConfigurationIssue(
  apiKey: string | null | undefined = resolveRevenueCatApiKey()
) {
  const runtimeConfig = resolveRevenueCatRuntimeConfig();

  if (runtimeConfig.useTestStore) {
    if (!apiKey) {
      return 'RevenueCat test-store mode is enabled, but EXPO_PUBLIC_REVENUECAT_TEST_API_KEY is missing. Add the real RevenueCat Test Store key, then rebuild the app.';
    }

    if (!isTestStoreApiKey(apiKey) && apiKey !== REVENUECAT_FALLBACK_TEST_API_KEY) {
      return 'RevenueCat test-store mode is enabled, but the configured key is not a valid RevenueCat test-store key. Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY to your real test_ key, then rebuild the app.';
    }

    return null;
  }

  if (Platform.OS === 'ios') {
    if (!apiKey) {
      return 'RevenueCat is missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY. Set it to your real RevenueCat iOS public SDK key for the project that contains offering `default`, packages `monthly` and `yearly`, and entitlement `closana Pro`, then rebuild the app.';
    }

    if (isTestStoreApiKey(apiKey) || apiKey === REVENUECAT_FALLBACK_TEST_API_KEY) {
      return 'RevenueCat is using an invalid iOS SDK key. Replace the current test_ key with your real RevenueCat iOS public SDK key for Klozu, then rebuild the app.';
    }
  }

  return null;
}

export function normalizeRevenueCatConfigurationError(error: unknown, fallback: string) {
  const runtimeConfig = resolveRevenueCatRuntimeConfig();
  const message =
    typeof error === 'string'
      ? error
      : typeof (error as any)?.message === 'string'
        ? String((error as any).message)
        : fallback;

  if (/invalid api key|credentials issue|sdk configuration is not valid/i.test(message)) {
    if (runtimeConfig.useTestStore) {
      return 'RevenueCat rejected the configured test-store key. Update EXPO_PUBLIC_REVENUECAT_TEST_API_KEY with the real RevenueCat test_ key for the test-store project, then rebuild the app.';
    }
    return 'RevenueCat rejected the configured iOS SDK key. Update EXPO_PUBLIC_REVENUECAT_IOS_API_KEY with the real RevenueCat iOS public SDK key for Klozu, then rebuild the app.';
  }

  return message || fallback;
}
