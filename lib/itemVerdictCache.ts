import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItemVerdictResponse, VerdictItem } from './itemVerdict';
import { isExternalItemLike } from './wardrobePayload';

const ITEM_VERDICT_CACHE_PREFIX = 'closetmind.item_verdict_cache.v1';
const CLOSET_REVISION_PREFIX = 'closetmind.closet_revision.v1';
export const ITEM_VERDICT_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const verdictMemoryCache = new Map<string, CachedItemVerdictEntry | null>();
const closetRevisionMemoryCache = new Map<string, ClosetRevisionState>();

export type CachedProofItemsById = Record<string, VerdictItem>;

export type CachedItemVerdictEntry = {
  userId: string;
  itemKey: string;
  closetRevision: number;
  cachedAt: string;
  verdict: ItemVerdictResponse;
  item: VerdictItem | null;
  proofItemsById: CachedProofItemsById;
};

export type ClosetRevisionState = {
  userId: string;
  revision: number;
  updatedAt: string;
};

function encodeKeyPart(value: string) {
  return encodeURIComponent(String(value || '').trim());
}

function buildClosetRevisionStorageKey(userId: string) {
  return `${CLOSET_REVISION_PREFIX}:${encodeKeyPart(userId)}`;
}

function buildVerdictStorageKey(userId: string, itemKey: string, closetRevision: number) {
  return `${ITEM_VERDICT_CACHE_PREFIX}:${encodeKeyPart(userId)}:${Math.max(0, closetRevision)}:${encodeKeyPart(itemKey)}`;
}

function isObjectLike(value: unknown) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeUserId(userId: string) {
  return String(userId || '').trim();
}

function normalizeItemKey(itemKey: string) {
  return String(itemKey || '').trim();
}

function isExpired(cachedAt?: string | null) {
  const timestamp = new Date(String(cachedAt || '')).getTime();
  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp > ITEM_VERDICT_CACHE_MAX_AGE_MS;
}

function normalizeProofItemsById(value: unknown): CachedProofItemsById {
  if (!isObjectLike(value)) return {};

  const normalized: CachedProofItemsById = {};
  for (const [key, item] of Object.entries(value)) {
    const itemId = String(key || '').trim();
    if (!itemId || !isObjectLike(item)) continue;
    normalized[itemId] = item as VerdictItem;
  }

  return normalized;
}

function normalizeCachedVerdictEntry(value: unknown): CachedItemVerdictEntry | null {
  if (!isObjectLike(value) || !isObjectLike((value as any).verdict)) return null;

  const userId = normalizeUserId((value as any).userId);
  const itemKey = normalizeItemKey((value as any).itemKey);
  const closetRevision = Number((value as any).closetRevision);
  const cachedAt = String((value as any).cachedAt || '').trim();

  if (!userId || !itemKey || !Number.isFinite(closetRevision) || closetRevision < 0 || !cachedAt) {
    return null;
  }

  return {
    userId,
    itemKey,
    closetRevision,
    cachedAt,
    verdict: (value as any).verdict as ItemVerdictResponse,
    item: isObjectLike((value as any).item) ? ((value as any).item as VerdictItem) : null,
    proofItemsById: normalizeProofItemsById((value as any).proofItemsById),
  };
}

function normalizeClosetRevisionState(value: unknown, fallbackUserId?: string | null): ClosetRevisionState | null {
  if (!isObjectLike(value)) return null;

  const userId = normalizeUserId((value as any).userId || fallbackUserId || '');
  const revision = Number((value as any).revision);
  const updatedAt = String((value as any).updatedAt || '').trim() || new Date().toISOString();

  if (!userId || !Number.isFinite(revision) || revision < 0) return null;

  return {
    userId,
    revision,
    updatedAt,
  };
}

async function removeVerdictEntryByStorageKey(storageKey: string) {
  verdictMemoryCache.delete(storageKey);
  await AsyncStorage.removeItem(storageKey).catch(() => {});
}

export function buildVerdictCacheItemKey({
  itemId,
  item,
}: {
  itemId?: string | null;
  item?: VerdictItem | null;
}) {
  const normalizedItemId = normalizeItemKey(itemId || '');
  const isExternal = isExternalItemLike((item || null) as any) || normalizedItemId.startsWith('ext_');

  if (!isExternal && normalizedItemId) {
    return `wardrobe:${normalizedItemId}`;
  }

  const externalIdentity = normalizeItemKey(item?.external_item_id || item?.id || normalizedItemId);
  if (externalIdentity) {
    return `external:${externalIdentity}`;
  }

  return null;
}

