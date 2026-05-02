import { apiPost, readApiResponse } from './api';
import { resolvePrivateMediaUrl } from './privateMedia';
import { supabase } from './supabase';
import { bumpClosetRevision } from './itemVerdictCache';
import { SubscriptionLimitError } from './subscriptions/errors';
import { canUseFeature } from './subscriptions/usageService';

export const CLOTHES_BUCKET = 'clothes';
const LEGACY_SAFE_MAIN_CATEGORIES = ['top', 'bottom', 'shoes', 'outerwear', 'accessory'];
const SUPABASE_URL = String(process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const OPTIONAL_WARDROBE_INSERT_FIELDS = [
  'image_path',
  'source_title',
  'pattern_type',
  'color_family',
  'material',
  'silhouette',
  'fit_type',
  'length',
  'rise',
  'sleeve_length',
  'formality',
  'occasion_tags',
  'layering_role',
  'statement_level',
  'footwear_style',
  'style_role',
  'garment_function',
  'subcategory',
  'subcategory_confidence',
  'function_confidence',
  'material_confidence',
  'material_guess',
  'fabric_weight',
  'texture_notes',
  'weather_use',
  'fit_notes',
  'try_on_fit_notes',
  'styling_notes',
  'price',
  'retail_price',
  'currency',
  'retailer',
  'retailer_name',
  'product_url',
  'source_url',
  'source_domain',
  'source_type',
  'source_id',
  'external_product_id',
  'source_image_url',
  'original_image_url',
  'thumbnail_url',
  'display_image_url',
  'cutout_image_url',
  'cutout_thumbnail_url',
  'cutout_display_url',
  'bg_removed',
  'import_method',
  'tags',
  'notes',
  'marketplace_settings',
  'is_listed',
  'listed',
  'meta',
  'wardrobe_status',
];

type UploadWardrobeImageBytesArgs = {
  bytes: Uint8Array<ArrayBufferLike>;
  contentType: string;
  extension: string;
  userId: string;
};

export type UploadedWardrobeImage = {
  imagePath: string;
  imageUrl: string | null;
  accessUrl: string | null;
  storageUrl?: string | null;
};

type WardrobeDerivativeFields = {
  thumbnail_url?: string | null;
  display_image_url?: string | null;
  cutout_thumbnail_url?: string | null;
  cutout_display_url?: string | null;
};

function normalizeExtension(extension: string) {
  const normalized = String(extension || '').trim().toLowerCase().replace(/^\./, '');
  return normalized || 'jpg';
}

function buildWardrobeImagePath(userId: string, extension: string) {
  const safeUserId = String(userId || '').trim();
  const ext = normalizeExtension(extension);
  return `${safeUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

function buildAuthenticatedStorageUrl(bucket: string, path: string) {
  const normalizedBucket = String(bucket || '').trim();
  const normalizedPath = String(path || '').trim().replace(/^\/+/, '');
  if (!SUPABASE_URL || !normalizedBucket || !normalizedPath) return null;

  const encodedPath = normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${SUPABASE_URL}/storage/v1/object/authenticated/${normalizedBucket}/${encodedPath}`;
}

function normalizeLookupText(value: any) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeOptionalText(value: any) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function shouldEnforceClosetItemLimit(payload: Record<string, any>) {
  const wardrobeStatus = normalizeLookupText(payload?.wardrobe_status || 'owned');
  return wardrobeStatus !== 'scanned_candidate';
}

function normalizeStoragePath(value: any) {
  return String(value || '').trim().replace(/^\/+/, '') || null;
}

function isHttpUrl(value: any) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function extractStoragePathFromUrl(rawUrl: any, bucket = CLOTHES_BUCKET) {
  const urlText = String(rawUrl || '').trim();
  if (!urlText) return null;

  try {
    const parsed = new URL(urlText);
    const patterns = [
      /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i,
      /\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/i,
      /\/storage\/v1\/object\/authenticated\/([^/]+)\/(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = parsed.pathname.match(pattern);
      if (!match) continue;
      const [, matchedBucket, storagePath] = match;
      if (matchedBucket !== bucket || !storagePath) continue;
      return normalizeStoragePath(decodeURIComponent(storagePath));
    }
  } catch {
    return null;
  }

  return null;
}

function extractWardrobeDerivativeFields(value: any): WardrobeDerivativeFields {
  const source = value?.item && typeof value.item === 'object'
    ? value.item
    : value?.row && typeof value.row === 'object'
      ? value.row
      : value;

  return {
    thumbnail_url: normalizeOptionalText(source?.thumbnail_url),
    display_image_url: normalizeOptionalText(source?.display_image_url),
    cutout_thumbnail_url: normalizeOptionalText(source?.cutout_thumbnail_url),
    cutout_display_url: normalizeOptionalText(source?.cutout_display_url),
  };
}

function compactWardrobeDerivativeFields(fields: WardrobeDerivativeFields) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => String(value || '').trim()),
  ) as WardrobeDerivativeFields;
}

