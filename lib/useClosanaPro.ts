import React from 'react';
import { useRevenueCat } from '../providers/RevenueCatProvider';
import { useRequirePro } from '../hooks/useRequirePro';

export function useClosanaPro() {
  const {
    entitlementId,
    isPro,
    activeEntitlement,
    customerInfo,
    hasEntitlement,
  } = useRevenueCat();
  const { requirePro } = useRequirePro();

  return {
    entitlementId,
    isPro,
    activeEntitlement,
    customerInfo,
    hasClosanaPro: hasEntitlement(entitlementId),
    ensureClosanaPro: requirePro,
  };
}
