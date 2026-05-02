import { NativeModules } from 'react-native';
import Purchases from 'react-native-purchases';
import { supabase } from '../supabase';
import {
  PLAN_TIERS,
  REVENUECAT_ENTITLEMENT_IDS,
  REVENUECAT_LEGACY_ENTITLEMENT_IDS,
} from './limits';
import type { PlanTier, UserPlan } from './types';

function normalizeTier(value?: string | null): PlanTier | null {
  const normalized = String(value || '').trim().toLowerCase();
  return PLAN_TIERS.includes(normalized as PlanTier) ? (normalized as PlanTier) : null;
}

function buildResult(tier: PlanTier, source: UserPlan['source']): UserPlan {
  return {
    tier,
    source,
    isPremium: tier !== 'free',
  };
}

async function resolveRevenueCatTier() {
  if (!(NativeModules as any)?.RNPurchases) {
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlements = customerInfo?.entitlements?.active || {};

    if (
      activeEntitlements?.[REVENUECAT_ENTITLEMENT_IDS.pro]?.isActive ||
      REVENUECAT_LEGACY_ENTITLEMENT_IDS.pro.some(
        (entitlementId) => activeEntitlements?.[entitlementId]?.isActive,
      )
    ) {
      return buildResult('pro', 'revenuecat');
    }

    if (activeEntitlements?.[REVENUECAT_ENTITLEMENT_IDS.plus]?.isActive) {
      return buildResult('plus', 'revenuecat');
    }
  } catch (error: any) {
    console.warn('RevenueCat plan resolution failed:', error?.message || error);
  }

  return null;
}

export async function getUserPlan(userId?: string | null): Promise<UserPlan> {
  const revenueCatPlan = await resolveRevenueCatTier();
  if (revenueCatPlan) {
    return revenueCatPlan;
  }

  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    return buildResult('free', 'default');
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan_tier, is_premium, premium_source')
      .eq('id', normalizedUserId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase plan resolution failed:', error.message || error);
      return buildResult('free', 'default');
    }

    const profileTier = normalizeTier(data?.plan_tier);
    const premiumSource = String(data?.premium_source || '').trim().toLowerCase();
    const resolvedSource = premiumSource === 'manual' ? 'manual' : 'supabase';

    if (profileTier) {
      return buildResult(profileTier, resolvedSource);
    }

    if (data?.is_premium) {
      return buildResult('plus', premiumSource === 'manual' ? 'manual' : 'supabase');
    }
  } catch (error: any) {
    console.warn('User plan fallback failed:', error?.message || error);
  }

  return buildResult('free', 'default');
}