export async function readClosetRevision(userId: string): Promise<ClosetRevisionState> {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return {
      userId: '',
      revision: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const cached = closetRevisionMemoryCache.get(normalizedUserId);
  if (cached) return cached;

  const storageKey = buildClosetRevisionStorageKey(normalizedUserId);

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (raw) {
      const parsed = normalizeClosetRevisionState(JSON.parse(raw), normalizedUserId);
      if (parsed) {
        closetRevisionMemoryCache.set(normalizedUserId, parsed);
        return parsed;
      }
    }
  } catch {}

  const fallback = {
    userId: normalizedUserId,
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
  closetRevisionMemoryCache.set(normalizedUserId, fallback);
  return fallback;
}

export async function bumpClosetRevision(userId: string): Promise<ClosetRevisionState> {
  const current = await readClosetRevision(userId);
  const next: ClosetRevisionState = {
    userId: current.userId,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  };

  closetRevisionMemoryCache.set(next.userId, next);
  await AsyncStorage.setItem(buildClosetRevisionStorageKey(next.userId), JSON.stringify(next)).catch(() => {});
  return next;
}

export async function readCachedVerdict({
  userId,
  itemKey,
  closetRevision,
}: {
  userId: string;
  itemKey: string;
  closetRevision: number;
}): Promise<CachedItemVerdictEntry | null> {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedItemKey = normalizeItemKey(itemKey);
  if (!normalizedUserId || !normalizedItemKey) return null;

  const storageKey = buildVerdictStorageKey(normalizedUserId, normalizedItemKey, closetRevision);
  const cached = verdictMemoryCache.get(storageKey);
  if (cached !== undefined) {
    if (!cached) return null;
    if (isExpired(cached.cachedAt)) {
      await removeVerdictEntryByStorageKey(storageKey);
      return null;
    }
    return cached;
  }

  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) {
      verdictMemoryCache.set(storageKey, null);
      return null;
    }

    const parsed = normalizeCachedVerdictEntry(JSON.parse(raw));
    if (!parsed || isExpired(parsed.cachedAt)) {
      await removeVerdictEntryByStorageKey(storageKey);
      verdictMemoryCache.set(storageKey, null);
      return null;
    }

    verdictMemoryCache.set(storageKey, parsed);
    return parsed;
  } catch {
    verdictMemoryCache.set(storageKey, null);
    return null;
  }
}

export async function writeCachedVerdict(entry: CachedItemVerdictEntry): Promise<CachedItemVerdictEntry | null> {
  const normalized = normalizeCachedVerdictEntry({
    ...entry,
    cachedAt: entry.cachedAt || new Date().toISOString(),
    item: entry.item || entry.verdict?.item || null,
    proofItemsById: normalizeProofItemsById(entry.proofItemsById),
  });

  if (!normalized) return null;

  const storageKey = buildVerdictStorageKey(normalized.userId, normalized.itemKey, normalized.closetRevision);
  verdictMemoryCache.set(storageKey, normalized);
  await AsyncStorage.setItem(storageKey, JSON.stringify(normalized)).catch(() => {});
  return normalized;
}

export async function pruneExpiredVerdictCache({
  userId,
}: {
  userId?: string | null;
} = {}) {
  const normalizedUserId = normalizeUserId(userId || '');
  const prefix = normalizedUserId
    ? `${ITEM_VERDICT_CACHE_PREFIX}:${encodeKeyPart(normalizedUserId)}:`
    : `${ITEM_VERDICT_CACHE_PREFIX}:`;

  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    if (!keys.length) return 0;

    const pairs = await AsyncStorage.multiGet(keys);
    const staleKeys: string[] = [];

    for (const [storageKey, raw] of pairs) {
      if (!raw) {
        staleKeys.push(storageKey);
        continue;
      }

      let parsed: CachedItemVerdictEntry | null = null;
      try {
        parsed = normalizeCachedVerdictEntry(JSON.parse(raw));
      } catch {
        parsed = null;
      }

      if (!parsed || isExpired(parsed.cachedAt)) {
        staleKeys.push(storageKey);
        continue;
      }

      verdictMemoryCache.set(storageKey, parsed);
    }

    if (staleKeys.length) {
      await AsyncStorage.multiRemove(staleKeys).catch(() => {});
      staleKeys.forEach((storageKey) => verdictMemoryCache.delete(storageKey));
    }

    return staleKeys.length;
  } catch {
    return 0;
  }
}
