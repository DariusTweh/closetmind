import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { resolvePrivateMediaUrl } from './privateMedia';
import { toStyleRequestWardrobeList } from './styleRequestWardrobe';
import { supabase } from './supabase';

const LOCATION_REFRESH_WINDOW_MS = 6 * 60 * 60 * 1000;
const PROFILE_MEDIA_BUCKET = 'onboarding';
const PROFILE_SELECT_FIELDS = 'avatar_url, avatar_path';
const PROFILE_LEGACY_SELECT_FIELDS = 'avatar_url';

export const getDashboardCacheKey = (uid: string) => `home_cache_v1_${uid}`;

type DashboardRequestOptions = {
  outfitWeather: string | null;
  outfitLocation: string | null;
  currentOutfit: any[];
  wardrobe: any[];
  avoidIds?: Array<string | null | undefined>;
};

type DailyFitEvaluation = {
  accepted: boolean;
  score: number;
  issues: string[];
};

export function parseTemperatureValue(weatherText: string | null | undefined) {
  const match = String(weatherText || '').match(/-?\d+(\.\d+)?/);
  const value = match ? Number(match[0]) : NaN;
  return Number.isFinite(value) ? value : 72;
}

export function inferSeasonFromDate(date = new Date()) {
  const month = date.getMonth() + 1;
  if ([12, 1, 2].includes(month)) return 'winter';
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  return 'fall';
}

