import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRevenueCat } from '../providers/RevenueCatProvider';
import { PAYWALL_AVAILABLE } from '../lib/subscriptions/paywallConfig';

export function useUpgradeWall() {
  const navigation = useNavigation<any>();
  const { presentPaywall } = useRevenueCat();

  const openUpgrade = React.useCallback(async () => {
    if (!PAYWALL_AVAILABLE) {
      return false;
    }

    try {
      return await presentPaywall();
    } catch (error: any) {
      console.warn('Upgrade wall paywall launch failed:', error?.message || error);
      navigation.navigate('Subscription' as never);
      return false;
    }
  }, [navigation, presentPaywall]);

  const openTryOnPack = React.useCallback(async () => {
    return openUpgrade();
  }, [openUpgrade]);

  return {
    isPaywallAvailable: PAYWALL_AVAILABLE,
    openUpgrade,
    openTryOnPack,
  };
}
