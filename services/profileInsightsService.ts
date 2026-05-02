import { supabase } from '../lib/supabase';

const WARDROBE_ANALYTICS_SELECT =
  'id, user_id, main_category, season, primary_color, vibe_tags, is_listed, listed, wardrobe_status, created_at';
const WARDROBE_ANALYTICS_NO_LEGACY_LISTED_SELECT =
  'id, user_id, main_category, season, primary_color, vibe_tags, is_listed, wardrobe_status, created_at';
const WARDROBE_ANALYTICS_LEGACY_LISTED_ONLY_SELECT =
  'id, user_id, main_category, season, primary_color, vibe_tags, listed, wardrobe_status, created_at';
const WARDROBE_ANALYTICS_FALLBACK_SELECT =
  'id, user_id, main_category, season, primary_color, vibe_tags, is_listed, listed, created_at';
const WARDROBE_ANALYTICS_FALLBACK_NO_LEGACY_LISTED_SELECT =
  'id, user_id, main_category, season, primary_color, vibe_tags, is_listed, created_at';
const WARDROBE_ANALYTICS_FALLBACK_LEGACY_LISTED_ONLY_SELECT =
  'id, user_id, main_category, season, primary_color, vibe_tags, listed, created_at';
const WARDROBE_ANALYTICS_MINIMAL_SELECT =
  'id, user_id, main_category, season, primary_color, vibe_tags, created_at';
const SAVED_OUTFIT_ANALYTICS_SELECT = 'id, user_id, season, is_favorite, created_at';
const PROFILE_INSIGHT_SELECT = 'style_tags';

