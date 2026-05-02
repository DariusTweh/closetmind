import type { TaggedFashionItem } from './tagging';
import {
  canonicalizeSubtype,
  deriveMainCategory,
  getDefaultLayeringRole,
  getFriendlyTypeLabel,
} from './wardrobeTaxonomy';

type UploadedImageShape = {
  imagePath?: string | null;
  imageUrl?: string | null;
  accessUrl?: string | null;
  storageUrl?: string | null;
  thumbnailUrl?: string | null;
  displayImageUrl?: string | null;
  cutoutImageUrl?: string | null;
  cutoutThumbnailUrl?: string | null;
  cutoutDisplayUrl?: string | null;
  bgRemoved?: boolean | null;
};

type ManualWardrobeFields = {
  name?: string | null;
  type?: string | null;
  subcategory?: string | null;
  color?: string | null;
  vibes?: string[] | string | null;
  season?: string | null;
  main_category?: string | null;
};

type BuildWardrobeInsertPayloadArgs = {
  userId: string;
  uploadedImage?: UploadedImageShape | null;
  normalizedTags?: TaggedFashionItem | null;
  importMeta?: Record<string, any> | null;
  manualOverride?: boolean;
  manualFields?: ManualWardrobeFields | null;
  wardrobeStatus?: string | null;
  importMethod?: string | null;
  sourceType?: string | null;
  sourceTitleFallback?: string | null;
};

export type ItemSourceType = 'wardrobe' | 'external';
export type ExternalItemSourceSubtype = 'browser_import' | 'link_import' | 'temp_scan';

export type ExternalItemPayload = {
  id: string;
  source_type: 'external';
  source_subtype: ExternalItemSourceSubtype;
  external_item_id: string;
  is_saved_to_closet: false;
  source_title?: string | null;
  name: string;
  brand?: string | null;
  price?: number | null;
  retail_price?: number | null;
  currency?: string | null;
  retailer?: string | null;
  retailer_name?: string | null;
  product_url?: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  thumbnail_url?: string | null;
  display_image_url?: string | null;
  original_image_url?: string | null;
  cutout_url?: string | null;
  cutout_image_url?: string | null;
  cutout_thumbnail_url?: string | null;
  cutout_display_url?: string | null;
  bg_removed?: boolean | null;
  source_image_url?: string | null;
  main_category?: string | null;
  subcategory?: string | null;
  type?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[];
  color_family?: string[];
  vibe_tags?: string[];
  occasion_tags?: string[];
  season?: string | null;
  formality?: string | null;
  fit_type?: string | null;
  silhouette?: string | null;
  material?: string | null;
  material_guess?: string | null;
  fabric_weight?: string | null;
  pattern_description?: string | null;
  pattern_type?: string | null;
  texture_notes?: string | null;
  layering_role?: string | null;
  statement_level?: string | null;
  footwear_style?: string | null;
  style_role?: string | null;
  weather_use?: string[];
  fit_notes?: any;
  try_on_fit_notes?: string | null;
  styling_notes?: string | null;
  source_id?: string | null;
  external_product_id?: string | null;
  confidence?: any;
  meta?: Record<string, any> | null;
};

const SEASON_VALUES = ['spring', 'summer', 'fall', 'winter', 'all'];

function normalizeText(value: any, maxLength = 160) {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  return normalized.slice(0, maxLength);
}

function normalizeLowerPhrase(value: any, maxLength = 48) {
  return normalizeText(value, maxLength).toLowerCase();
}

function uniq<T>(values: T[] = []) {
  return [...new Set(values.filter(Boolean as any))];
}

function asArray(value: any) {
  if (Array.isArray(value)) return value.flatMap((entry) => asArray(entry));
  if (value == null) return [];
  if (typeof value === 'string') {
    return value
      .split(/[|,/]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [String(value)];
}

function normalizeStringArray(value: any, maxItems = 10, maxLength = 32): string[] {
  return uniq(asArray(value).map((entry) => normalizeLowerPhrase(entry, maxLength)).filter(Boolean)).slice(
    0,
    maxItems,
  ) as string[];
}

function normalizeOptionalText(value: any, maxLength = 160) {
  return normalizeText(value, maxLength) || null;
}

function normalizePrice(value: any) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function readConfidenceMetric(confidence: any, key: string) {
  if (!confidence || typeof confidence !== 'object' || Array.isArray(confidence)) return null;
  const value = confidence[key];
  return typeof value === 'number' ? value : null;
}

function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = normalizeOptionalText(value, 240);
    if (normalized) return normalized;
  }
  return null;
}

