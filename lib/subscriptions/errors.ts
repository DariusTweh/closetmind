import type { FeatureAccessResult, FeatureName } from './types';

export class SubscriptionLimitError extends Error {
  featureName: FeatureName;
  accessResult: FeatureAccessResult;
  code: 'subscription_limit';

  constructor(featureName: FeatureName, accessResult: FeatureAccessResult, message?: string) {
    super(message || accessResult.reason || 'Subscription limit reached.');
    this.name = 'SubscriptionLimitError';
    this.featureName = featureName;
    this.accessResult = accessResult;
    this.code = 'subscription_limit';
  }
}

export function isSubscriptionLimitError(error: unknown): error is SubscriptionLimitError {
  return error instanceof SubscriptionLimitError || (error as any)?.code === 'subscription_limit';
}