function hasMissingOptionalWardrobeInsertColumnError(message: string) {
  return OPTIONAL_WARDROBE_INSERT_FIELDS.some((field) => message.includes(`wardrobe.${field}`));
}

function hasWardrobeMainCategoryConstraintError(message: string) {
  const rawMessage = String(message || '').toLowerCase();
  return rawMessage.includes('wardrobe_main_category_check') || rawMessage.includes('main_category');
}

function shouldBumpClosetRevisionForWardrobeStatus(value: any) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized !== 'scanned_candidate';
}

function pushUniqueCategory(target: string[], value: string | null | undefined, original: string | null) {
  if (!value || value === original || target.includes(value) || !LEGACY_SAFE_MAIN_CATEGORIES.includes(value)) return;
  target.push(value);
}

function buildLegacyMainCategoryFallbacks(payload: Record<string, any>) {
  const original = normalizeLookupText(payload?.main_category) || null;
  const typeText = normalizeLookupText(payload?.type);
  const nameText = normalizeLookupText(payload?.name || payload?.source_title);
  const searchText = `${original || ''} ${typeText} ${nameText}`;
  const fallbacks: string[] = [];

  if (original === 'layer') {
    pushUniqueCategory(fallbacks, 'top', original);
    pushUniqueCategory(fallbacks, 'outerwear', original);
  }

  if (original === 'onepiece') {
    pushUniqueCategory(fallbacks, 'top', original);
  }

  if (/(shoe|sneaker|trainer|loafer|boot|heel|sandal|slide|flip flop|flip-flop)/.test(searchText)) {
    pushUniqueCategory(fallbacks, 'shoes', original);
  }

  if (/(pant|pants|jean|jeans|trouser|trousers|skirt|short|shorts|legging|cargo|jogger)/.test(searchText)) {
    pushUniqueCategory(fallbacks, 'bottom', original);
  }

  if (/(coat|jacket|parka|trench|blazer|puffer|overcoat|outerwear)/.test(searchText)) {
    pushUniqueCategory(fallbacks, 'outerwear', original);
  }

  if (/(bag|hat|belt|scarf|jewelry|watch|sunglasses|accessory)/.test(searchText)) {
    pushUniqueCategory(fallbacks, 'accessory', original);
  }

  if (
    /(tee|t-shirt|t shirt|shirt|tank|blouse|polo|hoodie|sweater|knit|vest|cardigan|overshirt|shacket|dress|romper|jumpsuit|top)/.test(
      searchText,
    )
  ) {
    pushUniqueCategory(fallbacks, 'top', original);
  }

  pushUniqueCategory(fallbacks, 'top', original);
  return fallbacks;
}