function firstNumber(...values: any[]) {
  for (const value of values) {
    const normalized = normalizePrice(value);
    if (normalized != null) return normalized;
  }
  return null;
}

function makeExternalItemId(...values: any[]) {
  const stableId = firstNonEmpty(...values);
  if (stableId) {
    return `ext_${stableId.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80)}`;
  }
  return `ext_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function safeHostname(rawUrl?: string | null) {
  try {
    const hostname = new URL(String(rawUrl || '').trim()).hostname.replace(/^www\./i, '');
    return hostname || null;
  } catch {
    return null;
  }
}

export function normalizeWardrobeSeason(value: any) {
  const normalized = normalizeLowerPhrase(value, 20);
  if (!normalized) return 'all';
  if (normalized.includes('autumn')) return 'fall';
  return SEASON_VALUES.includes(normalized) ? normalized : 'all';
}

export function isExternalItemId(value: any) {
  return String(value || '').trim().startsWith('ext_');
}

export function isExternalItemLike(item: Record<string, any> | null | undefined) {
  if (!item) return false;
  if (item.source_type === 'external') return true;
  if (item.is_saved_to_closet === false) return true;
  return isExternalItemId(item.id);
}

export function inferWardrobeMainCategory(value: any) {
  return (
    deriveMainCategory({
      mainCategory: value,
      subcategory: value,
      type: value,
      name: value,
    }) || null
  );
}

function resolveWardrobeTaxonomy({
  mainCategory,
  subcategory,
  type,
  name,
  layeringRole,
}: {
  mainCategory?: any;
  subcategory?: any;
  type?: any;
  name?: any;
  layeringRole?: any;
}) {
  const rawType = normalizeOptionalText(type, 80);
  const rawSubtype = normalizeOptionalText(subcategory, 40);
  const resolvedMainCategory =
    deriveMainCategory({
      mainCategory: normalizeOptionalText(mainCategory, 40),
      subcategory: rawSubtype,
      type: rawType,
      name: normalizeOptionalText(name, 160),
      layeringRole: normalizeOptionalText(layeringRole, 24),
    }) || null;
  const resolvedSubcategory = canonicalizeSubtype(rawSubtype || rawType || name, {
    mainCategory: resolvedMainCategory,
  });
  const resolvedType = resolvedSubcategory
    ? getFriendlyTypeLabel(resolvedSubcategory, rawType)
    : rawType;
  const resolvedLayeringRole =
    normalizeOptionalText(layeringRole, 24) || getDefaultLayeringRole(resolvedSubcategory, resolvedMainCategory);

  return {
    mainCategory: resolvedMainCategory,
    subcategory: resolvedSubcategory,
    type: resolvedType,
    layeringRole: resolvedLayeringRole,
  };
}

export function mergeImportedProductData({
  scraped = {},
  tagged = {},
  normalized = {},
}: {
  scraped?: Record<string, any> | null;
  tagged?: Record<string, any> | null;
  normalized?: Record<string, any> | null;
}) {
  const sourceTitle = firstNonEmpty(
    scraped?.source_title,
    scraped?.title,
    scraped?.name,
    normalized?.source_title,
    tagged?.source_title,
  );
  const price = firstNumber(
    scraped?.price,
    scraped?.retail_price,
    normalized?.price,
    normalized?.retail_price,
    tagged?.price,
    tagged?.retail_price,
  );
  const retailer = firstNonEmpty(
    scraped?.retailer,
    scraped?.retailer_name,
    normalized?.retailer,
    normalized?.retailer_name,
    tagged?.retailer,
    tagged?.retailer_name,
  );
  const productUrl = firstNonEmpty(
    scraped?.product_url,
    scraped?.source_url,
    scraped?.url,
    normalized?.product_url,
    normalized?.source_url,
    tagged?.product_url,
    tagged?.source_url,
  );
  const originalImageUrl = firstNonEmpty(
    scraped?.original_image_url,
    scraped?.source_image_url,
    normalized?.original_image_url,
    normalized?.source_image_url,
    tagged?.original_image_url,
    tagged?.source_image_url,
  );
  const merged = {
    source_title: sourceTitle,
    name: firstNonEmpty(normalized?.name, tagged?.name, sourceTitle, 'Imported Item'),
    brand: firstNonEmpty(scraped?.brand, normalized?.brand, tagged?.brand),
    price,
    retail_price: price,
    currency: firstNonEmpty(scraped?.currency, normalized?.currency, tagged?.currency),
    retailer,
    retailer_name: retailer,
    product_url: productUrl,
    source_url: productUrl,
    source_domain: firstNonEmpty(scraped?.source_domain, normalized?.source_domain, tagged?.source_domain, safeHostname(productUrl)),
    source_type: firstNonEmpty(scraped?.source_type, normalized?.source_type, tagged?.source_type),
    source_id: firstNonEmpty(scraped?.source_id, normalized?.source_id, tagged?.source_id),
    external_product_id: firstNonEmpty(
      scraped?.external_product_id,
      normalized?.external_product_id,
      tagged?.external_product_id,
    ),
    original_image_url: originalImageUrl,
    source_image_url: firstNonEmpty(
      normalized?.source_image_url,
      tagged?.source_image_url,
      scraped?.source_image_url,
      originalImageUrl,
    ),
  };

  console.log('[import] merged fields', {
    hasBrand: Boolean(merged.brand),
    hasPrice: merged.price != null,
    hasOccasionTags: Array.isArray(normalized?.occasion_tags || tagged?.occasion_tags)
      ? (normalized?.occasion_tags || tagged?.occasion_tags || []).length > 0
      : false,
    hasFitType: Boolean(normalized?.fit_type || tagged?.fit_type),
  });

  return merged;
}

export function buildExternalItemPayload({
  scraped = {},
  tagged = {},
  normalized = {},
  uploadedImage,
  sourceSubtype = 'browser_import',
  fallbackName,
}: {
  scraped?: Record<string, any> | null;
  tagged?: Record<string, any> | null;
  normalized?: Record<string, any> | null;
  uploadedImage?: UploadedImageShape | null;
  sourceSubtype?: ExternalItemSourceSubtype;
  fallbackName?: string | null;
}): ExternalItemPayload {
  const mergedImport = mergeImportedProductData({
    scraped: scraped || {},
    tagged: tagged || {},
    normalized: normalized || {},
  });
  const taxonomy = resolveWardrobeTaxonomy({
    mainCategory: normalized?.main_category || tagged?.main_category,
    subcategory: normalized?.subcategory || tagged?.subcategory,
    type: normalized?.type || tagged?.type,
    name: normalized?.name || tagged?.name || mergedImport.source_title || fallbackName,
    layeringRole: normalized?.layering_role || tagged?.layering_role,
  });

  const externalId = makeExternalItemId(
    mergedImport.external_product_id,
    mergedImport.source_id,
    mergedImport.product_url,
    mergedImport.original_image_url,
    fallbackName,
  );

  return {
    id: externalId,
    source_type: 'external',
    source_subtype: sourceSubtype,
    external_item_id: externalId,
    is_saved_to_closet: false,
    source_title: mergedImport.source_title || normalizeOptionalText(fallbackName, 160),
    name: firstNonEmpty(
      normalized?.name,
      tagged?.name,
      mergedImport.source_title,
      fallbackName,
      'Imported Item',
    ) as string,
    brand: mergedImport.brand,
    price: mergedImport.price,
    retail_price: mergedImport.retail_price,
    currency: mergedImport.currency,
    retailer: mergedImport.retailer,
    retailer_name: mergedImport.retailer_name,
    product_url: mergedImport.product_url,
    source_url: mergedImport.source_url,
    source_domain: mergedImport.source_domain,
    image_url:
      uploadedImage?.storageUrl ??
      uploadedImage?.accessUrl ??
      uploadedImage?.imageUrl ??
      normalizeOptionalText(normalized?.image_url, 240),
    image_path: uploadedImage?.imagePath ?? normalizeOptionalText(normalized?.image_path, 240),
    thumbnail_url: uploadedImage?.thumbnailUrl ?? normalizeOptionalText(normalized?.thumbnail_url, 240),
    display_image_url:
      uploadedImage?.displayImageUrl ??
      uploadedImage?.storageUrl ??
      uploadedImage?.accessUrl ??
      uploadedImage?.imageUrl ??
      normalizeOptionalText(normalized?.display_image_url, 240),
    original_image_url: mergedImport.original_image_url,
    cutout_url:
      uploadedImage?.cutoutImageUrl ?? normalizeOptionalText(normalized?.cutout_url, 240) ?? normalizeOptionalText(normalized?.cutout_image_url, 240),
    cutout_image_url:
      uploadedImage?.cutoutImageUrl ?? normalizeOptionalText(normalized?.cutout_image_url, 240),
    cutout_thumbnail_url:
      uploadedImage?.cutoutThumbnailUrl ??
      normalizeOptionalText(normalized?.cutout_thumbnail_url, 240),
    cutout_display_url:
      uploadedImage?.cutoutDisplayUrl ??
      normalizeOptionalText(normalized?.cutout_display_url, 240),
    bg_removed:
      typeof uploadedImage?.bgRemoved === 'boolean'
        ? uploadedImage.bgRemoved
        : Boolean(normalized?.bg_removed),
    source_image_url: mergedImport.source_image_url || mergedImport.original_image_url,
    main_category: taxonomy.mainCategory || 'top',
    subcategory: taxonomy.subcategory,
    type: taxonomy.type,
    primary_color: normalizeOptionalText(normalized?.primary_color || tagged?.primary_color, 32)?.toLowerCase() || null,
    secondary_colors: normalizeStringArray(normalized?.secondary_colors || tagged?.secondary_colors, 6, 24),
    color_family: normalizeStringArray(normalized?.color_family || tagged?.color_family, 6, 24),
    vibe_tags: normalizeStringArray(normalized?.vibe_tags || tagged?.vibe_tags, 10, 24),
    occasion_tags: normalizeStringArray(normalized?.occasion_tags || tagged?.occasion_tags, 8, 24),
    season: normalizeWardrobeSeason(normalized?.season || tagged?.season),
    formality: normalizeOptionalText(normalized?.formality || tagged?.formality, 24),
    fit_type: normalizeOptionalText(normalized?.fit_type || tagged?.fit_type, 32),
    silhouette: normalizeOptionalText(normalized?.silhouette || tagged?.silhouette, 32),
    material: normalizeOptionalText(normalized?.material || tagged?.material || tagged?.material_guess, 40),
    material_guess: normalizeOptionalText(normalized?.material_guess || tagged?.material_guess || tagged?.material, 40),
    fabric_weight: normalizeOptionalText(normalized?.fabric_weight || tagged?.fabric_weight, 24),
    pattern_description: normalizeOptionalText(normalized?.pattern_description || tagged?.pattern_description, 80),
    pattern_type: normalizeOptionalText(normalized?.pattern_type || tagged?.pattern_type, 40),
    texture_notes: normalizeOptionalText(normalized?.texture_notes || tagged?.texture_notes, 80),
    layering_role: taxonomy.layeringRole,
    statement_level: normalizeOptionalText(normalized?.statement_level || tagged?.statement_level, 16),
    footwear_style: normalizeOptionalText(normalized?.footwear_style || tagged?.footwear_style, 24),
    style_role: normalizeOptionalText(normalized?.style_role || tagged?.style_role, 24),
    weather_use: normalizeStringArray(normalized?.weather_use || tagged?.weather_use, 5, 18),
    fit_notes: normalized?.fit_notes || tagged?.fit_notes || null,
    try_on_fit_notes: normalizeOptionalText(normalized?.try_on_fit_notes || tagged?.try_on_fit_notes, 180),
    styling_notes: normalizeOptionalText(normalized?.styling_notes || tagged?.styling_notes, 180),
    source_id: mergedImport.source_id,
    external_product_id: mergedImport.external_product_id,
    confidence: normalized?.confidence || tagged?.confidence || null,
    meta: {
      ...(scraped || {}),
      ...(normalized || {}),
      source_type: 'external',
      source_subtype: sourceSubtype,
      is_saved_to_closet: false,
    },
  };
}

function inferSourceType(importMethod?: string | null, importMeta?: Record<string, any> | null) {
  const normalized = normalizeLowerPhrase(importMethod || importMeta?.source_type, 32);
  if (normalized === 'pick' || normalized === 'autoscan' || normalized === 'screenshot') return 'browser_import';
  if (normalized === 'camera') return 'wardrobe_capture';
  if (normalized === 'photos' || normalized === 'manual') return 'manual_upload';
  if (importMeta?.product_url || importMeta?.source_url) return 'external_link';
  return normalized || null;
}

function normalizeManualVibes(value: any) {
  return normalizeStringArray(value, 10, 24);
}

export function buildWardrobeInsertPayload({
  userId,
  uploadedImage,
  normalizedTags,
  importMeta,
  manualOverride = false,
  manualFields,
  wardrobeStatus = 'owned',
  importMethod,
  sourceType,
  sourceTitleFallback,
}: BuildWardrobeInsertPayloadArgs) {
  const mergedImport = mergeImportedProductData({
    scraped: importMeta || {},
    tagged: normalizedTags || {},
    normalized: normalizedTags || {},
  });
  const manualName = normalizeOptionalText(manualFields?.name, 120);
  const manualTaxonomy = resolveWardrobeTaxonomy({
    mainCategory: manualFields?.main_category,
    subcategory: manualFields?.subcategory,
    type: manualFields?.type,
    name: manualName,
  });
  const manualColor = normalizeLowerPhrase(manualFields?.color, 24) || null;
  const autoTaxonomy = resolveWardrobeTaxonomy({
    mainCategory: normalizedTags?.main_category,
    subcategory: normalizedTags?.subcategory,
    type: normalizedTags?.type,
    name: normalizedTags?.name || mergedImport.source_title || sourceTitleFallback,
    layeringRole: normalizedTags?.layering_role,
  });
  const season = normalizeWardrobeSeason(
    manualOverride ? manualFields?.season : normalizedTags?.season,
  );
  const primaryColor = manualOverride ? manualColor : normalizeOptionalText(normalizedTags?.primary_color, 32)?.toLowerCase() || null;
  const finalName = firstNonEmpty(
    manualOverride ? manualName : null,
    normalizedTags?.name,
    mergedImport.source_title,
    sourceTitleFallback,
    'Imported Item',
  );
  const finalCategory =
    (manualOverride ? manualTaxonomy.mainCategory : autoTaxonomy.mainCategory) ||
    inferWardrobeMainCategory(
      manualOverride
        ? manualTaxonomy.subcategory || manualTaxonomy.type || finalName
        : autoTaxonomy.subcategory || autoTaxonomy.type || finalName,
    ) ||
    'top';
  const finalSubcategory = manualOverride ? manualTaxonomy.subcategory : autoTaxonomy.subcategory;
  const finalType = manualOverride ? manualTaxonomy.type : autoTaxonomy.type;
  const finalLayeringRole =
    (manualOverride ? manualTaxonomy.layeringRole : autoTaxonomy.layeringRole) ||
    getDefaultLayeringRole(finalSubcategory, finalCategory);
  const originalImageUrl =
    mergedImport.original_image_url ||
    normalizeOptionalText(uploadedImage?.storageUrl, 500) ||
    normalizeOptionalText(uploadedImage?.accessUrl, 500) ||
    normalizeOptionalText(uploadedImage?.imageUrl, 500) ||
    null;
  const cutoutImageUrl = normalizeOptionalText(uploadedImage?.cutoutImageUrl, 500);
  const resolvedImageUrl =
    cutoutImageUrl ||
    normalizeOptionalText(uploadedImage?.storageUrl, 500) ||
    normalizeOptionalText(uploadedImage?.accessUrl, 500) ||
    normalizeOptionalText(uploadedImage?.imageUrl, 500) ||
    null;
  const bgRemoved = Boolean(uploadedImage?.bgRemoved && cutoutImageUrl);

  const payload: Record<string, any> = {
    user_id: userId,
    name: finalName,
    source_title: mergedImport.source_title || normalizeOptionalText(sourceTitleFallback, 160),
    type: finalType,
    main_category: finalCategory,
    subcategory: finalSubcategory,
    color: primaryColor,
    primary_color: primaryColor,
    secondary_colors: normalizeStringArray(normalizedTags?.secondary_colors, 6, 24),
    color_family: normalizeStringArray(normalizedTags?.color_family, 6, 24),
    pattern_description: normalizeOptionalText(normalizedTags?.pattern_description, 80) || '',
    pattern_type: normalizeOptionalText(normalizedTags?.pattern_type, 40),
    material: normalizeOptionalText(normalizedTags?.material || normalizedTags?.material_guess, 40),
    material_guess: normalizeOptionalText(normalizedTags?.material_guess || normalizedTags?.material, 40),
    fabric_weight: normalizeOptionalText(normalizedTags?.fabric_weight, 24),
    texture_notes: normalizeOptionalText(normalizedTags?.texture_notes, 80),
    silhouette: normalizeOptionalText(normalizedTags?.silhouette, 32),
    fit_type: normalizeOptionalText(normalizedTags?.fit_type, 32),
    length: normalizeOptionalText(normalizedTags?.length, 24),
    rise: normalizeOptionalText(normalizedTags?.rise, 24),
    sleeve_length: normalizeOptionalText(normalizedTags?.sleeve_length, 24),
    formality: normalizeOptionalText(normalizedTags?.formality, 24),
    occasion_tags: normalizeStringArray(normalizedTags?.occasion_tags, 8, 24),
    layering_role: finalLayeringRole,
    statement_level: normalizeOptionalText(normalizedTags?.statement_level, 16),
    footwear_style: normalizeOptionalText(normalizedTags?.footwear_style, 24),
    style_role: normalizeOptionalText(normalizedTags?.style_role, 24),
    garment_function: normalizeOptionalText(normalizedTags?.garment_function, 32),
    subcategory_confidence:
      typeof normalizedTags?.subcategory_confidence === 'number' ? normalizedTags.subcategory_confidence : null,
    function_confidence:
      typeof normalizedTags?.function_confidence === 'number' ? normalizedTags.function_confidence : null,
    material_confidence:
      typeof normalizedTags?.material_confidence === 'number'
        ? normalizedTags.material_confidence
        : readConfidenceMetric(normalizedTags?.confidence, 'material') != null
          ? readConfidenceMetric(normalizedTags?.confidence, 'material')
          : null,
    weather_use: normalizeStringArray(normalizedTags?.weather_use, 5, 18),
    fit_notes: normalizedTags?.fit_notes || {
          stacking: null,
          rise: normalizeOptionalText(normalizedTags?.rise, 24),
          length: normalizeOptionalText(normalizedTags?.length, 24),
          fit: normalizeOptionalText(normalizedTags?.fit_type, 24),
        },
    try_on_fit_notes: normalizeOptionalText(normalizedTags?.try_on_fit_notes, 180),
    styling_notes: normalizeOptionalText(normalizedTags?.styling_notes, 180),
    vibe_tags: manualOverride ? normalizeManualVibes(manualFields?.vibes) : normalizeStringArray(normalizedTags?.vibe_tags, 10, 24),
    season,
    image_url: resolvedImageUrl,
    image_path: uploadedImage?.imagePath ?? null,
    thumbnail_url: normalizeOptionalText(uploadedImage?.thumbnailUrl, 500),
    display_image_url:
      normalizeOptionalText(uploadedImage?.displayImageUrl, 500) ||
      normalizeOptionalText(uploadedImage?.storageUrl, 500) ||
      normalizeOptionalText(uploadedImage?.accessUrl, 500) ||
      normalizeOptionalText(uploadedImage?.imageUrl, 500) ||
      null,
    brand: mergedImport.brand,
    price: mergedImport.price,
    retail_price: mergedImport.retail_price,
    currency: mergedImport.currency,
    retailer: mergedImport.retailer,
    retailer_name: mergedImport.retailer_name,
    product_url: mergedImport.product_url,
    source_url: mergedImport.source_url,
    source_domain: mergedImport.source_domain,
    source_type: sourceType || mergedImport.source_type || inferSourceType(importMethod, importMeta),
    source_id: mergedImport.source_id,
    external_product_id: mergedImport.external_product_id,
    original_image_url: originalImageUrl,
    cutout_image_url: cutoutImageUrl,
    cutout_thumbnail_url:
      normalizeOptionalText(uploadedImage?.cutoutThumbnailUrl, 500) ||
      normalizeOptionalText(normalizedTags?.cutout_thumbnail_url, 500),
    cutout_display_url:
      normalizeOptionalText(uploadedImage?.cutoutDisplayUrl, 500) ||
      normalizeOptionalText(normalizedTags?.cutout_display_url, 500),
    bg_removed: bgRemoved,
    source_image_url: mergedImport.source_image_url || originalImageUrl,
    import_method: importMethod || null,
    wardrobe_status: wardrobeStatus,
  };

  if (__DEV__) {
    console.log('[import] insert payload preview', payload);
  }

  return payload;
}

export function buildWardrobeInsertPayloadFromExternalItem(
  externalItem: Record<string, any>,
  userId: string,
  options?: {
    wardrobeStatus?: string | null;
    importMethod?: string | null;
    sourceTitleFallback?: string | null;
  },
) {
  return buildWardrobeInsertPayload({
    userId,
    uploadedImage: {
      imagePath: externalItem?.image_path ?? null,
      imageUrl: externalItem?.image_url ?? null,
      thumbnailUrl: externalItem?.thumbnail_url ?? null,
      displayImageUrl: externalItem?.display_image_url ?? null,
      cutoutImageUrl: externalItem?.cutout_image_url ?? null,
      cutoutThumbnailUrl: externalItem?.cutout_thumbnail_url ?? null,
      cutoutDisplayUrl: externalItem?.cutout_display_url ?? null,
      bgRemoved: externalItem?.bg_removed ?? null,
    },
    normalizedTags: externalItem as TaggedFashionItem,
    importMeta: {
      ...(externalItem?.meta || {}),
      source_url: externalItem?.source_url ?? externalItem?.product_url ?? null,
      product_url: externalItem?.product_url ?? externalItem?.source_url ?? null,
      source_domain: externalItem?.source_domain ?? null,
      brand: externalItem?.brand ?? null,
      retailer: externalItem?.retailer ?? externalItem?.retailer_name ?? null,
      retailer_name: externalItem?.retailer_name ?? externalItem?.retailer ?? null,
      price: externalItem?.price ?? externalItem?.retail_price ?? null,
      retail_price: externalItem?.retail_price ?? externalItem?.price ?? null,
      currency: externalItem?.currency ?? null,
      source_image_url: externalItem?.source_image_url ?? externalItem?.original_image_url ?? externalItem?.image_url ?? null,
      original_image_url: externalItem?.original_image_url ?? externalItem?.source_image_url ?? externalItem?.image_url ?? null,
      source_type: externalItem?.source_subtype ?? externalItem?.meta?.source_type ?? 'browser_import',
      source_id: externalItem?.source_id ?? null,
      external_product_id: externalItem?.external_product_id ?? externalItem?.external_item_id ?? null,
      source_title: externalItem?.source_title ?? externalItem?.name ?? null,
    },
    manualOverride: false,
    wardrobeStatus: options?.wardrobeStatus ?? 'owned',
    importMethod: options?.importMethod ?? externalItem?.source_subtype ?? 'pick',
    sourceType: externalItem?.source_subtype ?? 'browser_import',
    sourceTitleFallback: options?.sourceTitleFallback ?? externalItem?.source_title ?? externalItem?.name ?? 'Imported Item',
  });
}

export function mergeWardrobeUpdateWithExisting(existingItem: Record<string, any>, nextPayload: Record<string, any>) {
  const merged = { ...(existingItem || {}) };

  for (const [key, value] of Object.entries(nextPayload || {})) {
    if (typeof value !== 'undefined') {
      merged[key] = value;
    }
  }

  return merged;
}
