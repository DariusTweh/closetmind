import { supabase } from './supabase';

export const ONBOARDING_STAGES = {
  PROFILE_BASICS: 'profile_basics',
  USE_INTENT: 'use_intent',
  STYLE_VIBE: 'style_vibe',
  TONE: 'tone',
  PREFERENCE_SIGNALS: 'preference_signals',
  FAVORITE_STORES: 'favorite_stores',
  STYLE_UPLOAD: 'style_upload',
  MODEL: 'model',
  COMPLETE: 'complete',
} as const;

export type OnboardingStage = (typeof ONBOARDING_STAGES)[keyof typeof ONBOARDING_STAGES];

export const ONBOARDING_STAGE_TO_ROUTE: Record<OnboardingStage, string> = {
  [ONBOARDING_STAGES.PROFILE_BASICS]: 'OnboardingProfileBasics',
  [ONBOARDING_STAGES.USE_INTENT]: 'UseIntent',
  [ONBOARDING_STAGES.STYLE_VIBE]: 'StyleVibe',
  [ONBOARDING_STAGES.TONE]: 'ToneSelect',
  [ONBOARDING_STAGES.PREFERENCE_SIGNALS]: 'OnboardingPreferenceSignals',
  [ONBOARDING_STAGES.FAVORITE_STORES]: 'OnboardingFavoriteStores',
  [ONBOARDING_STAGES.STYLE_UPLOAD]: 'OnboardingStyle',
  [ONBOARDING_STAGES.MODEL]: 'OnboardingModal',
  [ONBOARDING_STAGES.COMPLETE]: 'MainTabs',
};

const PROFILE_GATE_SELECT_FIELDS =
  'id, full_name, username, use_intent, style_tags, tone, onboarding_completed, onboarding_stage, body_image_paths, body_image_urls';
const PROFILE_GATE_NO_STAGE_SELECT_FIELDS =
  'id, full_name, username, use_intent, style_tags, tone, onboarding_completed, body_image_paths, body_image_urls';
const PROFILE_GATE_MINIMAL_SELECT_FIELDS =
  'id, full_name, username, use_intent, style_tags, tone, onboarding_completed';
const STYLE_PROFILE_STAGE_HINT_FIELDS =
  'user_id, primary_vibes, silhouettes, seasons, core_colors, accent_colors, fit_prefs, keywords, preferred_occasions, favorite_categories, avoided_categories, preferred_patterns, avoided_colors, avoided_vibes';

export function isMissingColumnError(errorOrMessage: any, field: string, table = 'profiles') {
  const normalized = String(errorOrMessage?.message || errorOrMessage?.details || errorOrMessage || '')
    .trim()
    .toLowerCase();
  const normalizedField = String(field || '').trim().toLowerCase();
  if (!normalized || !normalizedField) return false;
  return (
    normalized.includes(`${table}.${normalizedField}`) ||
    normalized.includes(`'${normalizedField}' column of '${table}'`) ||
    (normalized.includes(`column of '${table}'`) && normalized.includes(normalizedField)) ||
    (normalized.includes('does not exist') && normalized.includes(normalizedField))
  );
}

function normalizeStage(value: unknown): OnboardingStage | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  const stage = Object.values(ONBOARDING_STAGES).find((entry) => entry === normalized);
  return stage || null;
}

function hasAnyValues(value: unknown) {
  if (Array.isArray(value)) return value.some(Boolean);
  return Boolean(String(value || '').trim());
}

function inferOnboardingStage(profile: any, styleProfile: any): OnboardingStage {
  if (profile?.onboarding_completed === true) {
    return ONBOARDING_STAGES.COMPLETE;
  }

  const explicitStage = normalizeStage(profile?.onboarding_stage);
  if (explicitStage) {
    return explicitStage;
  }

  const bodyImages =
    (Array.isArray(profile?.body_image_paths) && profile.body_image_paths.length) ||
    (Array.isArray(profile?.body_image_urls) && profile.body_image_urls.length);

  const hasStructuredStyleSignals =
    styleProfile &&
    [
      styleProfile?.primary_vibes,
      styleProfile?.silhouettes,
      styleProfile?.seasons,
      styleProfile?.core_colors,
      styleProfile?.accent_colors,
      styleProfile?.fit_prefs,
      styleProfile?.keywords,
      styleProfile?.preferred_occasions,
      styleProfile?.favorite_categories,
      styleProfile?.preferred_patterns,
      styleProfile?.avoided_colors,
      styleProfile?.avoided_vibes,
      styleProfile?.avoided_categories,
    ].some(hasAnyValues);

  const hasManualPreferenceSignals =
    styleProfile &&
    [
      styleProfile?.preferred_formality,
      styleProfile?.favorite_categories,
      styleProfile?.avoided_categories,
      styleProfile?.preferred_patterns,
      styleProfile?.avoided_patterns,
      styleProfile?.avoided_colors,
      styleProfile?.avoided_vibes,
    ].some(hasAnyValues);

  if (bodyImages && hasManualPreferenceSignals) {
    return ONBOARDING_STAGES.MODEL;
  }

  if (bodyImages && hasStructuredStyleSignals) {
    return ONBOARDING_STAGES.PREFERENCE_SIGNALS;
  }

  if (bodyImages || hasStructuredStyleSignals) {
    return ONBOARDING_STAGES.STYLE_UPLOAD;
  }

  if (String(profile?.tone || '').trim()) {
    return ONBOARDING_STAGES.STYLE_UPLOAD;
  }

  if (Array.isArray(profile?.style_tags) && profile.style_tags.length) {
    return ONBOARDING_STAGES.TONE;
  }

  if (String(profile?.use_intent || '').trim()) {
    return ONBOARDING_STAGES.STYLE_VIBE;
  }

  if (String(profile?.username || '').trim() || String(profile?.full_name || '').trim()) {
    return ONBOARDING_STAGES.USE_INTENT;
  }

  return ONBOARDING_STAGES.PROFILE_BASICS;
}

