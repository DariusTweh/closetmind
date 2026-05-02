import { supabase } from '../supabase';
import { SubscriptionLimitError } from './errors';
import { getUserPlan } from './getUserPlan';
import { getEffectiveLimits, isUnlimited, toUiLimitValue } from './limits';
import type { FeatureAccessResult, FeatureName, MonthlyUsageRow, PlanTier } from './types';

const MONTHLY_USAGE_SELECT =
  'id, user_id, period_start, period_end, outfit_generations_count, style_this_item_count, tryons_count, verdicts_count, created_at, updated_at';

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function buildBlockedResult(args: {
  tier: PlanTier;
  reason: string;
  used?: number;
  limit?: number | 'unlimited';
  remaining?: number | 'unlimited';
  addOnCreditsRemaining?: number;
  recommendedUpgrade?: 'plus' | 'pro' | 'tryon_pack';
}): FeatureAccessResult {
  return {
    allowed: false,
    tier: args.tier,
    reason: args.reason,
    used: args.used,
    limit: args.limit,
    remaining: args.remaining,
    addOnCreditsRemaining: args.addOnCreditsRemaining,
    recommendedUpgrade: args.recommendedUpgrade,
  };
}

function buildAllowedResult(args: {
  tier: PlanTier;
  used?: number;
  limit?: number | 'unlimited';
  remaining?: number | 'unlimited';
  addOnCreditsRemaining?: number;
}): FeatureAccessResult {
  return {
    allowed: true,
    tier: args.tier,
    used: args.used,
    limit: args.limit,
    remaining: args.remaining,
    addOnCreditsRemaining: args.addOnCreditsRemaining,
  };
}

function getRecommendedUpgrade(featureName: FeatureName, tier: PlanTier): 'plus' | 'pro' | 'tryon_pack' | undefined {
  if (featureName === 'ai_tryon') {
    if (tier === 'free') return 'plus';
    if (tier === 'plus') return 'pro';
    if (tier === 'pro') return 'tryon_pack';
  }

  if (tier === 'free') return 'plus';
  if (tier === 'plus') return 'pro';
  return undefined;
}

async function countWardrobeItems(userId: string) {
  const response = await supabase
    .from('wardrobe')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('wardrobe_status', 'scanned_candidate');

  if (response.error) {
    throw response.error;
  }

  return Number(response.count || 0);
}

async function countSavedOutfits(userId: string) {
  const response = await supabase
    .from('saved_outfits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (response.error) {
    throw response.error;
  }

  return Number(response.count || 0);
}

async function getOldestAvailableTryOnCredit(userId: string) {
  const nowIso = new Date().toISOString();
  let response: any = await supabase
    .from('user_tryon_credits')
    .select('id, credits_remaining, expires_at, purchased_at')
    .eq('user_id', userId)
    .gt('credits_remaining', 0)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('purchased_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (response.error) {
    throw response.error;
  }

  return response.data || null;
}

export function getCurrentMonthlyPeriod() {
  const period_start = toDateOnly(startOfMonth());
  const period_end = toDateOnly(endOfMonth());

  return {
    period_start,
    period_end,
  };
}

export async function getOrCreateMonthlyUsage(userId: string): Promise<MonthlyUsageRow> {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('Missing user id for usage tracking.');
  }

  const { period_start, period_end } = getCurrentMonthlyPeriod();
  const existing = await supabase
    .from('user_usage_limits')
    .select(MONTHLY_USAGE_SELECT)
    .eq('user_id', normalizedUserId)
    .eq('period_start', period_start)
    .eq('period_end', period_end)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    return existing.data as MonthlyUsageRow;
  }

  const insertResponse = await supabase
    .from('user_usage_limits')
    .insert([
      {
        user_id: normalizedUserId,
        period_start,
        period_end,
      },
    ])
    .select(MONTHLY_USAGE_SELECT)
    .single();

  if (insertResponse.error) {
    const retryResponse = await supabase
      .from('user_usage_limits')
      .select(MONTHLY_USAGE_SELECT)
      .eq('user_id', normalizedUserId)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .single();

    if (retryResponse.error) {
      throw insertResponse.error;
    }

    return retryResponse.data as MonthlyUsageRow;
  }

  return insertResponse.data as MonthlyUsageRow;
}

