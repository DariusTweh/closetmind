#!/usr/bin/env node

const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLOTHES_BUCKET = process.env.WARDROBE_BUCKET || 'clothes';
const FETCH_BATCH_SIZE = 80;
const CANDIDATE_SELECT_V2 =
  'id, user_id, image_url, image_path, original_image_url, thumbnail_url, display_image_url, cutout_image_url, cutout_thumbnail_url, cutout_display_url, created_at';
const CANDIDATE_SELECT_V1 =
  'id, user_id, image_url, image_path, original_image_url, thumbnail_url, display_image_url, cutout_image_url, created_at';
let SUPPORTS_CUTOUT_DERIVATIVE_COLUMNS = true;

function parseLimitArg(argv) {
  const args = Array.isArray(argv) ? argv : [];
  let raw = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || '').trim();
    if (arg === '--limit' && args[index + 1]) {
      raw = String(args[index + 1]).trim();
      break;
    }
    if (arg.startsWith('--limit=')) {
      raw = arg.split('=')[1]?.trim() || null;
      break;
    }
  }

  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function buildPublicUrl(supabase, path) {
  const { data } = supabase.storage.from(CLOTHES_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

function normalizeStoragePath(value) {
  return String(value || '').trim().replace(/^\/+/, '');
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isDataUri(value) {
  return /^data:/i.test(String(value || '').trim());
}

function extractStoragePathFromUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || '').trim());
    const marker = '/storage/v1/object/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const suffix = url.pathname.slice(markerIndex + marker.length);
    const segments = suffix.split('/').filter(Boolean);
    if (segments.length < 3) return null;

    const mode = segments[0];
    if (!['public', 'authenticated', 'sign'].includes(mode)) return null;

    const bucket = segments[1];
    if (bucket !== CLOTHES_BUCKET) return null;

    const encodedPath = segments.slice(2).join('/');
    return normalizeStoragePath(decodeURIComponent(encodedPath));
  } catch {
    return null;
  }
}

function maybeStoragePathValue(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!normalized || isHttpUrl(normalized) || isDataUri(normalized)) return null;
  return normalizeStoragePath(normalized);
}

function toBufferFromBlob(blob) {
  if (!blob) return null;
  return blob.arrayBuffer().then((arrayBuffer) => {
    const bytes = Buffer.from(arrayBuffer);
    return bytes.length ? bytes : null;
  });
}

async function fetchViaStoragePath(supabase, path) {
  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) return null;

  const { data, error } = await supabase.storage.from(CLOTHES_BUCKET).download(normalizedPath);
  if (error || !data) {
    return null;
  }

  return toBufferFromBlob(data);
}

async function fetchViaUrl(url) {
  const normalizedUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) return null;

  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  if (!bytes.length) {
    throw new Error('Downloaded image was empty.');
  }
  return bytes;
}

async function buildJpegDerivativeBuffers(sourceBuffer) {
  const base = sharp(sourceBuffer).rotate();
  const thumbBuffer = await base
    .clone()
    .resize({ width: 300, withoutEnlargement: true })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();
  const displayBuffer = await base
    .clone()
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();

  return { thumbBuffer, displayBuffer };
}

async function buildCutoutDerivativeBuffers(sourceBuffer) {
  const base = sharp(sourceBuffer).rotate();
  const thumbBuffer = await base
    .clone()
    .resize({ width: 300, withoutEnlargement: true })
    .webp({ quality: 72, alphaQuality: 72 })
    .toBuffer();
  const displayBuffer = await base
    .clone()
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 76, alphaQuality: 76 })
    .toBuffer();

  return { thumbBuffer, displayBuffer };
}

async function uploadDerivative(supabase, path, body, contentType) {
  const { error } = await supabase.storage
    .from(CLOTHES_BUCKET)
    .upload(path, body, {
      contentType,
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || 'Storage upload failed.');
  }
}

