import type { TaggedFashionItem } from './tagging';

type UploadedImageShape = {
  imagePath?: string | null;
  imageUrl?: string | null;
  accessUrl?: string | null;
};

type ManualWardrobeFields = {
  name?: string | null;
  type?: string | null;
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
  original_image_url?: string | null;
  source_image_url?: string | null;
  main_category?: string | null;
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

const MAIN_CATEGORY_VALUES = ['top', 'bottom', 'shoes', 'outerwear', 'accessory', 'layer', 'onepiece'];
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
  const normalized = normalizeLowerPhrase(value, 80);
  if (!normalized) return null;
  if (MAIN_CATEGORY_VALUES.includes(normalized)) return normalized;
  if (/(dress|romper|jumpsuit|onepiece|one-piece)/.test(normalized)) return 'onepiece';
  if (/(blazer|jacket|coat|parka|trench|outerwear)/.test(normalized)) return 'outerwear';
  if (/(cardigan|vest|overshirt|shacket|layer)/.test(normalized)) return 'layer';
  if (/(shoe|sneaker|boot|loafer|heel|sandal|slide)/.test(normalized)) return 'shoes';
  if (/(pant|pants|jean|trouser|skirt|short|legging|bottom)/.test(normalized)) return 'bottom';
  if (/(bag|hat|belt|scarf|jewelry|watch|accessory)/.test(normalized)) return 'accessory';
  if (/(tee|shirt|tank|blouse|polo|hoodie|sweater|top)/.test(normalized)) return 'top';
  return null;
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
    image_url: uploadedImage?.imageUrl ?? normalizeOptionalText(normalized?.image_url, 240),
    image_path: uploadedImage?.imagePath ?? normalizeOptionalText(normalized?.image_path, 240),
    original_image_url: mergedImport.original_image_url,
    source_image_url: mergedImport.source_image_url,
    main_category:
      inferWardrobeMainCategory(normalized?.main_category || normalized?.type || tagged?.main_category || tagged?.type) ||
      'top',
    type: normalizeOptionalText(normalized?.type || tagged?.type, 80),
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
    layering_role: normalizeOptionalText(normalized?.layering_role || tagged?.layering_role, 24),
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
  const manualType = normalizeOptionalText(manualFields?.type, 80);
  const manualCategory = inferWardrobeMainCategory(manualFields?.main_category || manualType);
  const manualColor = normalizeLowerPhrase(manualFields?.color, 24) || null;
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
  const finalType = manualOverride ? manualType : normalizeOptionalText(normalizedTags?.type, 80);
  const finalCategory =
    (manualOverride ? manualCategory : inferWardrobeMainCategory(normalizedTags?.main_category || normalizedTags?.type)) ||
    inferWardrobeMainCategory(finalType) ||
    'top';

  const payload: Record<string, any> = {
    user_id: userId,
    name: finalName,
    source_title: mergedImport.source_title || normalizeOptionalText(sourceTitleFallback, 160),
    type: finalType,
    main_category: finalCategory,
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
    layering_role: normalizeOptionalText(normalizedTags?.layering_role, 24),
    statement_level: normalizeOptionalText(normalizedTags?.statement_level, 16),
    footwear_style: normalizeOptionalText(normalizedTags?.footwear_style, 24),
    style_role: normalizeOptionalText(normalizedTags?.style_role, 24),
    garment_function: normalizeOptionalText(normalizedTags?.garment_function, 32),
    subcategory: normalizeOptionalText(normalizedTags?.subcategory, 32),
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
    image_url: uploadedImage?.imageUrl ?? null,
    image_path: uploadedImage?.imagePath ?? null,
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
    original_image_url: mergedImport.original_image_url,
    source_image_url: mergedImport.source_image_url,
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
