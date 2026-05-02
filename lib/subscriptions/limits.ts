import type { PlanTier, SubscriptionLimitValue, TierLimits, TryOnAddOnProduct } from './types';

export const PLAN_TIERS = ['free', 'plus', 'pro'] as const;

export const REVENUECAT_ENTITLEMENT_IDS = {
  plus: 'closana_plus',
  pro: 'closana_pro',
} as const;

export const REVENUECAT_LEGACY_ENTITLEMENT_IDS = {
  pro: ['closana Pro', 'ClosPro'],
} as const;

export const ADD_ON_PRODUCTS: Record<string, TryOnAddOnProduct> = {
  'com.dariustweh.closana.tryons.3': {
    productId: 'com.dariustweh.closana.tryons.3',
    credits: 3,
    priceLabel: '$2.99',
  },
  'com.dariustweh.closana.tryons.10': {
    productId: 'com.dariustweh.closana.tryons.10',
    credits: 10,
    priceLabel: '$8.99',
  },
};

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  free: {
    closetItems: 75,
    savedOutfits: 20,
    outfitGenerationsPerMonth: 50,
    styleThisItemPerMonth: 50,
    aiTryOnsPerMonth: 0,
    premiumOrganization: false,
  },
  plus: {
    closetItems: 400,
    savedOutfits: Number.POSITIVE_INFINITY,
    outfitGenerationsPerMonth: 200,
    styleThisItemPerMonth: 200,
    aiTryOnsPerMonth: 5,
    premiumOrganization: true,
  },
  pro: {
    closetItems: Number.POSITIVE_INFINITY,
    savedOutfits: Number.POSITIVE_INFINITY,
    outfitGenerationsPerMonth: 500,
    styleThisItemPerMonth: 500,
    aiTryOnsPerMonth: 15,
    premiumOrganization: true,
    allPremiumTools: true,
  },
};

export const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  plus: 1,
  pro: 2,
};

function normalizeTier(tier?: string | null): PlanTier {
  const normalized = String(tier || '').trim().toLowerCase();
  if (normalized === 'plus' || normalized === 'pro') {
    return normalized;
  }
  return 'free';
}

export function getTierRank(tier?: string | null) {
  return TIER_RANK[normalizeTier(tier)];
}

export function isUnlimited(value: SubscriptionLimitValue | null | undefined) {
  return value === Number.POSITIVE_INFINITY;
}

export function toUiLimitValue(value: SubscriptionLimitValue | null | undefined) {
  if (isUnlimited(value)) {
    return 'unlimited' as const;
  }
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function getEffectiveLimits(tier?: string | null) {
  return TIER_LIMITS[normalizeTier(tier)];
}
