import { apiPost } from './api';
import { supabase } from './supabase';

const PRIVATE_MEDIA_BUCKET = 'onboarding';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SUPABASE_URL = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const STORAGE_PATH_PATTERNS = [
  /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i,
  /\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/i,
  /\/storage\/v1\/object\/authenticated\/([^/]+)\/(.+)$/i,
];
const MEDIA_URL_CACHE = new Map<string, { url: string | null; expiresAt: number }>();
const MEDIA_URL_PENDING = new Map<string, Promise<string | null>>();

type ResolvePrivateMediaUrlOptions = {
  path?: string | null;
  legacyUrl?: string | null;
  bucket?: string;
  expiresIn?: number;
  preferBackendSigner?: boolean;
};

export async function resolvePrivateMediaUrl({
  path,
  legacyUrl,
  bucket = PRIVATE_MEDIA_BUCKET,
  expiresIn = SIGNED_URL_TTL_SECONDS,
  preferBackendSigner = bucket === PRIVATE_MEDIA_BUCKET,
}: ResolvePrivateMediaUrlOptions): Promise<string | null> {
  const normalizedPath = String(path || '').trim() || extractStoragePathFromLegacyUrl(legacyUrl, bucket);
  const cacheKey = buildMediaCacheKey({ normalizedPath, legacyUrl, bucket });
  const cached = getCachedMediaUrl(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pending = MEDIA_URL_PENDING.get(cacheKey);
  if (pending) {
    return pending;
  }

  const resolution = resolvePrivateMediaUrlUncached({
    normalizedPath,
    legacyUrl,
    bucket,
    expiresIn,
    preferBackendSigner,
  });
  MEDIA_URL_PENDING.set(cacheKey, resolution);

  try {
    const resolvedUrl = await resolution;
    cacheResolvedMediaUrl(cacheKey, resolvedUrl, expiresIn);
    return resolvedUrl;
  } finally {
    MEDIA_URL_PENDING.delete(cacheKey);
  }
}

async function resolvePrivateMediaUrlUncached({
  normalizedPath,
  legacyUrl,
  bucket,
  expiresIn,
  preferBackendSigner,
}: {
  normalizedPath: string | null;
  legacyUrl?: string | null;
  bucket: string;
  expiresIn: number;
  preferBackendSigner: boolean;
}): Promise<string | null> {
  if (normalizedPath) {
    if (preferBackendSigner) {
      try {
        const response = await apiPost('/media/sign', { path: normalizedPath, bucket });
        const payload = await response.json().catch(() => null);
        if (response.ok && payload?.signed_url) {
          return toAbsoluteMediaUrl(payload.signed_url);
        }
        console.warn('Backend media signing failed:', {
          bucket,
          path: normalizedPath,
          status: response.status,
          error: payload?.error || 'Unknown backend signing error',
        });
      } catch {
        console.warn('Backend media signing request failed:', {
          bucket,
          path: normalizedPath,
        });
      }
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(normalizedPath, expiresIn);
    if (!error && data?.signedUrl) {
      return toAbsoluteMediaUrl(data.signedUrl);
    }

    console.warn('Failed to create signed URL for private media path:', normalizedPath, error?.message);
  }

  const normalizedLegacyUrl = String(legacyUrl || '').trim();
  if (normalizedPath && isExpiredSignedStorageUrl(normalizedLegacyUrl)) {
    return null;
  }

  return toAbsoluteMediaUrl(normalizedLegacyUrl) || null;
}

export function invalidatePrivateMediaUrlCache({
  path,
  legacyUrl,
  bucket = PRIVATE_MEDIA_BUCKET,
}: {
  path?: string | null;
  legacyUrl?: string | null;
  bucket?: string;
}) {
  const normalizedPath = String(path || '').trim() || extractStoragePathFromLegacyUrl(legacyUrl, bucket);
  const cacheKey = buildMediaCacheKey({ normalizedPath, legacyUrl, bucket });
  MEDIA_URL_CACHE.delete(cacheKey);
  MEDIA_URL_PENDING.delete(cacheKey);
}

function buildMediaCacheKey({
  normalizedPath,
  legacyUrl,
  bucket,
}: {
  normalizedPath: string | null;
  legacyUrl?: string | null;
  bucket: string;
}) {
  if (normalizedPath) {
    return `path:${bucket}:${normalizedPath}`;
  }
  return `legacy:${String(legacyUrl || '').trim()}`;
}

function getCachedMediaUrl(cacheKey: string) {
  const cached = MEDIA_URL_CACHE.get(cacheKey);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    MEDIA_URL_CACHE.delete(cacheKey);
    return undefined;
  }
  return cached.url;
}

function cacheResolvedMediaUrl(cacheKey: string, url: string | null, expiresIn: number) {
  const signedExpiry = getSignedStorageUrlExpiryTimestamp(url);
  const fallbackTtlMs = Math.max(15_000, (Number(expiresIn) || SIGNED_URL_TTL_SECONDS) * 1000 - 60_000);
  const expiresAt = signedExpiry
    ? Math.max(Date.now() + 15_000, signedExpiry - 60_000)
    : Date.now() + fallbackTtlMs;

  MEDIA_URL_CACHE.set(cacheKey, {
    url,
    expiresAt,
  });
}

function isSupabaseStorageUrlForBucket(url: string | null | undefined, bucket: string) {
  return !!extractStoragePathFromLegacyUrl(url, bucket);
}

export function describeResolvedPrivateMediaSource({
  path,
  legacyUrl,
  bucket = PRIVATE_MEDIA_BUCKET,
}: {
  path?: string | null;
  legacyUrl?: string | null;
  bucket?: string;
}) {
  if (String(path || '').trim()) {
    return 'path';
  }
  if (isSupabaseStorageUrlForBucket(legacyUrl, bucket)) {
    return 'legacy-storage-url';
  }
  if (String(legacyUrl || '').trim()) {
    return 'legacy-url';
  }
  return 'missing';
}

function extractStoragePathFromLegacyUrl(legacyUrl: string | null | undefined, bucket: string): string | null {
  const rawUrl = String(legacyUrl || '').trim();
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    for (const pattern of STORAGE_PATH_PATTERNS) {
      const match = parsed.pathname.match(pattern);
      if (!match) continue;

      const [, matchedBucket, storagePath] = match;
      if (matchedBucket !== bucket || !storagePath) continue;
      return decodeURIComponent(storagePath);
    }
  } catch {
    return null;
  }

  return null;
}