async function resolveSourceBuffer({
  supabase,
  pathCandidates = [],
  urlCandidates = [],
}) {
  const dedupedPaths = Array.from(new Set(pathCandidates.filter(Boolean)));
  for (const pathCandidate of dedupedPaths) {
    const fromPath = await fetchViaStoragePath(supabase, pathCandidate);
    if (fromPath?.length) return fromPath;
  }

  const dedupedUrls = Array.from(new Set(urlCandidates.filter(Boolean)));
  let lastHttpError = null;
  for (const urlCandidate of dedupedUrls) {
    try {
      const fromUrl = await fetchViaUrl(urlCandidate);
      if (fromUrl?.length) return fromUrl;
    } catch (error) {
      lastHttpError = error;
    }
  }

  const pathHint = dedupedPaths.length ? ` paths=${dedupedPaths.join(',')}` : '';
  const urlHint = dedupedUrls.length ? ` urls=${dedupedUrls.join(',')}` : '';
  if (lastHttpError) {
    throw new Error(`${lastHttpError.message || lastHttpError}${pathHint}${urlHint}`);
  }
  throw new Error(`Unable to download source image.${pathHint}${urlHint}`);
}

function buildWorkPlan(row) {
  const imageUrl = String(row?.image_url || '').trim();
  const imagePath = normalizeStoragePath(row?.image_path);
  const cutoutImageUrl = String(row?.cutout_image_url || '').trim();

  const hasMainSource = Boolean(imagePath || imageUrl);
  const hasCutoutSource = Boolean(cutoutImageUrl);

  return {
    hasMainWork:
      hasMainSource && (!String(row?.thumbnail_url || '').trim() || !String(row?.display_image_url || '').trim()),
    hasCutoutWork:
      SUPPORTS_CUTOUT_DERIVATIVE_COLUMNS &&
      hasCutoutSource &&
      (!String(row?.cutout_thumbnail_url || '').trim() || !String(row?.cutout_display_url || '').trim()),
  };
}

async function fetchCandidates(supabase, offset = 0) {
  const runQuery = (selectFields) =>
    supabase
      .from('wardrobe')
      .select(selectFields)
      .or('image_url.not.is.null,image_path.not.is.null,cutout_image_url.not.is.null')
      .order('created_at', { ascending: false })
      .range(offset, offset + FETCH_BATCH_SIZE - 1);

  let response = await runQuery(CANDIDATE_SELECT_V2);
  if (
    response.error &&
    String(response.error.message || '').toLowerCase().includes('cutout_thumbnail_url')
  ) {
    if (SUPPORTS_CUTOUT_DERIVATIVE_COLUMNS) {
      console.warn(
        '[warn] cutout derivative columns are not available yet; skipping cutout optimization until migration 20260429_wardrobe_cutout_derivatives.sql is applied.',
      );
    }
    SUPPORTS_CUTOUT_DERIVATIVE_COLUMNS = false;
    response = await runQuery(CANDIDATE_SELECT_V1);
  } else if (!response.error) {
    SUPPORTS_CUTOUT_DERIVATIVE_COLUMNS = true;
  }

  if (response.error) {
    throw new Error(response.error.message || 'Failed to load wardrobe rows.');
  }

  return Array.isArray(response.data) ? response.data : [];
}