export async function getTryOnCreditBalance(userId: string) {
  const nowIso = new Date().toISOString();
  const response = await supabase
    .from('user_tryon_credits')
    .select('credits_remaining')
    .eq('user_id', userId)
    .gt('credits_remaining', 0)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (response.error) {
    throw response.error;
  }

  return (response.data || []).reduce(
    (total: number, row: any) => total + Math.max(0, Number(row?.credits_remaining || 0)),
    0,
  );
}

export async function canUseFeature(userId: string, featureName: FeatureName): Promise<FeatureAccessResult> {
  const plan = await getUserPlan(userId).catch((error: any) => {
    console.warn('User plan lookup failed during limit check:', error?.message || error);
    return {
      tier: 'free' as const,
      source: 'default' as const,
      isPremium: false,
    };
  });
  const limits = getEffectiveLimits(plan.tier);

  try {
    switch (featureName) {
      case 'closet_item': {
        const used = await countWardrobeItems(userId);
        if (isUnlimited(limits.closetItems)) {
          return buildAllowedResult({
            tier: plan.tier,
            used,
            limit: 'unlimited',
            remaining: 'unlimited',
          });
        }

        const remaining = Math.max(0, limits.closetItems - used);
        if (used >= limits.closetItems) {
          return buildBlockedResult({
            tier: plan.tier,
            used,
            limit: toUiLimitValue(limits.closetItems),
            remaining,
            reason: "You've reached your closet limit.",
            recommendedUpgrade: getRecommendedUpgrade(featureName, plan.tier),
          });
        }

        return buildAllowedResult({
          tier: plan.tier,
          used,
          limit: toUiLimitValue(limits.closetItems),
          remaining,
        });
      }

      case 'saved_outfit': {
        const used = await countSavedOutfits(userId);
        if (isUnlimited(limits.savedOutfits)) {
          return buildAllowedResult({
            tier: plan.tier,
            used,
            limit: 'unlimited',
            remaining: 'unlimited',
          });
        }

        const remaining = Math.max(0, limits.savedOutfits - used);
        if (used >= limits.savedOutfits) {
          return buildBlockedResult({
            tier: plan.tier,
            used,
            limit: toUiLimitValue(limits.savedOutfits),
            remaining,
            reason: "You've reached your saved outfit limit.",
            recommendedUpgrade: getRecommendedUpgrade(featureName, plan.tier),
          });
        }

        return buildAllowedResult({
          tier: plan.tier,
          used,
          limit: toUiLimitValue(limits.savedOutfits),
          remaining,
        });
      }

      case 'outfit_generation':
      case 'style_this_item': {
        const usage = await getOrCreateMonthlyUsage(userId);
        const used =
          featureName === 'outfit_generation'
            ? Number(usage.outfit_generations_count || 0)
            : Number(usage.style_this_item_count || 0);
        const limit =
          featureName === 'outfit_generation'
            ? limits.outfitGenerationsPerMonth
            : limits.styleThisItemPerMonth;

        if (isUnlimited(limit)) {
          return buildAllowedResult({
            tier: plan.tier,
            used,
            limit: 'unlimited',
            remaining: 'unlimited',
          });
        }

        const remaining = Math.max(0, limit - used);
        if (used >= limit) {
          return buildBlockedResult({
            tier: plan.tier,
            used,
            limit: toUiLimitValue(limit),
            remaining,
            reason:
              featureName === 'outfit_generation'
                ? "You've used your monthly outfit generations."
                : "You've used your monthly Style This Item generations.",
            recommendedUpgrade: getRecommendedUpgrade(featureName, plan.tier),
          });
        }

        return buildAllowedResult({
          tier: plan.tier,
          used,
          limit: toUiLimitValue(limit),
          remaining,
        });
      }

      case 'ai_tryon': {
        const [usage, addOnCreditsRemaining] = await Promise.all([
          getOrCreateMonthlyUsage(userId),
          getTryOnCreditBalance(userId),
        ]);
        const used = Number(usage.tryons_count || 0);
        const monthlyLimit = limits.aiTryOnsPerMonth;
        const monthlyRemaining = isUnlimited(monthlyLimit) ? Number.POSITIVE_INFINITY : Math.max(0, monthlyLimit - used);
        const totalRemaining = isUnlimited(monthlyRemaining)
          ? Number.POSITIVE_INFINITY
          : Math.max(0, monthlyRemaining + addOnCreditsRemaining);
        const totalLimit = isUnlimited(monthlyLimit)
          ? Number.POSITIVE_INFINITY
          : monthlyLimit + addOnCreditsRemaining;

        if (totalRemaining <= 0) {
          return buildBlockedResult({
            tier: plan.tier,
            used,
            limit: toUiLimitValue(totalLimit),
            remaining: 0,
            addOnCreditsRemaining,
            reason: "You're out of AI try-ons.",
            recommendedUpgrade: getRecommendedUpgrade(featureName, plan.tier),
          });
        }

        return buildAllowedResult({
          tier: plan.tier,
          used,
          limit: toUiLimitValue(totalLimit),
          remaining: isUnlimited(totalRemaining) ? 'unlimited' : totalRemaining,
          addOnCreditsRemaining,
        });
      }

      case 'premium_organization': {
        if (!limits.premiumOrganization) {
          return buildBlockedResult({
            tier: plan.tier,
            reason: 'Premium organization is available on paid plans only.',
            recommendedUpgrade: getRecommendedUpgrade(featureName, plan.tier),
          });
        }

        return buildAllowedResult({
          tier: plan.tier,
        });
      }

      default:
        return buildBlockedResult({
          tier: plan.tier,
          reason: 'This feature is not available right now.',
        });
    }
  } catch (error: any) {
    console.warn(`Limit check failed for ${featureName}:`, error?.message || error);
    return buildBlockedResult({
      tier: plan.tier,
      reason:
        featureName === 'closet_item' || featureName === 'saved_outfit'
          ? 'We could not verify your current limit right now.'
          : 'Usage tracking is temporarily unavailable for this feature.',
      recommendedUpgrade: getRecommendedUpgrade(featureName, plan.tier),
    });
  }
}