function formatDateKey(date = new Date(), useUTC = false) {
  const year = useUTC ? date.getUTCFullYear() : date.getFullYear();
  const month = String((useUTC ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
  const day = String(useUTC ? date.getUTCDate() : date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function buildDailyFitLookupKeys(date = new Date()) {
  const localToday = formatDateKey(date, false);
  const utcToday = formatDateKey(date, true);
  const localYesterday = formatDateKey(addDays(date, -1), false);
  return [...new Set([localToday, utcToday, localYesterday])];
}

function normalizeGeneratedOutfitEntries(payload: any) {
  if (!payload || typeof payload !== 'object') return [] as Array<{ id: string; reason: string | null }>;

  const fromOutfit = Array.isArray(payload?.outfit) ? payload.outfit : [];
  if (fromOutfit.length) {
    return fromOutfit
      .map((entry: any) => ({
        id: String(entry?.id || '').trim(),
        reason: String(entry?.reason || '').trim() || null,
      }))
      .filter((entry) => entry.id);
  }

  const stepValues = payload?.steps && typeof payload.steps === 'object'
    ? Object.values(payload.steps)
    : [];

  return (Array.isArray(stepValues) ? stepValues : [])
    .map((entry: any) => ({
      id: String(entry?.id || '').trim(),
      reason: String(entry?.reason || '').trim() || null,
    }))
    .filter((entry) => entry.id);
}

function normalizeTextToken(value: any) {
  return String(value || '').trim().toLowerCase();
}

function itemSearchText(item: any) {
  return [
    item?.name,
    item?.type,
    item?.subcategory,
    item?.main_category,
    item?.garment_function,
    item?.style_role,
    item?.material_guess,
    item?.formality,
    ...(Array.isArray(item?.occasion_tags) ? item.occasion_tags : []),
    ...(Array.isArray(item?.weather_use) ? item.weather_use : []),
  ]
    .map((value) => normalizeTextToken(value))
    .filter(Boolean)
    .join(' ');
}

function isShortBottom(item: any) {
  const text = itemSearchText(item);
  return /\b(short|shorts)\b/.test(text);
}

function isTailoredOuterwear(item: any) {
  const text = itemSearchText(item);
  return /\b(blazer|sport coat|suit jacket|tailored jacket)\b/.test(text);
}

function isHeavyOuterwear(item: any) {
  const text = itemSearchText(item);
  return /\b(puffer|parka|overcoat|heavy coat|wool coat|trench|pea coat|shearling)\b/.test(text);
}

function isAthleticOrLounge(item: any) {
  const text = itemSearchText(item);
  return /\b(athletic|gym|training|running|basketball|mesh short|sport short|track|jogger|sweat|lounge)\b/.test(text);
}

function getItemFormalityLevel(item: any) {
  const explicit = normalizeTextToken(item?.formality);
  if (['formal', 'dressy'].includes(explicit)) return 4;
  if (['elevated', 'smart_casual', 'smart-casual', 'smart casual'].includes(explicit)) return 3;
  if (['casual', 'everyday'].includes(explicit)) return 2;
  if (['athletic', 'lounge'].includes(explicit)) return 1;

  const text = itemSearchText(item);
  if (/\b(blazer|tailored|formal|dressy|suit|trouser|trousers|slacks)\b/.test(text)) return 4;
  if (/\b(loafer|button-up|button down|oxford|knit polo|smart)\b/.test(text)) return 3;
  if (/\b(athletic|gym|track|mesh short|running|training|sweat|lounge)\b/.test(text)) return 1;
  return 2;
}

export function evaluateDailyFitCandidate(items: any[], weatherText?: string | null): DailyFitEvaluation {
  const outfitItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!outfitItems.length) {
    return {
      accepted: false,
      score: -100,
      issues: ['empty_outfit'],
    };
  }

  const temperature = parseTemperatureValue(weatherText);
  const issues: string[] = [];

  const shortsPresent = outfitItems.some((item) => isShortBottom(item));
  const tailoredOuterwearPresent = outfitItems.some((item) => isTailoredOuterwear(item));
  const heavyOuterwearPresent = outfitItems.some((item) => isHeavyOuterwear(item));
  const athleticPresent = outfitItems.some((item) => isAthleticOrLounge(item));
  const formalityLevels = outfitItems.map((item) => getItemFormalityLevel(item));
  const maxFormality = formalityLevels.length ? Math.max(...formalityLevels) : 2;
  const minFormality = formalityLevels.length ? Math.min(...formalityLevels) : 2;

  if (shortsPresent && tailoredOuterwearPresent) {
    issues.push('tailored_outerwear_with_shorts');
  }

  if (shortsPresent && maxFormality >= 4 && temperature < 82) {
    issues.push('dressy_shorts_mismatch');
  }

  if (temperature <= 62 && shortsPresent) {
    issues.push('shorts_too_cold');
  }

  if (temperature >= 84 && heavyOuterwearPresent) {
    issues.push('outerwear_too_heavy_for_heat');
  }

  if (maxFormality - minFormality >= 3) {
    issues.push('formality_gap_too_wide');
  }

  if (athleticPresent && maxFormality >= 4) {
    issues.push('athletic_with_tailored');
  }

  return {
    accepted: issues.length === 0,
    score: 100 - issues.length * 30,
    issues,
  };
}

export function mapGeneratedOutfitToWardrobe(payload: any, wardrobe: any[]) {
  const entries = normalizeGeneratedOutfitEntries(payload);
  if (!entries.length) return [] as any[];

  const wardrobeById = new Map(
    (Array.isArray(wardrobe) ? wardrobe : []).map((item) => [String(item?.id || ''), item]),
  );

  return entries
    .map((entry) => {
      const match = wardrobeById.get(entry.id);
      if (!match) return null;
      return {
        ...match,
        reason: entry.reason || match?.reason || null,
      };
    })
    .filter(Boolean);
}

function normalizeWeatherDescription(weatherText: string | null | undefined) {
  const raw = String(weatherText || '').trim();
  if (!raw) return 'Unknown';

  const withoutTemp = raw
    .replace(/-?\d+(\.\d+)?\s*°?\s*[fFcC]?/g, ' ')
    .replace(/[,/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutTemp || raw;
}

export function buildDashboardRegenerationRequest({
  outfitWeather,
  outfitLocation,
  currentOutfit,
  wardrobe,
  avoidIds = [],
}: DashboardRequestOptions) {
  const temperature = parseTemperatureValue(outfitWeather);
  const season = inferSeasonFromDate();
  const location = outfitLocation || 'your area';
  const recentIds = Array.isArray(currentOutfit)
    ? currentOutfit.map((item) => item?.id).filter(Boolean)
    : [];
  const normalizedAvoidIds = Array.from(
    new Set(
      [...recentIds, ...(Array.isArray(avoidIds) ? avoidIds : [])]
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );

  return {
    context:
      `Daily fit for ${temperature}°F in ${location}. Build a real, wearable everyday outfit from the closet. ` +
      `Keep formality consistent, respect the weather, and avoid incoherent pairings like blazers with casual shorts or heavy outerwear in heat.`,
    season,
    temperature,
    recent_item_ids: recentIds,
    avoidIds: normalizedAvoidIds,
    wardrobe: toStyleRequestWardrobeList(wardrobe),
  };
}

export async function resolveCurrentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  return user?.id || null;
}

export async function readDashboardCache(uid: string) {
  try {
    const raw = await AsyncStorage.getItem(getDashboardCacheKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function persistDashboardCache(uid: string, patch: Record<string, unknown>) {
  try {
    const raw = await AsyncStorage.getItem(getDashboardCacheKey(uid));
    const base = raw ? JSON.parse(raw) : {};
    const next = { ...base, ...patch };
    await AsyncStorage.setItem(getDashboardCacheKey(uid), JSON.stringify(next));
  } catch {}
}

export async function clearDashboardCache(uid: string) {
  try {
    await AsyncStorage.removeItem(getDashboardCacheKey(uid));
  } catch {}
}

export function getRecentWardrobeItems(wardrobe: any[], limit = 10) {
  return Array.isArray(wardrobe) ? wardrobe.slice(0, limit) : [];
}

export function extractDailyFitSummary(dailyFit: any) {
  if (!dailyFit) {
    return {
      outfitWeather: null,
      outfitLocation: null,
    };
  }

  const nextTemperature = dailyFit?.weather?.temperature;
  const fallbackWeather = typeof dailyFit?.weather === 'string'
    ? dailyFit.weather.trim()
    : null;
  const outfitWeather = Number.isFinite(Number(nextTemperature))
    ? `${Number(nextTemperature)}°F`
    : fallbackWeather || null;
  const rawLocation = String(dailyFit?.weather?.city || dailyFit?.location || '').trim();
  const outfitLocation = rawLocation || (dailyFit?.weather ? 'Your Area' : null);

  return {
    outfitWeather,
    outfitLocation,
  };
}

function extractDailyFitItemIds(dailyFit: any) {
  const items = Array.isArray(dailyFit?.items) ? dailyFit.items : [];
  return items.map((item) => String(item?.id || '')).filter(Boolean);
}

export function mapDailyFitItems(dailyFit: any, wardrobe: any[], fallbackItems: any[] = []) {
  const itemIds = extractDailyFitItemIds(dailyFit);
  const wardrobeById = new Map(
    (Array.isArray(wardrobe) ? wardrobe : []).map((item) => [String(item?.id || ''), item])
  );
  const fallbackById = new Map(
    (Array.isArray(fallbackItems) ? fallbackItems : []).map((item) => [String(item?.id || ''), item])
  );
  const allowFallback = wardrobeById.size === 0;

  return itemIds
    .map((id) => wardrobeById.get(id) || (allowFallback ? fallbackById.get(id) : null))
    .filter(Boolean);
}

export async function fetchDailyFitForUser(userId: string) {
  const lookupKeys = buildDailyFitLookupKeys();
  const { data, error } = await supabase
    .from('daily_outfits')
    .select('id, user_id, outfit_date, items, context, weather, created_at')
    .eq('user_id', userId)
    .in('outfit_date', lookupKeys)
    .order('created_at', { ascending: false });

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return null;

  const rowsByDate = new Map(rows.map((row) => [row.outfit_date, row]));
  for (const key of lookupKeys) {
    if (rowsByDate.has(key)) {
      return rowsByDate.get(key);
    }
  }

  return rows[0] || null;
}

function isMissingColumnOrRelationError(error: any) {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the table') ||
    normalized.includes('schema cache') ||
    normalized.includes('column') ||
    normalized.includes('relation')
  );
}

export async function persistManualDailyFit(args: {
  userId: string;
  items: any[];
  outfitWeather?: string | null;
  outfitLocation?: string | null;
  context?: any;
}) {
  const userId = String(args?.userId || '').trim();
  const normalizedItems = (Array.isArray(args?.items) ? args.items : [])
    .map((item: any) => ({
      id: String(item?.id || '').trim(),
      reason: String(item?.reason || '').trim() || null,
    }))
    .filter((item) => item.id);

  if (!userId || !normalizedItems.length) return false;

  const outfitDate = buildDailyFitLookupKeys(new Date())[0];
  const weatherText = String(args?.outfitWeather || '').trim();
  const weatherPayload = {
    temperature: parseTemperatureValue(weatherText),
    description: normalizeWeatherDescription(weatherText),
    city: String(args?.outfitLocation || '').trim() || 'Your Area',
    source: 'manual_regenerate',
  };
  const contextPayload = args?.context ?? null;

  let response: any = await supabase
    .from('daily_outfits')
    .upsert(
      {
        user_id: userId,
        outfit_date: outfitDate,
        items: normalizedItems,
        context: contextPayload,
        weather: weatherPayload,
      },
      { onConflict: 'user_id,outfit_date' },
    );

  if (response?.error && isMissingColumnOrRelationError(response.error)) {
    response = await supabase
      .from('daily_outfits')
      .upsert(
        {
          user_id: userId,
          outfit_date: outfitDate,
          items: normalizedItems,
        },
        { onConflict: 'user_id,outfit_date' },
      );
  }

  if (response?.error) {
    console.warn('persistManualDailyFit failed:', response.error?.message || response.error);
    return false;
  }

  return true;
}

export async function maybeRefreshUserLocation(userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('location_updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  const locationUpdatedAt = profile?.location_updated_at
    ? new Date(profile.location_updated_at).getTime()
    : NaN;
  if (
    Number.isFinite(locationUpdatedAt)
    && Date.now() - locationUpdatedAt < LOCATION_REFRESH_WINDOW_MS
  ) {
    return;
  }

  let { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return;

  const { coords } = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = coords;

  await supabase
    .from('profiles')
    .update({
      location_lat: latitude,
      location_lon: longitude,
      location_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export async function fetchProfileAvatarForUser(userId: string) {
  let response = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_FIELDS)
    .eq('id', userId)
    .maybeSingle();

  if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
    response = await supabase
      .from('profiles')
      .select(PROFILE_LEGACY_SELECT_FIELDS)
      .eq('id', userId)
      .maybeSingle();
  }

  if (response.error) {
    throw response.error;
  }

  const avatarUrl = String(response.data?.avatar_url || '').trim();
  const avatarPath = String(response.data?.avatar_path || '').trim();
  if (!avatarUrl && !avatarPath) {
    return null;
  }

  return resolvePrivateMediaUrl({
    path: avatarPath || null,
    legacyUrl: avatarUrl || null,
    bucket: PROFILE_MEDIA_BUCKET,
  }).catch(() => avatarUrl || null);
}

function hasMissingProfileColumn(message: string, field: string) {
  const normalized = String(message || '').toLowerCase();
  const normalizedField = String(field || '').toLowerCase();
  return (
    normalized.includes(`profiles.${normalizedField}`)
    || normalized.includes(`'${normalizedField}' column of 'profiles'`)
    || (normalized.includes("column of 'profiles'") && normalized.includes(normalizedField))
  );
}
