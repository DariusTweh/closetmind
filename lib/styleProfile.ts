import { supabase } from './supabase';
import { isMissingColumnError } from './onboarding';

export type StructuredStyleProfile = {
  user_id?: string | null;
  primary_vibes?: string[];
  silhouettes?: string[];
  seasons?: string[];
  core_colors?: string[];
  accent_colors?: string[];
  fit_prefs?: string[] | Record<string, any> | null;
  keywords?: string[];
  preferred_occasions?: string[];
  preferred_formality?: string | null;
  favorite_categories?: string[];
  avoided_categories?: string[];
  preferred_patterns?: string[];
  avoided_patterns?: string[];
  avoided_colors?: string[];
  avoided_vibes?: string[];
  profile_confidence?: number | null;
};

const FULL_STYLE_PROFILE_FIELDS = [
  'user_id',
  'primary_vibes',
  'silhouettes',
  'seasons',
  'core_colors',
  'accent_colors',
  'fit_prefs',
  'keywords',
  'preferred_occasions',
  'preferred_formality',
  'favorite_categories',
  'avoided_categories',
  'preferred_patterns',
  'avoided_patterns',
  'avoided_colors',
  'avoided_vibes',
  'profile_confidence',
];

const FALLBACK_STYLE_PROFILE_FIELDS = [
  'user_id',
  'favorite_categories',
  'avoided_categories',
  'preferred_patterns',
  'avoided_patterns',
  'avoided_colors',
  'avoided_vibes',
  'preferred_formality',
];

export const FULL_STYLE_PROFILE_SELECT_FIELDS = FULL_STYLE_PROFILE_FIELDS.join(', ');
export const FALLBACK_STYLE_PROFILE_SELECT_FIELDS = FALLBACK_STYLE_PROFILE_FIELDS.join(', ');
export const PROFILE_PREF_SELECT_FIELDS = 'style_tags, color_prefs, fit_prefs';
export const PROFILE_PREF_FALLBACK_SELECT_FIELDS = 'style_tags';

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeTagValue(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');
}

export function normalizeArrayValues(value: unknown, limit = 10) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value
      .map((entry) => normalizeTagValue(entry))
      .filter(Boolean),
  ).slice(0, limit);
}

