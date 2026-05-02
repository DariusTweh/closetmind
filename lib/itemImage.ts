import {
  invalidatePrivateMediaUrlCache,
  resolvePrivateMediaUrl,
} from './privateMedia';

export type ItemImageLike = {
  id?: string | null;
  cutout_url?: string | null;
  cutout_image_url?: string | null;
  cutout_thumbnail_url?: string | null;
  cutout_display_url?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  thumbnail_url?: string | null;
  display_image_url?: string | null;
  original_image_url?: string | null;
};

export type ItemImageSourceKind =
  | 'cutout_thumb'
  | 'cutout_display'
  | 'cutout_original'
  | 'thumb'
  | 'display'
  | 'original_path'
  | 'original_url'
  | 'missing';

type ItemImageCandidate = {
  path?: string | null;
  legacyUrl?: string | null;
  isCutout: boolean;
  immediateUri: string | null;
  sourceKind: ItemImageSourceKind;
};

type ResolveItemImageOptions = {
  bucket?: string;
  expiresIn?: number;
  preferBackendSigner?: boolean;
  preference?: 'thumbnail' | 'display' | 'original';
};

function normalizeText(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function isHttpUrl(value: string | null) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function buildOriginalCandidate(item?: ItemImageLike | null): ItemImageCandidate {
  const imagePath = normalizeText(item?.image_path)?.replace(/^\/+/, '') || null;
  const imageUrl = normalizeText(item?.image_url) || normalizeText(item?.original_image_url);

  return {
    path: imagePath,
    legacyUrl: imageUrl,
    isCutout: false,
    immediateUri: imagePath ? null : imageUrl,
    sourceKind: imagePath ? 'original_path' : imageUrl ? 'original_url' : 'missing',
  };
}

function buildOptimizedCandidate(
  item: ItemImageLike | null | undefined,
  preference: ResolveItemImageOptions['preference'] = 'thumbnail',
): ItemImageCandidate | null {
  const thumbnailUrl = normalizeText(item?.thumbnail_url);
  const displayUrl = normalizeText(item?.display_image_url);

  const optimizedUrl = preference === 'display'
    ? displayUrl || thumbnailUrl
    : preference === 'original'
      ? null
      : thumbnailUrl || displayUrl;
  const sourceKind = preference === 'display'
    ? displayUrl
      ? 'display'
      : thumbnailUrl
        ? 'thumb'
        : 'missing'
    : thumbnailUrl
      ? 'thumb'
      : displayUrl
        ? 'display'
        : 'missing';

  if (!optimizedUrl) return null;

  return {
    path: null,
    legacyUrl: optimizedUrl,
    isCutout: false,
    immediateUri: null,
    sourceKind,
  };
}

function buildCutoutCandidate(
  item: ItemImageLike | null | undefined,
  preference: ResolveItemImageOptions['preference'] = 'thumbnail',
): ItemImageCandidate | null {
  const cutoutUrl = normalizeText(item?.cutout_url);
  const cutoutImageUrl = normalizeText(item?.cutout_image_url);
  if (!cutoutUrl && !cutoutImageUrl) return null;

  const cutoutThumbnailUrl = normalizeText(item?.cutout_thumbnail_url);
  const cutoutDisplayUrl = normalizeText(item?.cutout_display_url);

  const optimizedCutoutUrl = preference === 'display'
    ? cutoutDisplayUrl || cutoutThumbnailUrl
    : preference === 'original'
      ? null
      : cutoutThumbnailUrl || cutoutDisplayUrl;

  const preferredCutoutUrl = optimizedCutoutUrl || cutoutUrl || cutoutImageUrl;
  const sourceKind = optimizedCutoutUrl
    ? preference === 'display'
      ? cutoutDisplayUrl
        ? 'cutout_display'
        : 'cutout_thumb'
      : cutoutThumbnailUrl
        ? 'cutout_thumb'
        : 'cutout_display'
    : 'cutout_original';

  return {
    path: null,
    legacyUrl: preferredCutoutUrl,
    isCutout: true,
    immediateUri: isHttpUrl(preferredCutoutUrl) ? preferredCutoutUrl : null,
    sourceKind,
  };
}

function buildOriginalCutoutCandidate(
  item: ItemImageLike | null | undefined,
): ItemImageCandidate | null {
  const cutoutUrl = normalizeText(item?.cutout_url);
  const cutoutImageUrl = normalizeText(item?.cutout_image_url);
  const originalCutoutUrl = cutoutUrl || cutoutImageUrl;
  if (!originalCutoutUrl) return null;

  return {
    path: null,
    legacyUrl: originalCutoutUrl,
    isCutout: true,
    immediateUri: isHttpUrl(originalCutoutUrl) ? originalCutoutUrl : null,
    sourceKind: 'cutout_original',
  };
}

function buildPreferredCandidate(
  item?: ItemImageLike | null,
  preference: ResolveItemImageOptions['preference'] = 'thumbnail',
): ItemImageCandidate {
  const cutoutCandidate = buildCutoutCandidate(item, preference);
  if (cutoutCandidate) return cutoutCandidate;

  const optimizedCandidate = buildOptimizedCandidate(item, preference);
  if (optimizedCandidate) {
    return optimizedCandidate;
  }

  return buildOriginalCandidate(item);
}

async function resolveCandidate(
  candidate: ItemImageCandidate,
  options: ResolveItemImageOptions,
) {
  if (!candidate.path && !candidate.legacyUrl) {
    return null;
  }

  return resolvePrivateMediaUrl({
    path: candidate.path || null,
    legacyUrl: candidate.legacyUrl || null,
    bucket: options.bucket,
    expiresIn: options.expiresIn,
    preferBackendSigner: options.preferBackendSigner,
  }).catch(() => candidate.immediateUri || null);
}

function isOriginalSourceKind(sourceKind: ItemImageSourceKind) {
  return sourceKind === 'original_path' || sourceKind === 'original_url';
}

export function getItemImageCandidate(item?: ItemImageLike | null) {
  return buildPreferredCandidate(item);
}

export function getItemImageImmediateUri(
  item?: ItemImageLike | null,
  preference: ResolveItemImageOptions['preference'] = 'thumbnail',
) {
  return buildPreferredCandidate(item, preference).immediateUri;
}

export function getItemImageResizeMode<
  T extends 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
>(requestedResizeMode: T, isCutout: boolean) {
  if (requestedResizeMode === 'contain') return requestedResizeMode;
  return isCutout ? 'contain' : requestedResizeMode;
}

export function invalidateItemImageCache(
  item?: ItemImageLike | null,
  options: ResolveItemImageOptions = {},
) {
  const preferred = buildPreferredCandidate(item, options.preference);
  if (preferred.path || preferred.legacyUrl) {
    invalidatePrivateMediaUrlCache({
      path: preferred.path || null,
      legacyUrl: preferred.legacyUrl || null,
      bucket: options.bucket,
    });
  }

  const fallback = buildOriginalCandidate(item);
  const cutoutFallback = buildOriginalCutoutCandidate(item);
  if (
    preferred.isCutout &&
    cutoutFallback &&
    (cutoutFallback.path !== preferred.path || cutoutFallback.legacyUrl !== preferred.legacyUrl)
  ) {
    if (cutoutFallback.path || cutoutFallback.legacyUrl) {
      invalidatePrivateMediaUrlCache({
        path: cutoutFallback.path || null,
        legacyUrl: cutoutFallback.legacyUrl || null,
        bucket: options.bucket,
      });
    }
  }

  if (
    preferred.isCutout ||
    preferred.path !== fallback.path ||
    preferred.legacyUrl !== fallback.legacyUrl
  ) {
    if (fallback.path || fallback.legacyUrl) {
      invalidatePrivateMediaUrlCache({
        path: fallback.path || null,
        legacyUrl: fallback.legacyUrl || null,
        bucket: options.bucket,
      });
    }
  }
}

export async function resolveItemImage(
  item?: ItemImageLike | null,
  options: ResolveItemImageOptions = {},
) {
  const preferred = buildPreferredCandidate(item, options.preference);
  const resolvedPreferred = await resolveCandidate(preferred, options);
  if (resolvedPreferred) {
    return {
      uri: resolvedPreferred,
      isCutout: preferred.isCutout,
      sourceKind: preferred.sourceKind,
      fellBackToOriginal: isOriginalSourceKind(preferred.sourceKind),
    };
  }

  if (preferred.isCutout) {
    const originalCutout = buildOriginalCutoutCandidate(item);
    if (
      options.preference !== 'original' &&
      originalCutout &&
      (originalCutout.path !== preferred.path || originalCutout.legacyUrl !== preferred.legacyUrl)
    ) {
      const resolvedOriginalCutout = await resolveCandidate(originalCutout, options);
      if (resolvedOriginalCutout) {
        return {
          uri: resolvedOriginalCutout,
          isCutout: true,
          sourceKind: originalCutout.sourceKind,
          fellBackToOriginal: false,
        };
      }
    }

    const standardOptimized = buildOptimizedCandidate(item, options.preference);
    if (
      options.preference !== 'original' &&
      standardOptimized &&
      (standardOptimized.path !== preferred.path || standardOptimized.legacyUrl !== preferred.legacyUrl)
    ) {
      const resolvedStandardOptimized = await resolveCandidate(standardOptimized, options);
      if (resolvedStandardOptimized) {
        return {
          uri: resolvedStandardOptimized,
          isCutout: false,
          sourceKind: standardOptimized.sourceKind,
          fellBackToOriginal: false,
        };
      }
    }

    const fallback = buildOriginalCandidate(item);
    const resolvedFallback = await resolveCandidate(fallback, options);
    if (resolvedFallback) {
      return {
        uri: resolvedFallback,
        isCutout: false,
        sourceKind: fallback.sourceKind,
        fellBackToOriginal: isOriginalSourceKind(fallback.sourceKind),
      };
    }
  }

  return {
    uri: null,
    isCutout: preferred.isCutout,
    sourceKind: preferred.sourceKind,
    fellBackToOriginal: false,
  };
}
