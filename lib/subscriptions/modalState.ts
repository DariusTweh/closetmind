import type { FeatureAccessResult, FeatureName, PlanTier, UiLimitValue } from './types';

export type UpgradeModalState = {
  visible: boolean;
  featureName: FeatureName;
  used?: number;
  limit?: UiLimitValue;
  remaining?: UiLimitValue;
  tier: PlanTier;
  recommendedUpgrade?: 'plus' | 'pro' | 'tryon_pack';
};

export const HIDDEN_UPGRADE_MODAL_STATE: UpgradeModalState = {
  visible: false,
  featureName: 'closet_item',
  tier: 'free',
};

export function buildUpgradeModalState(
  featureName: FeatureName,
  accessResult: FeatureAccessResult,
): UpgradeModalState {
  return {
    visible: true,
    featureName,
    used: accessResult.used,
    limit: accessResult.limit,
    remaining: accessResult.remaining,
    tier: accessResult.tier,
    recommendedUpgrade: accessResult.recommendedUpgrade,
  };
}