function normalizeFitPrefs(value: StructuredStyleProfile['fit_prefs']) {
  if (Array.isArray(value)) {
    return normalizeArrayValues(value, 8);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return normalizeArrayValues(
    Object.values(value).flatMap((entry) => (Array.isArray(entry) ? entry : [entry])),
    8,
  );
}

export function normalizeStyleProfile(
  input: Partial<StructuredStyleProfile> | null | undefined,
): StructuredStyleProfile {
  const normalized = input || {};
  const fitPrefs = normalizeFitPrefs(normalized.fit_prefs);
  const preferredFormality = String(normalized.preferred_formality || '').trim().toLowerCase() || null;
  const profileConfidenceRaw = Number(normalized.profile_confidence);
  const profileConfidence = Number.isFinite(profileConfidenceRaw) ? profileConfidenceRaw : null;

  return {
    user_id: normalized.user_id || null,
    primary_vibes: normalizeArrayValues(normalized.primary_vibes, 6),
    silhouettes: normalizeArrayValues(normalized.silhouettes, 6),
    seasons: normalizeArrayValues(normalized.seasons, 4).filter((entry) =>
      ['spring', 'summer', 'fall', 'winter', 'all'].includes(entry),
    ),
    core_colors: normalizeArrayValues(normalized.core_colors, 6),
    accent_colors: normalizeArrayValues(normalized.accent_colors, 6),
    fit_prefs: fitPrefs,
    keywords: normalizeArrayValues(normalized.keywords, 10),
    preferred_occasions: normalizeArrayValues(normalized.preferred_occasions, 6),
    preferred_formality: preferredFormality,
    favorite_categories: normalizeArrayValues(normalized.favorite_categories, 7),
    avoided_categories: normalizeArrayValues(normalized.avoided_categories, 7),
    preferred_patterns: normalizeArrayValues(normalized.preferred_patterns, 8),
    avoided_patterns: normalizeArrayValues(normalized.avoided_patterns, 8),
    avoided_colors: normalizeArrayValues(normalized.avoided_colors, 10),
    avoided_vibes: normalizeArrayValues(normalized.avoided_vibes, 8),
    profile_confidence: profileConfidence,
  };
}

function mergeArrayField(
  {
    manual,
    ai,
    existing,
    blocked = [],
    limit = 10,
  }: {
    manual?: string[];
    ai?: string[];
    existing?: string[];
    blocked?: string[];
    limit?: number;
  },
) {
  const blockedSet = new Set(blocked);
  return uniqueStrings([...(manual || []), ...(ai || []), ...(existing || [])].filter((entry) => entry && !blockedSet.has(entry))).slice(
    0,
    limit,
  );
}

export function mergeStyleProfileSignals({
  manualProfile,
  aiProfile,
  existingProfile,
}: {
  manualProfile?: Partial<StructuredStyleProfile> | null;
  aiProfile?: Partial<StructuredStyleProfile> | null;
  existingProfile?: Partial<StructuredStyleProfile> | null;
}) {
  const manual = normalizeStyleProfile(manualProfile);
  const ai = normalizeStyleProfile(aiProfile);
  const existing = normalizeStyleProfile(existingProfile);

  const avoidedVibes = uniqueStrings([...(manual.avoided_vibes || []), ...(existing.avoided_vibes || []), ...(ai.avoided_vibes || [])]);
  const avoidedColors = uniqueStrings([...(manual.avoided_colors || []), ...(existing.avoided_colors || []), ...(ai.avoided_colors || [])]);
  const avoidedPatterns = uniqueStrings([
    ...(manual.avoided_patterns || []),
    ...(existing.avoided_patterns || []),
    ...(ai.avoided_patterns || []),
  ]);
  const avoidedCategories = uniqueStrings([
    ...(manual.avoided_categories || []),
    ...(existing.avoided_categories || []),
    ...(ai.avoided_categories || []),
  ]);

  return normalizeStyleProfile({
    primary_vibes: mergeArrayField({
      manual: manual.primary_vibes,
      ai: ai.primary_vibes,
      existing: existing.primary_vibes,
      blocked: avoidedVibes,
      limit: 6,
    }),
    silhouettes: mergeArrayField({
      manual: manual.silhouettes,
      ai: ai.silhouettes,
      existing: existing.silhouettes,
      limit: 6,
    }),
    seasons: mergeArrayField({
      manual: manual.seasons,
      ai: ai.seasons,
      existing: existing.seasons,
      limit: 4,
    }),
    core_colors: mergeArrayField({
      manual: manual.core_colors,
      ai: ai.core_colors,
      existing: existing.core_colors,
      blocked: avoidedColors,
      limit: 6,
    }),
    accent_colors: mergeArrayField({
      manual: manual.accent_colors,
      ai: ai.accent_colors,
      existing: existing.accent_colors,
      blocked: avoidedColors,
      limit: 6,
    }),
    fit_prefs: mergeArrayField({
      manual: normalizeFitPrefs(manual.fit_prefs),
      ai: normalizeFitPrefs(ai.fit_prefs),
      existing: normalizeFitPrefs(existing.fit_prefs),
      limit: 8,
    }),
    keywords: mergeArrayField({
      manual: manual.keywords,
      ai: ai.keywords,
      existing: existing.keywords,
      limit: 10,
    }),
    preferred_occasions: mergeArrayField({
      manual: manual.preferred_occasions,
      ai: ai.preferred_occasions,
      existing: existing.preferred_occasions,
      limit: 6,
    }),
    preferred_formality:
      manual.preferred_formality || ai.preferred_formality || existing.preferred_formality || null,
    favorite_categories: mergeArrayField({
      manual: manual.favorite_categories,
      ai: ai.favorite_categories,
      existing: existing.favorite_categories,
      blocked: avoidedCategories,
      limit: 7,
    }),
    avoided_categories: avoidedCategories,
    preferred_patterns: mergeArrayField({
      manual: manual.preferred_patterns,
      ai: ai.preferred_patterns,
      existing: existing.preferred_patterns,
      blocked: avoidedPatterns,
      limit: 8,
    }),
    avoided_patterns: avoidedPatterns,
    avoided_colors: avoidedColors,
    avoided_vibes: avoidedVibes,
    profile_confidence: ai.profile_confidence ?? existing.profile_confidence ?? null,
  });
}

export function buildProfileStyleTags(profile: Partial<StructuredStyleProfile> | null | undefined) {
  const normalized = normalizeStyleProfile(profile);
  return uniqueStrings([
    ...(normalized.primary_vibes || []),
    ...(normalized.keywords || []),
  ]).slice(0, 6);
}

export function hasStyleProfileReviewData(profile: Partial<StructuredStyleProfile> | null | undefined) {
  const normalized = normalizeStyleProfile(profile);
  return [
    normalized.primary_vibes,
    normalized.silhouettes,
    normalized.seasons,
    normalized.core_colors,
    normalized.accent_colors,
    normalized.fit_prefs,
    normalized.keywords,
    normalized.preferred_occasions,
    normalized.profile_confidence,
  ].some((entry) => (Array.isArray(entry) ? entry.length > 0 : entry != null));
}

export function buildFallbackStyleProfilePayload(profile: StructuredStyleProfile) {
  const fallbackPayload: Record<string, any> = {};
  FALLBACK_STYLE_PROFILE_FIELDS.forEach((field) => {
    if (field in profile) {
      fallbackPayload[field] = (profile as Record<string, any>)[field];
    }
  });
  return fallbackPayload;
}

export async function fetchStyleProfile(userId: string) {
  let response: any = await supabase
    .from('user_style_profiles')
    .select(FULL_STYLE_PROFILE_SELECT_FIELDS)
    .eq('user_id', userId)
    .maybeSingle();

  if (
    response.error &&
    [
      'primary_vibes',
      'silhouettes',
      'seasons',
      'core_colors',
      'accent_colors',
      'fit_prefs',
      'keywords',
      'preferred_occasions',
      'avoided_patterns',
      'profile_confidence',
    ].some((field) => isMissingColumnError(response.error, field, 'user_style_profiles'))
  ) {
    response = await supabase
      .from('user_style_profiles')
      .select(FALLBACK_STYLE_PROFILE_SELECT_FIELDS)
      .eq('user_id', userId)
      .maybeSingle();
  }

  if (response.error && response.error.code !== 'PGRST116') {
    throw response.error;
  }

  return normalizeStyleProfile(response.data || {});
}

export async function fetchStyleContextSignals(userId: string) {
  let profileResponse: any = await supabase
    .from('profiles')
    .select(PROFILE_PREF_SELECT_FIELDS)
    .eq('id', userId)
    .maybeSingle();

  if (
    profileResponse.error &&
    (isMissingColumnError(profileResponse.error, 'color_prefs') || isMissingColumnError(profileResponse.error, 'fit_prefs'))
  ) {
    profileResponse = await supabase
      .from('profiles')
      .select(PROFILE_PREF_FALLBACK_SELECT_FIELDS)
      .eq('id', userId)
      .maybeSingle();
  }

  if (profileResponse.error && profileResponse.error.code !== 'PGRST116') {
    throw profileResponse.error;
  }

  const preferences = await fetchStyleProfile(userId).catch(() => normalizeStyleProfile({}));

  return {
    profile: profileResponse.data || null,
    preferences,
  };
}

export async function upsertStyleProfile(userId: string, payload: Partial<StructuredStyleProfile>) {
  const normalizedPayload = normalizeStyleProfile({
    ...payload,
    user_id: userId,
  });

  const { data: existing, error: existingError } = await supabase
    .from('user_style_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  let response: any = existing?.user_id
    ? await supabase.from('user_style_profiles').update(normalizedPayload).eq('user_id', userId)
    : await supabase.from('user_style_profiles').insert([normalizedPayload]);

  if (
    response.error &&
    [
      'primary_vibes',
      'silhouettes',
      'seasons',
      'core_colors',
      'accent_colors',
      'fit_prefs',
      'keywords',
      'preferred_occasions',
      'avoided_patterns',
      'profile_confidence',
    ].some((field) => isMissingColumnError(response.error, field, 'user_style_profiles'))
  ) {
    const fallbackPayload = buildFallbackStyleProfilePayload(normalizedPayload);
    response = existing?.user_id
      ? await supabase.from('user_style_profiles').update(fallbackPayload).eq('user_id', userId)
      : await supabase.from('user_style_profiles').insert([{ user_id: userId, ...fallbackPayload }]);
  }

  if (response.error) {
    throw response.error;
  }

  return normalizedPayload;
}
