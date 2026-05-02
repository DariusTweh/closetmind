import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useRevenueCat } from '../providers/RevenueCatProvider';

export function useRequirePro() {
  const navigation = useNavigation<any>();
  const {
    nativeAvailable,
    configurationIssue,
    entitlementId,
    hasEntitlement,
    presentPaywallIfNeeded,
    refreshCustomerInfo,
  } = useRevenueCat();

  const requirePro = React.useCallback(async () => {
    if (hasEntitlement(entitlementId)) {
      return true;
    }

    try {
      if (!nativeAvailable) {
        Alert.alert(
          'Premium unavailable',
          'RevenueCat is not available in this runtime yet. Use a development build or TestFlight build to access purchases.'
        );
        return false;
      }

      if (configurationIssue) {
        Alert.alert('Subscription setup unavailable', configurationIssue);
        return false;
      }

      const unlocked = await presentPaywallIfNeeded();
      if (unlocked) {
        return true;
      }

      const latestInfo = await refreshCustomerInfo();
      return Boolean(latestInfo?.entitlements.active?.[entitlementId]?.isActive);
    } catch (error: any) {
      Alert.alert(
        'Premium required',
        error?.message || 'We could not open the RevenueCat paywall right now. Opening the Klozu Premium screen instead.'
      );
      navigation.navigate('Subscription' as never);
      return false;
    }
  }, [
    configurationIssue,
    entitlementId,
    hasEntitlement,
    nativeAvailable,
    navigation,
    presentPaywallIfNeeded,
    refreshCustomerInfo,
  ]);

  return {
    isPro: hasEntitlement(entitlementId),
    requirePro,
  };
}
