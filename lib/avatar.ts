import { resolvePrivateMediaUrl } from './privateMedia';

const PROFILE_MEDIA_BUCKET = 'onboarding';
const FALLBACK_AVATAR_IDS = [5, 6, 12, 15, 25, 29, 32, 37, 45, 47];
const STORAGE_URL_RE = /\/storage\/v1\/object\/(public|sign|authenticated)\//i;

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getFallbackAvatarUrl(seed?: string | null) {
  const normalizedSeed = String(seed || '').trim() || 'closetmind-avatar';
  const avatarId = FALLBACK_AVATAR_IDS[hashSeed(normalizedSeed) % FALLBACK_AVATAR_IDS.length];
  return `https://i.pravatar.cc/160?img=${avatarId}`;
}

export async function resolveProfileAvatarUrl(profile?: {
  id?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
} | null) {
  const avatarPath = String(profile?.avatar_path || '').trim();
  const legacyUrl = String(profile?.avatar_url || '').trim();

  if (!avatarPath && !legacyUrl) {
    return null;
  }

  const resolved = await resolvePrivateMediaUrl({
    path: avatarPath || null,
    legacyUrl: legacyUrl || null,
    bucket: PROFILE_MEDIA_BUCKET,
    preferBackendSigner: false,
  }).catch(() => null);

  if (resolved) {
    return resolved;
  }

  if (legacyUrl && !STORAGE_URL_RE.test(legacyUrl)) {
    return legacyUrl;
  }

  return null;
}