export async function incrementUsage(userId: string, featureName: FeatureName) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('Missing user id for usage increment.');
  }

  if (featureName === 'closet_item' || featureName === 'saved_outfit' || featureName === 'premium_organization') {
    return null;
  }

  const usage = await getOrCreateMonthlyUsage(normalizedUserId);
  const updated_at = new Date().toISOString();

  if (featureName === 'outfit_generation') {
    const nextValue = Number(usage.outfit_generations_count || 0) + 1;
    const response = await supabase
      .from('user_usage_limits')
      .update({
        outfit_generations_count: nextValue,
        updated_at,
      })
      .eq('id', usage.id)
      .eq('user_id', normalizedUserId);

    if (response.error) {
      throw response.error;
    }

    return nextValue;
  }

  if (featureName === 'style_this_item') {
    const nextValue = Number(usage.style_this_item_count || 0) + 1;
    const response = await supabase
      .from('user_usage_limits')
      .update({
        style_this_item_count: nextValue,
        updated_at,
      })
      .eq('id', usage.id)
      .eq('user_id', normalizedUserId);

    if (response.error) {
      throw response.error;
    }

    return nextValue;
  }

  if (featureName === 'ai_tryon') {
    const plan = await getUserPlan(normalizedUserId);
    const limits = getEffectiveLimits(plan.tier);
    const monthlyLimit = limits.aiTryOnsPerMonth;
    const usedMonthly = Number(usage.tryons_count || 0);

    if (isUnlimited(monthlyLimit) || usedMonthly < monthlyLimit) {
      const response = await supabase
        .from('user_usage_limits')
        .update({
          tryons_count: usedMonthly + 1,
          updated_at,
        })
        .eq('id', usage.id)
        .eq('user_id', normalizedUserId);

      if (response.error) {
        throw response.error;
      }

      return {
        source: 'monthly',
        remainingMonthly: isUnlimited(monthlyLimit) ? Number.POSITIVE_INFINITY : Math.max(0, monthlyLimit - usedMonthly - 1),
      };
    }

    const creditRow = await getOldestAvailableTryOnCredit(normalizedUserId);
    if (!creditRow?.id) {
      const accessResult = await canUseFeature(normalizedUserId, 'ai_tryon');
      throw new SubscriptionLimitError('ai_tryon', accessResult, accessResult.reason);
    }

    const nextCreditsRemaining = Math.max(0, Number(creditRow.credits_remaining || 0) - 1);
    const response = await supabase
      .from('user_tryon_credits')
      .update({
        credits_remaining: nextCreditsRemaining,
      })
      .eq('id', creditRow.id)
      .eq('user_id', normalizedUserId);

    if (response.error) {
      throw response.error;
    }

    return {
      source: 'add_on',
      creditsRemaining: nextCreditsRemaining,
    };
  }

  return null;
}
