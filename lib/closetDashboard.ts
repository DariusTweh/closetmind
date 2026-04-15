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

export function buildDashboardRegenerationRequest({
  outfitWeather,
  outfitLocation,
  currentOutfit,
  wardrobe,
}: DashboardRequestOptions) {
  const temperature = parseTemperatureValue(outfitWeather);
  const season = inferSeasonFromDate();
  const location = outfitLocation || 'your area';

  return {
    context: `Daily fit for ${temperature}°F in ${location}`,
    season,
    temperature,
    recent_item_ids: Array.isArray(currentOutfit)
      ? currentOutfit.map((item) => item?.id).filter(Boolean)
      : [],
    avoidIds: [],
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
    .select('*')
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