export function getRouteForOnboardingStage(stage: OnboardingStage | null | undefined) {
  if (!stage) return 'OnboardingProfileBasics';
  return ONBOARDING_STAGE_TO_ROUTE[stage] || 'OnboardingProfileBasics';
}

export async function ensureProfileShell(userId: string) {
  let response: any = await supabase
    .from('profiles')
    .select('id, onboarding_completed, onboarding_stage')
    .eq('id', userId)
    .maybeSingle();

  if (response.error && isMissingColumnError(response.error, 'onboarding_stage')) {
    response = await supabase
      .from('profiles')
      .select('id, onboarding_completed')
      .eq('id', userId)
      .maybeSingle();
  }

  if (response.error) {
    throw response.error;
  }

  if (response.data?.id) {
    return response.data;
  }

  const fullPayload: any = {
    id: userId,
    created_at: new Date().toISOString(),
    onboarding_completed: false,
    onboarding_stage: ONBOARDING_STAGES.PROFILE_BASICS,
    style_tags: [],
    tone: null,
    use_intent: null,
  };

  let insertResponse: any = await supabase.from('profiles').insert([fullPayload]);
  if (insertResponse.error && isMissingColumnError(insertResponse.error, 'onboarding_stage')) {
    const fallbackPayload = { ...fullPayload };
    delete fallbackPayload.onboarding_stage;
    insertResponse = await supabase.from('profiles').insert([fallbackPayload]);
  }

  if (insertResponse.error && isMissingColumnError(insertResponse.error, 'style_tags')) {
    insertResponse = await supabase.from('profiles').insert([
      {
        id: userId,
        created_at: new Date().toISOString(),
        onboarding_completed: false,
      },
    ]);
  }

  if (insertResponse.error?.code === '23505') {
    const duplicateRead = await supabase
      .from('profiles')
      .select('id, onboarding_completed, onboarding_stage')
      .eq('id', userId)
      .maybeSingle();

    if (!duplicateRead.error && duplicateRead.data?.id) {
      return duplicateRead.data;
    }
  }

  if (insertResponse.error) {
    throw insertResponse.error;
  }

  return { id: userId, onboarding_completed: false, onboarding_stage: ONBOARDING_STAGES.PROFILE_BASICS };
}

async function fetchProfileGateState(userId: string) {
  let response: any = await supabase
    .from('profiles')
    .select(PROFILE_GATE_SELECT_FIELDS)
    .eq('id', userId)
    .maybeSingle();

  if (response.error && isMissingColumnError(response.error, 'onboarding_stage')) {
    response = await supabase
      .from('profiles')
      .select(PROFILE_GATE_NO_STAGE_SELECT_FIELDS)
      .eq('id', userId)
      .maybeSingle();
  }

  if (
    response.error &&
    (isMissingColumnError(response.error, 'body_image_paths') || isMissingColumnError(response.error, 'body_image_urls'))
  ) {
    response = await supabase
      .from('profiles')
      .select(PROFILE_GATE_MINIMAL_SELECT_FIELDS)
      .eq('id', userId)
      .maybeSingle();
  }

  if (response.error) {
    throw response.error;
  }

  return response.data || null;
}

async function fetchStyleProfileGateHints(userId: string) {
  let response: any = await supabase
    .from('user_style_profiles')
    .select(STYLE_PROFILE_STAGE_HINT_FIELDS)
    .eq('user_id', userId)
    .maybeSingle();

  if (response.error && response.error.code === 'PGRST116') {
    return null;
  }

  if (
    response.error &&
    [
      'primary_vibes',
      'silhouettes',
      'seasons',
      'core_colors',
      'accent_colors',
      'preferred_occasions',
      'favorite_categories',
      'avoided_vibes',
    ].some((field) => isMissingColumnError(response.error, field, 'user_style_profiles'))
  ) {
    return null;
  }

  if (response.error) {
    throw response.error;
  }

  return response.data || null;
}

export async function resolveAppEntry() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user?.id) {
    return {
      routeName: 'Login',
      stage: null as OnboardingStage | null,
      userId: null as string | null,
    };
  }

  await ensureProfileShell(session.user.id);
  const [profile, styleProfile] = await Promise.all([
    fetchProfileGateState(session.user.id),
    fetchStyleProfileGateHints(session.user.id).catch(() => null),
  ]);
  const nextStage = inferOnboardingStage(profile, styleProfile);

  return {
    routeName: getRouteForOnboardingStage(nextStage),
    stage: nextStage,
    userId: session.user.id,
  };
}

export async function updateOnboardingProgress(
  userId: string,
  {
    stage,
    completed,
  }: {
    stage?: OnboardingStage | null;
    completed?: boolean;
  },
) {
  const payload: Record<string, any> = {};
  if (typeof completed === 'boolean') {
    payload.onboarding_completed = completed;
  }
  if (stage) {
    payload.onboarding_stage = stage;
  }
  if (!Object.keys(payload).length) {
    return;
  }

  let response: any = await supabase.from('profiles').update(payload).eq('id', userId);
  if (response.error && isMissingColumnError(response.error, 'onboarding_stage')) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.onboarding_stage;
    if (!Object.keys(fallbackPayload).length) {
      return;
    }
    response = await supabase.from('profiles').update(fallbackPayload).eq('id', userId);
  }

  if (response.error && !isMissingColumnError(response.error, 'onboarding_completed')) {
    throw response.error;
  }
}
