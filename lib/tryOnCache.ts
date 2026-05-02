import AsyncStorage from '@react-native-async-storage/async-storage';

const TRY_ON_CACHE_PREFIX = 'closetmind.tryon_result.v1';
const TRY_ON_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const tryOnMemoryCache = new Map<string, CachedTryOnResult | null>();

export type TryOnCacheItemLike = {
  id?: string | null;
  source_type?: string | null;
  external_item_id?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  cutout_url?: string | null;
  cutout_image_url?: string | null;
  name?: string | null;
  type?: string | null;
  main_category?: string | null;
};

export type CachedTryOnResult = {
  userId: string;
  sourceKey: string;
  jobId: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  cachedAt: string;
};

function encodeKeyPart(value: string) {
  return encodeURIComponent(String(value || '').trim());
}

function buildStorageKey(userId: string, sourceKey: string) {
  return `${TRY_ON_CACHE_PREFIX}:${encodeKeyPart(userId)}:${encodeKeyPart(sourceKey)}`;
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function isExpired(cachedAt?: string | null) {
  const timestamp = new Date(String(cachedAt || '')).getTime();
  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp > TRY_ON_CACHE_MAX_AGE_MS;
}

function normalizeCachedTryOnResult(value: unknown): CachedTryOnResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const userId = normalizeText((value as any).userId);
  const sourceKey = normalizeText((value as any).sourceKey);
  const cachedAt = normalizeText((value as any).cachedAt);

  if (!userId || !sourceKey || !cachedAt) return null;

  return {
    userId,
    sourceKey,
    jobId: normalizeText((value as any).jobId) || null,
    imagePath: normalizeText((value as any).imagePath) || null,
    imageUrl: normalizeText((value as any).imageUrl) || null,
    cachedAt,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildItemIdentity(item: TryOnCacheItemLike | null | undefined) {
  if (!item) return null;

  const sourceType = normalizeText(item.source_type) || (normalizeText(item.external_item_id) ? 'external' : 'wardrobe');
  const id =
    normalizeText(item.id) ||
    normalizeText(item.external_item_id) ||
    normalizeText(item.image_path) ||
    normalizeText(item.cutout_image_url) ||
    normalizeText(item.cutout_url) ||
    normalizeText(item.image_url);

  if (id) {
    return `${sourceType}:${id}`;
  }

  const label = [normalizeText(item.name), normalizeText(item.type), normalizeText(item.main_category)]
    .filter(Boolean)
    .join('|');

  return label ? `${sourceType}:label:${label}` : null;
}

export function buildTryOnSourceKeys({
  savedOutfitId,
  items,
  lockedItem,
  mode,
}: {
  savedOutfitId?: string | null;
  items?: TryOnCacheItemLike[] | null;
  lockedItem?: TryOnCacheItemLike | null;
  mode?: string | null;
}) {
  const keys: string[] = [];
  const normalizedSavedOutfitId = normalizeText(savedOutfitId);

  if (normalizedSavedOutfitId) {
    keys.push(`saved_outfit:${normalizedSavedOutfitId}`);
  }

  const itemIdentities = Array.isArray(items)
    ? uniqueStrings(items.map((item) => buildItemIdentity(item)).filter(Boolean) as string[]).sort()
    : [];

  if (itemIdentities.length) {
    keys.push(`items:${itemIdentities.join('|')}`);
  }

  const lockedIdentity = buildItemIdentity(lockedItem);
  if (lockedIdentity) {
    if (String(mode || '').trim().toLowerCase() === 'quick') {
      keys.push(`quick_locked:${lockedIdentity}`);
    } else if (!itemIdentities.length) {
      keys.push(`locked:${lockedIdentity}`);
    }
  }

  return uniqueStrings(keys);
}

export async function readCachedTryOnResult({
  userId,
  sourceKey,
}: {
  userId: string;
  sourceKey: string;
}): Promise<CachedTryOnResult | null> {
  const normalizedUserId = normalizeText(userId);
  const normalizedSourceKey = normalizeText(sourceKey);
  if (!normalizedUserId || !normalizedSourceKey) return null;

  const storageKey = buildStorageKey(normalizedUserId, normalizedSourceKey);
  const memoryCached = tryOnMemoryCache.get(storageKey);
  if (memoryCached !== undefined) {
    if (!memoryCached || isExpired(memoryCached.cachedAt)) {
      tryOnMemoryCache.delete(storageKey);
      await AsyncStorage.removeItem(storageKey).catch(() => {});
      return null;
    }
    return memoryCached;
  }

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) {
      tryOnMemoryCache.set(storageKey, null);
      return null;
    }

    const parsed = normalizeCachedTryOnResult(JSON.parse(raw));
    if (!parsed || isExpired(parsed.cachedAt)) {
      tryOnMemoryCache.delete(storageKey);
      await AsyncStorage.removeItem(storageKey).catch(() => {});
      return null;
    }

    tryOnMemoryCache.set(storageKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedTryOnResult({
  userId,
  sourceKeys,
  jobId,
  imagePath,
  imageUrl,
}: {
  userId: string;
  sourceKeys: string[];
  jobId?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null;
}) {
  const normalizedUserId = normalizeText(userId);
  const normalizedSourceKeys = uniqueStrings(sourceKeys.map((entry) => normalizeText(entry)));
  if (!normalizedUserId || !normalizedSourceKeys.length) return;

  const payloads = normalizedSourceKeys.map((sourceKey) => {
    const payload: CachedTryOnResult = {
      userId: normalizedUserId,
      sourceKey,
      jobId: normalizeText(jobId) || null,
      imagePath: normalizeText(imagePath) || null,
      imageUrl: normalizeText(imageUrl) || null,
      cachedAt: new Date().toISOString(),
    };

    return {
      storageKey: buildStorageKey(normalizedUserId, sourceKey),
      payload,
    };
  });

  await Promise.all(
    payloads.map(async ({ storageKey, payload }) => {
      tryOnMemoryCache.set(storageKey, payload);
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    }),
  ).catch(() => {});
}