function normalizeText(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizeColorLabel(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function normalizeCategoryLabel(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function normalizeSeason(value: unknown) {
  const normalized = normalizeText(value)?.toLowerCase() || null;
  if (!normalized) return 'All-season';
  if (normalized === 'all') return 'All-season';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function isMissingColumnError(error: any, field: string) {
  return String(error?.message || '').toLowerCase().includes(`wardrobe.${String(field || '').toLowerCase()}`);
}

function isMissingSchemaError(error: any, target?: string) {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (target && !normalized.includes(String(target).toLowerCase())) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the table') ||
    normalized.includes('schema cache') ||
    normalized.includes('column') ||
    normalized.includes('relation')
  );
}

function countValues(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .forEach((value) => {
      counts.set(String(value), (counts.get(String(value)) || 0) + 1);
    });
  return counts;
}

function mapCountsToSortedEntries(
  counts: Map<string, number>,
  formatter: (value: string) => string = (value) => value,
) {
  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .map(([value, count]) => ({
      key: value,
      label: formatter(value),
      count,
    }));
}

function getFavoriteRatio(savedLookCount: number, favoriteLookCount: number) {
  if (!savedLookCount) return 0;
  return Math.round((favoriteLookCount / savedLookCount) * 100);
}

async function fetchWardrobeAnalyticsSource(userId: string) {
  const attempts = [
    { select: WARDROBE_ANALYTICS_SELECT, useOwnedFilter: true },
    { select: WARDROBE_ANALYTICS_NO_LEGACY_LISTED_SELECT, useOwnedFilter: true },
    { select: WARDROBE_ANALYTICS_LEGACY_LISTED_ONLY_SELECT, useOwnedFilter: true },
    { select: WARDROBE_ANALYTICS_FALLBACK_SELECT, useOwnedFilter: false },
    { select: WARDROBE_ANALYTICS_FALLBACK_NO_LEGACY_LISTED_SELECT, useOwnedFilter: false },
    { select: WARDROBE_ANALYTICS_FALLBACK_LEGACY_LISTED_ONLY_SELECT, useOwnedFilter: false },
    { select: WARDROBE_ANALYTICS_MINIMAL_SELECT, useOwnedFilter: false },
  ];

  let lastError: any = null;

  for (const attempt of attempts) {
    let query = supabase.from('wardrobe').select(attempt.select).eq('user_id', userId);
    if (attempt.useOwnedFilter) {
      query = query.or('wardrobe_status.eq.owned,wardrobe_status.is.null');
    }

    const response: any = await query;
    if (!response.error) {
      return response.data || [];
    }

    lastError = response.error;
    const missingKnownColumn =
      isMissingColumnError(response.error, 'wardrobe_status') ||
      isMissingColumnError(response.error, 'is_listed') ||
      isMissingColumnError(response.error, 'listed');

    if (!missingKnownColumn) {
      throw response.error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

async function fetchSavedOutfitAnalyticsSource(userId: string) {
  const { data, error } = await supabase
    .from('saved_outfits')
    .select(SAVED_OUTFIT_ANALYTICS_SELECT)
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

async function fetchProfileStyleTags(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_INSIGHT_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error && !isMissingSchemaError(error, 'profiles')) {
    throw error;
  }

  return Array.isArray(data?.style_tags) ? data.style_tags.filter(Boolean) : [];
}

async function fetchFeaturedFitCount(userId: string) {
  const response = await supabase
    .from('featured_outfits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (response.error) {
    if (isMissingSchemaError(response.error, 'featured_outfits')) {
      return { count: 0, available: false };
    }
    throw response.error;
  }

  return { count: response.count || 0, available: true };
}

export function deriveStyleAnalytics(args: {
  wardrobeItems: any[];
  savedOutfits: any[];
  profileStyleTags?: string[];
  featuredFitCount?: number;
}) {
  const wardrobeItems = Array.isArray(args.wardrobeItems) ? args.wardrobeItems : [];
  const savedOutfits = Array.isArray(args.savedOutfits) ? args.savedOutfits : [];
  const profileStyleTags = Array.isArray(args.profileStyleTags) ? args.profileStyleTags.filter(Boolean) : [];
  const featuredFitCount = Number(args.featuredFitCount) || 0;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const listedCount = wardrobeItems.filter((item) => item?.is_listed === true || item?.listed === true).length;
  const favoriteLookCount = savedOutfits.filter((outfit) => outfit?.is_favorite).length;
  const recentSaved7 = savedOutfits.filter((outfit) => new Date(outfit?.created_at || 0).getTime() >= sevenDaysAgo).length;
  const recentSaved30 = savedOutfits.filter((outfit) => new Date(outfit?.created_at || 0).getTime() >= thirtyDaysAgo).length;

  const categoryCounts = countValues(wardrobeItems.map((item) => normalizeCategoryLabel(item?.main_category)));
  const seasonCounts = countValues(wardrobeItems.map((item) => normalizeSeason(item?.season)));
  const savedSeasonCounts = countValues(savedOutfits.map((outfit) => normalizeSeason(outfit?.season)));
  const colorCounts = countValues(wardrobeItems.map((item) => normalizeColorLabel(item?.primary_color)));
  const vibeCounts = countValues(
    wardrobeItems.flatMap((item) => (Array.isArray(item?.vibe_tags) ? item.vibe_tags : [])).map((tag) => normalizeText(tag)),
  );

  const topCategories = mapCountsToSortedEntries(categoryCounts, (value) => normalizeCategoryLabel(value) || value);
  const topSeasons = mapCountsToSortedEntries(seasonCounts, (value) => normalizeSeason(value));
  const topSavedSeasons = mapCountsToSortedEntries(savedSeasonCounts, (value) => normalizeSeason(value));
  const topColors = mapCountsToSortedEntries(colorCounts, (value) => normalizeColorLabel(value) || value);
  const topVibes = mapCountsToSortedEntries(vibeCounts);

  return {
    closetCount: wardrobeItems.length,
    listedCount,
    savedLookCount: savedOutfits.length,
    favoriteLookCount,
    featuredFitCount,
    favoriteRatio: getFavoriteRatio(savedOutfits.length, favoriteLookCount),
    recentSaved7,
    recentSaved30,
    topColor: topColors[0]?.label || null,
    topCategory: topCategories[0]?.label || null,
    topSeason: topSavedSeasons[0]?.label || topSeasons[0]?.label || null,
    topVibe: topVibes[0]?.label || profileStyleTags[0] || null,
    categoryBreakdown: topCategories,
    seasonBreakdown: topSeasons,
    savedSeasonBreakdown: topSavedSeasons,
    colorBreakdown: topColors,
    vibeBreakdown: topVibes,
    profileStyleTags,
  };
}

export async function fetchProfileAnalytics(userId: string) {
  const [wardrobeItems, savedOutfits, profileStyleTags, featuredFitMeta] = await Promise.all([
    fetchWardrobeAnalyticsSource(userId),
    fetchSavedOutfitAnalyticsSource(userId),
    fetchProfileStyleTags(userId),
    fetchFeaturedFitCount(userId),
  ]);

  return {
    wardrobeItems,
    savedOutfits,
    profileStyleTags,
    featuredFitsAvailable: featuredFitMeta.available,
    featuredFitCount: featuredFitMeta.count,
    metrics: deriveStyleAnalytics({
      wardrobeItems,
      savedOutfits,
      profileStyleTags,
      featuredFitCount: featuredFitMeta.count,
    }),
  };
}
