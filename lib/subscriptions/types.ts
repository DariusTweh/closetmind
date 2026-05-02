export type PlanTier = 'free' | 'plus' | 'pro';

export type SubscriptionLimitValue = number;

export type UiLimitValue = number | 'unlimited';

export type FeatureName =
  | 'closet_item'
  | 'saved_outfit'
  | 'outfit_generation'
  | 'style_this_item'
  | 'ai_tryon'
  | 'premium_organization';

export type UserPlanSource = 'revenuecat' | 'supabase' | 'manual' | 'default';

export type UserPlan = {
  tier: PlanTier;
  source: UserPlanSource;
  isPremium: boolean;
};

export type TierLimits = {
  closetItems: SubscriptionLimitValue;
  savedOutfits: SubscriptionLimitValue;
  outfitGenerationsPerMonth: SubscriptionLimitValue;
  styleThisItemPerMonth: SubscriptionLimitValue;
  aiTryOnsPerMonth: SubscriptionLimitValue;
  premiumOrganization: boolean;
  allPremiumTools?: boolean;
};

export type TryOnAddOnProduct = {
  productId: string;
  credits: number;
  priceLabel: string;
};

export type FeatureAccessResult = {
  allowed: boolean;
  tier: PlanTier;
  used?: number;
  limit?: UiLimitValue;
  remaining?: UiLimitValue;
  addOnCreditsRemaining?: number;
  reason?: string;
  recommendedUpgrade?: 'plus' | 'pro' | 'tryon_pack';
};

export type MonthlyUsageRow = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  outfit_generations_count: number;
  style_this_item_count: number;
  tryons_count: number;
  verdicts_count: number;
  created_at: string;
  updated_at: string;
};