function extractMissingWardrobeColumn(message: string) {
  const rawMessage = String(message || '');
  const patterns = [
    /wardrobe\.([a-zA-Z0-9_]+)/i,
    /column "?([a-zA-Z0-9_]+)"? does not exist/i,
    /Could not find the '([^']+)' column of 'wardrobe'/i,
  ];

  for (const pattern of patterns) {
    const match = rawMessage.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function buildWardrobeUpdateNotFoundError(rowExists: boolean) {
  return {
    code: rowExists ? 'WARDROBE_UPDATE_BLOCKED' : 'WARDROBE_ITEM_NOT_FOUND',
    details: null,
    hint: rowExists
      ? 'The item is readable, but this update affected zero rows. Check the wardrobe update policy.'
      : 'No readable wardrobe row matched this item/user pair.',
    message: rowExists
      ? 'No wardrobe item was updated. Check the wardrobe update policy for this row.'
      : 'This wardrobe item could not be found for the current user.',
    name: 'WardrobeUpdateNotFoundError',
  } as any;
}

async function ensureWardrobeUpdateReturnedRow(
  response: any,
  itemId: string,
  userId: string,
) {
  if (response.error || response.data) return response;

  const existingResponse = await supabase
    .from('wardrobe')
    .select('id')
    .eq('id', itemId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResponse.error) {
    return {
      ...response,
      error: existingResponse.error,
    };
  }

  return {
    ...response,
    error: buildWardrobeUpdateNotFoundError(Boolean(existingResponse.data)),
  };
}

async function runWardrobeInsertWithSchemaFallback(payload: Record<string, any>) {
  const insertPayload = { ...payload };

  while (Object.keys(insertPayload).length) {
    let response = await supabase.from('wardrobe').insert([insertPayload]).select().single();
    if (!response.error) return response;

    const missingColumn = extractMissingWardrobeColumn(response.error.message);
    if (!missingColumn || !(missingColumn in insertPayload) || !OPTIONAL_WARDROBE_INSERT_FIELDS.includes(missingColumn)) {
      return response;
    }

    delete insertPayload[missingColumn];
  }

  return await supabase.from('wardrobe').insert([payload]).select().single();
}

async function attemptWardrobeInsert(payload: Record<string, any>) {
  let response = await runWardrobeInsertWithSchemaFallback(payload);

  if (response.error && hasMissingOptionalWardrobeInsertColumnError(response.error.message)) {
    const fallbackPayload = { ...payload };
    for (const field of OPTIONAL_WARDROBE_INSERT_FIELDS) {
      delete fallbackPayload[field];
    }
    response = await supabase.from('wardrobe').insert([fallbackPayload]).select().single();
  }

  return response;
}

async function runWardrobeUpdateWithSchemaFallback(payload: Record<string, any>, itemId: string, userId: string) {
  const updatePayload = { ...payload };

  while (Object.keys(updatePayload).length) {
    let response = await supabase
      .from('wardrobe')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('id, user_id, wardrobe_status')
      .maybeSingle();
    response = await ensureWardrobeUpdateReturnedRow(response, itemId, userId);

    if (!response.error) return response;

    const missingColumn = extractMissingWardrobeColumn(response.error.message);
    if (!missingColumn || !(missingColumn in updatePayload) || !OPTIONAL_WARDROBE_INSERT_FIELDS.includes(missingColumn)) {
      return response;
    }

    delete updatePayload[missingColumn];
  }

  const response = await supabase
    .from('wardrobe')
    .update(payload)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select('id, user_id, wardrobe_status')
    .maybeSingle();
  return await ensureWardrobeUpdateReturnedRow(response, itemId, userId);
}

async function attemptWardrobeUpdate({
  payload,
  itemId,
  userId,
}: {
  payload: Record<string, any>;
  itemId: string;
  userId: string;
}) {
  let response = await runWardrobeUpdateWithSchemaFallback(payload, itemId, userId);

  if (response.error && hasMissingOptionalWardrobeInsertColumnError(response.error.message)) {
    const fallbackPayload = { ...payload };
    for (const field of OPTIONAL_WARDROBE_INSERT_FIELDS) {
      delete fallbackPayload[field];
    }
    response = await supabase
      .from('wardrobe')
      .update(fallbackPayload)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('id, user_id, wardrobe_status')
      .maybeSingle();
    response = await ensureWardrobeUpdateReturnedRow(response, itemId, userId);
  }

  return response;
}

export async function uploadWardrobeImageBytes({
  bytes,
  contentType,
  extension,
  userId,
}: UploadWardrobeImageBytesArgs): Promise<UploadedWardrobeImage> {
  const imagePath = buildWardrobeImagePath(userId, extension);

  const { error: uploadError } = await supabase.storage
    .from(CLOTHES_BUCKET)
    .upload(imagePath, bytes, {
      cacheControl: '31536000',
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const accessUrl = await resolvePrivateMediaUrl({
    path: imagePath,
    bucket: CLOTHES_BUCKET,
    preferBackendSigner: true,
  }).catch(() => null);

  return {
    imagePath,
    imageUrl: null,
    accessUrl,
    storageUrl: buildAuthenticatedStorageUrl(CLOTHES_BUCKET, imagePath),
  };
}

export async function insertWardrobeItemWithCompatibility(payload: Record<string, any>) {
  const userId = String(payload?.user_id || '').trim();
  if (userId && shouldEnforceClosetItemLimit(payload)) {
    const closetAccess = await canUseFeature(userId, 'closet_item');
    if (!closetAccess.allowed) {
      throw new SubscriptionLimitError('closet_item', closetAccess, closetAccess.reason);
    }
  }

  console.log('[item-source]', {
    sourceType: payload?.source_type || payload?.meta?.source_type || 'manual_upload',
    sourceSubtype: payload?.import_method || null,
    writingToWardrobe: true,
    action:
      payload?.source_type === 'browser_import'
        ? 'browser_explicit_save'
        : payload?.source_type === 'manual_upload'
          ? 'manual_upload'
          : 'import_confirmed_save',
  });
  let response = await attemptWardrobeInsert(payload);

  if (response.error && hasWardrobeMainCategoryConstraintError(response.error.message)) {
    for (const fallbackCategory of buildLegacyMainCategoryFallbacks(payload)) {
      response = await attemptWardrobeInsert({
        ...payload,
        main_category: fallbackCategory,
      });
      if (!response.error || !hasWardrobeMainCategoryConstraintError(response.error.message)) {
        break;
      }
    }
  }

  if (!response.error) {
    const revisionUserId = String(response.data?.user_id || payload?.user_id || '').trim();
    const revisionWardrobeStatus = response.data?.wardrobe_status ?? payload?.wardrobe_status ?? null;
    if (revisionUserId && shouldBumpClosetRevisionForWardrobeStatus(revisionWardrobeStatus)) {
      await bumpClosetRevision(revisionUserId).catch(() => null);
    }
  }

  return response;
}

export async function prepareWardrobeItemDerivatives<T extends Record<string, any> | null | undefined>(
  item: T,
): Promise<T> {
  if (!item || typeof item !== 'object') return item;

  const wardrobeItemId = String(item.id || '').trim();
  const userId = String(item.user_id || '').trim();
  const imagePath =
    normalizeStoragePath(item.image_path) ||
    extractStoragePathFromUrl(item.image_url) ||
    extractStoragePathFromUrl(item.original_image_url);
  const cutoutPath =
    normalizeStoragePath(item.cutout_path) ||
    extractStoragePathFromUrl(item.cutout_image_url) ||
    extractStoragePathFromUrl(item.cutout_url);
  const cutoutUrl = normalizeOptionalText(item.cutout_image_url || item.cutout_url);

  if (!wardrobeItemId || !imagePath) {
    return item;
  }

  let derivativeFields: WardrobeDerivativeFields = {};

  try {
    const response = await apiPost('/media/prepare-wardrobe-derivatives', {
      wardrobeItemId,
      bucket: CLOTHES_BUCKET,
      imagePath,
      cutoutPath: cutoutPath || null,
      cutoutUrl: cutoutPath ? null : cutoutUrl,
    });
    const payload = await readApiResponse<any>(response);

    if (!response.ok) {
      console.warn('Wardrobe derivative preparation failed:', {
        wardrobeItemId,
        status: response.status,
        error: (payload as any)?.error || `Request failed with status ${response.status}`,
      });
      return item;
    }

    derivativeFields = compactWardrobeDerivativeFields(extractWardrobeDerivativeFields(payload));
  } catch (error: any) {
    console.warn('Wardrobe derivative preparation request failed:', {
      wardrobeItemId,
      error: error?.message || error,
    });
    return item;
  }

  if (!Object.keys(derivativeFields).length) {
    return item;
  }

  if (wardrobeItemId && userId) {
    const { error } = await supabase
      .from('wardrobe')
      .update(derivativeFields)
      .eq('id', wardrobeItemId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Persisting wardrobe derivative fields failed:', {
        wardrobeItemId,
        error: error.message,
      });
    }
  }

  return {
    ...item,
    ...derivativeFields,
  };
}

export async function updateWardrobeItemWithCompatibility({
  payload,
  itemId,
  userId,
}: {
  payload: Record<string, any>;
  itemId: string;
  userId: string;
}) {
  console.log('[item-source]', {
    sourceType: payload?.source_type || 'wardrobe',
    sourceSubtype: payload?.import_method || null,
    writingToWardrobe: true,
    action: 'edit_existing',
  });
  let response = await attemptWardrobeUpdate({
    payload,
    itemId,
    userId,
  });

  if (response.error && hasWardrobeMainCategoryConstraintError(response.error.message)) {
    for (const fallbackCategory of buildLegacyMainCategoryFallbacks(payload)) {
      response = await attemptWardrobeUpdate({
        payload: {
          ...payload,
          main_category: fallbackCategory,
        },
        itemId,
        userId,
      });
      if (!response.error || !hasWardrobeMainCategoryConstraintError(response.error.message)) {
        break;
      }
    }
  }

  if (!response.error) {
    if (String(userId || '').trim()) {
      await bumpClosetRevision(userId).catch(() => null);
    }
  }

  return response;
}