function toAbsoluteMediaUrl(url: string | null | undefined): string | null {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return null;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl;
  if (rawUrl.startsWith('/') && SUPABASE_URL) {
    return `${SUPABASE_URL}${rawUrl}`;
  }
  return rawUrl;
}

function getSignedStorageUrlExpiryTimestamp(url: string | null | undefined) {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    if (!/\/storage\/v1\/object\/sign\//i.test(parsed.pathname)) return null;
    const token = parsed.searchParams.get('token');
    if (!token) return null;

    const [, payload] = token.split('.');
    if (!payload) return null;

    const decodedPayload = JSON.parse(decodeBase64UrlUtf8(payload));
    const exp = Number(decodedPayload?.exp);
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpiredSignedStorageUrl(url: string | null | undefined) {
  const expiry = getSignedStorageUrlExpiryTimestamp(url);
  return Boolean(expiry && expiry <= Date.now());
}

function decodeBase64UrlUtf8(input: string) {
  const normalized = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const bytes: number[] = [];

  for (let index = 0; index < padded.length; index += 4) {
    const encoded1 = alphabet.indexOf(padded[index]);
    const encoded2 = alphabet.indexOf(padded[index + 1]);
    const encoded3 = alphabet.indexOf(padded[index + 2]);
    const encoded4 = alphabet.indexOf(padded[index + 3]);

    const byte1 = (encoded1 << 2) | (encoded2 >> 4);
    const byte2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const byte3 = ((encoded3 & 3) << 6) | encoded4;

    bytes.push(byte1);
    if (encoded3 !== 64) bytes.push(byte2);
    if (encoded4 !== 64) bytes.push(byte3);
  }

  return bytes.map((byte) => String.fromCharCode(byte)).join('');
}