async function processRow(supabase, row) {
  const itemId = String(row?.id || '').trim();
  const userId = String(row?.user_id || '').trim();
  if (!itemId || !userId) {
    throw new Error('Missing row identifiers.');
  }

  const workPlan = buildWorkPlan(row);
  if (!workPlan.hasMainWork && !workPlan.hasCutoutWork) {
    return false;
  }

  const imageUrl = String(row?.image_url || '').trim();
  const imagePath = normalizeStoragePath(row?.image_path);
  const originalImageUrl = String(row?.original_image_url || '').trim() || imageUrl;
  const cutoutImageUrl = String(row?.cutout_image_url || '').trim();

  const updatePayload = {};

  if (workPlan.hasMainWork) {
    const mainBuffer = await resolveSourceBuffer({
      supabase,
      pathCandidates: [
        imagePath,
        maybeStoragePathValue(imageUrl),
        maybeStoragePathValue(originalImageUrl),
        extractStoragePathFromUrl(imageUrl),
        extractStoragePathFromUrl(originalImageUrl),
      ],
      urlCandidates: [imageUrl, originalImageUrl],
    });

    const { thumbBuffer, displayBuffer } = await buildJpegDerivativeBuffers(mainBuffer);
    const thumbPath = `optimized/${userId}/${itemId}-thumb.jpg`;
    const displayPath = `optimized/${userId}/${itemId}-display.jpg`;

    await uploadDerivative(supabase, thumbPath, thumbBuffer, 'image/jpeg');
    await uploadDerivative(supabase, displayPath, displayBuffer, 'image/jpeg');

    updatePayload.thumbnail_url = buildPublicUrl(supabase, thumbPath);
    updatePayload.display_image_url = buildPublicUrl(supabase, displayPath);
    if (!String(row?.original_image_url || '').trim() && originalImageUrl) {
      updatePayload.original_image_url = originalImageUrl;
    }
  }

  if (workPlan.hasCutoutWork) {
    const cutoutBuffer = await resolveSourceBuffer({
      supabase,
      pathCandidates: [
        maybeStoragePathValue(cutoutImageUrl),
        extractStoragePathFromUrl(cutoutImageUrl),
      ],
      urlCandidates: [cutoutImageUrl],
    });

    const { thumbBuffer, displayBuffer } = await buildCutoutDerivativeBuffers(cutoutBuffer);
    const cutoutThumbPath = `optimized/${userId}/${itemId}-cutout-thumb.webp`;
    const cutoutDisplayPath = `optimized/${userId}/${itemId}-cutout-display.webp`;

    await uploadDerivative(supabase, cutoutThumbPath, thumbBuffer, 'image/webp');
    await uploadDerivative(supabase, cutoutDisplayPath, displayBuffer, 'image/webp');

    updatePayload.cutout_thumbnail_url = buildPublicUrl(supabase, cutoutThumbPath);
    updatePayload.cutout_display_url = buildPublicUrl(supabase, cutoutDisplayPath);
  }

  const { error: updateError } = await supabase
    .from('wardrobe')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update wardrobe row.');
  }

  return true;
}

async function run() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const limit = parseLimitArg(process.argv.slice(2));

  let scanned = 0;
  let attempted = 0;
  let completed = 0;
  let failed = 0;
  let offset = 0;

  while (true) {
    const rows = await fetchCandidates(supabase, offset);
    if (!rows.length) break;
    offset += rows.length;

    for (const row of rows) {
      scanned += 1;
      const rowId = String(row?.id || '').trim();
      if (!rowId) continue;
      const workPlan = buildWorkPlan(row);
      if (!workPlan.hasMainWork && !workPlan.hasCutoutWork) continue;
      if (limit != null && attempted >= limit) break;
      attempted += 1;

      try {
        await processRow(supabase, row);
        completed += 1;
        const target = workPlan.hasMainWork && workPlan.hasCutoutWork
          ? 'main+cutout'
          : workPlan.hasCutoutWork
            ? 'cutout'
            : 'main';
        console.log(`[ok] ${completed}/${attempted} optimized ${target} row ${rowId}`);
      } catch (error) {
        failed += 1;
        console.error(`[skip] ${rowId}: ${error.message || error}`);
      }
    }

    if (limit != null && attempted >= limit) break;
  }

  console.log(
    `Done. scanned=${scanned} attempted=${attempted} optimized=${completed} failed=${failed} limit=${limit ?? 'none'}`,
  );
}

run().catch((error) => {
  console.error(`[fatal] ${error.message || error}`);
  process.exitCode = 1;
});
