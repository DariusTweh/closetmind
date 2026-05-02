import {
  CATEGORY_OPTIONS,
  canonicalizeSubtype,
  deriveMainCategory,
  getDefaultLayeringRole,
  getFriendlyTypeLabel,
  getSubtypeOptionsForCategory,
  resolveCanonicalSubtypeDraft,
} from './wardrobeTaxonomy';

export { CATEGORY_OPTIONS };

export const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all'];
export const COLORS = ['black', 'white', 'gray', 'blue', 'beige', 'brown', 'green', 'red'];

function readMeta(item: any) {
  return item?.meta && typeof item.meta === 'object' && !Array.isArray(item.meta) ? item.meta : {};
}

function firstArray(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function normalizeNumber(value: any) {
  if (value == null || value === '') return null;
  const parsed = Number.parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCsv(value: any) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseMarketplaceSettings(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function resolveSubtypeFromSources(item: any, meta: any) {
  return resolveCanonicalSubtypeDraft({
    subcategory: item?.subcategory || meta?.subcategory || null,
    type: item?.type || meta?.type || null,
    name: item?.name || item?.source_title || meta?.source_title || null,
    main_category: item?.main_category || meta?.main_category || null,
  });
}

function resolveMainCategoryFromSources(item: any, meta: any, subcategory: string | null) {
  return (
    deriveMainCategory({
      mainCategory: item?.main_category || meta?.main_category || null,
      subcategory,
      type: item?.type || meta?.type || null,
      name: item?.name || item?.source_title || meta?.source_title || null,
      layeringRole: item?.layering_role || meta?.layering_role || null,
    }) ||
    ''
  );
}

function resolveTypeLabel(value: string | null, fallback: string | null) {
  return getFriendlyTypeLabel(value, fallback) || fallback || '';
}

export function getSubtypeChipOptions(category: string | null | undefined) {
  return getSubtypeOptionsForCategory(category);
}

export function createEditItemDraft(item: any) {
  const meta = readMeta(item);
  const fitNotes = item?.fit_notes ?? meta?.fit_notes ?? null;
  const vibeTags = firstArray(item?.vibe_tags, meta?.vibe_tags);
  const occasionTags = firstArray(item?.occasion_tags, meta?.occasion_tags);
  const tags = firstArray(item?.tags, meta?.tags);
  const priceValue = item?.price ?? item?.retail_price ?? meta?.price ?? meta?.retail_price ?? null;
  const marketplaceSettings = item?.marketplace_settings ?? meta?.marketplace_settings ?? '';
  const subcategory = resolveSubtypeFromSources(item, meta);
  const mainCategory = resolveMainCategoryFromSources(item, meta, subcategory);
  const rawType = firstText(item?.type, meta?.type);
  const friendlyType = resolveTypeLabel(subcategory, rawType);

  return {
    name: item?.name || '',
    source_title: firstText(item?.source_title, meta?.source_title),
    main_category: mainCategory,
    subcategory: subcategory || '',
    type: friendlyType,
    primary_color: item?.primary_color || item?.color || '',
    pattern_description: item?.pattern_description || '',
    season: item?.season || '',
    vibe_tags: vibeTags.join(', '),
    brand: firstText(item?.brand, meta?.brand),
    price: priceValue != null ? String(priceValue) : '',
    retail_price: priceValue != null ? String(priceValue) : '',
    currency: firstText(item?.currency, meta?.currency),
    retailer: firstText(item?.retailer, item?.retailer_name, meta?.retailer, meta?.retailer_name),
    retailer_name: firstText(item?.retailer_name, item?.retailer, meta?.retailer_name, meta?.retailer),
    product_url: firstText(item?.product_url, item?.source_url, meta?.product_url, meta?.source_url),
    source_url: firstText(item?.source_url, item?.product_url, meta?.source_url, meta?.product_url),
    source_domain: firstText(item?.source_domain, meta?.source_domain),
    source_type: firstText(item?.source_type, meta?.source_type),
    source_id: firstText(item?.source_id, meta?.source_id),
    external_product_id: firstText(item?.external_product_id, meta?.external_product_id),
    source_image_url: firstText(item?.source_image_url, meta?.source_image_url),
    original_image_url: firstText(
      item?.original_image_url,
      item?.source_image_url,
      meta?.original_image_url,
      meta?.source_image_url,
    ),
    material: firstText(item?.material, item?.material_guess, meta?.material, meta?.material_guess),
    fit_type: firstText(item?.fit_type, fitNotes?.fit, meta?.fit_type),
    formality: firstText(item?.formality, meta?.formality),
    silhouette: firstText(item?.silhouette, meta?.silhouette),
    occasion_tags: occasionTags.join(', '),
    try_on_fit_notes: firstText(item?.try_on_fit_notes, meta?.try_on_fit_notes),
    layering_role: item?.layering_role || meta?.layering_role || '',
    statement_level: item?.statement_level || meta?.statement_level || '',
    footwear_style: item?.footwear_style || meta?.footwear_style || '',
    styling_notes: firstText(item?.styling_notes, meta?.styling_notes),
    fit_notes:
      typeof fitNotes === 'string'
        ? fitNotes
        : fitNotes?.fit || item?.try_on_fit_notes || meta?.try_on_fit_notes || '',
    tags: tags.join(', '),
    listed_status: item?.is_listed === true || item?.listed === true ? 'listed' : 'not listed',
    marketplace_settings:
      typeof marketplaceSettings === 'string'
        ? marketplaceSettings
        : marketplaceSettings
          ? JSON.stringify(marketplaceSettings)
          : '',
    notes: firstText(item?.notes, meta?.notes),
  };
}

export function buildEditItemPayload(draft: any, existingItem: any = {}) {
  const existingMeta = readMeta(existingItem);
  const price = normalizeNumber(
    draft.retail_price ||
      draft.price ||
      existingItem?.retail_price ||
      existingItem?.price ||
      existingMeta?.retail_price ||
      existingMeta?.price,
  );
  const sourceTitle =
    String(draft.source_title || existingItem?.source_title || existingMeta?.source_title || '').trim() || null;
  const name = String(draft.name || existingItem?.name || '').trim();
  const primaryColor = String(draft.primary_color || existingItem?.primary_color || existingItem?.color || '').trim() || null;
  const rawTypeFallback =
    String(draft.type || existingItem?.type || existingMeta?.type || '').trim() || null;
  const resolvedSubcategory = canonicalizeSubtype(
    draft.subcategory ||
      existingItem?.subcategory ||
      existingMeta?.subcategory ||
      rawTypeFallback ||
      name ||
      sourceTitle,
    {
      mainCategory: draft.main_category || existingItem?.main_category || existingMeta?.main_category || null,
    },
  );
  const resolvedMainCategory =
    deriveMainCategory({
      mainCategory: draft.main_category || existingItem?.main_category || existingMeta?.main_category || null,
      subcategory: resolvedSubcategory,
      type: rawTypeFallback,
      name: name || sourceTitle,
      layeringRole: draft.layering_role || existingItem?.layering_role || existingMeta?.layering_role || null,
    }) || null;
  const resolvedType = resolvedSubcategory
    ? getFriendlyTypeLabel(resolvedSubcategory, rawTypeFallback)
    : rawTypeFallback;
  const resolvedSeason =
    draft.season === 'all'
      ? 'all'
      : draft.season || existingItem?.season || existingMeta?.season || 'all';
  const vibeTags = draft.vibe_tags
    ? normalizeCsv(draft.vibe_tags)
    : Array.isArray(existingItem?.vibe_tags)
      ? existingItem.vibe_tags
      : Array.isArray(existingMeta?.vibe_tags)
        ? existingMeta.vibe_tags
        : [];
  const occasionTags = draft.occasion_tags
    ? normalizeCsv(draft.occasion_tags)
    : Array.isArray(existingItem?.occasion_tags)
      ? existingItem.occasion_tags
      : Array.isArray(existingMeta?.occasion_tags)
        ? existingMeta.occasion_tags
        : [];
  const tags = draft.tags
    ? normalizeCsv(draft.tags)
    : Array.isArray(existingItem?.tags)
      ? existingItem.tags
      : Array.isArray(existingMeta?.tags)
        ? existingMeta.tags
        : [];
  const fitValue = String(draft.fit_type || '').trim() || null;
  const riseValue = existingItem?.fit_notes?.rise || existingMeta?.fit_notes?.rise || existingItem?.rise || null;
  const lengthValue =
    existingItem?.fit_notes?.length || existingMeta?.fit_notes?.length || existingItem?.length || null;
  const stackingValue = existingItem?.fit_notes?.stacking || existingMeta?.fit_notes?.stacking || null;
  const retailer =
    String(
      draft.retailer ||
        draft.retailer_name ||
        existingItem?.retailer ||
        existingItem?.retailer_name ||
        existingMeta?.retailer ||
        existingMeta?.retailer_name ||
        '',
    ).trim() || null;
  const retailerName =
    String(
      draft.retailer_name ||
        draft.retailer ||
        existingItem?.retailer_name ||
        existingItem?.retailer ||
        existingMeta?.retailer_name ||
        existingMeta?.retailer ||
        '',
    ).trim() || null;
  const productUrl =
    String(
      draft.product_url ||
        draft.source_url ||
        existingItem?.product_url ||
        existingItem?.source_url ||
        existingMeta?.product_url ||
        existingMeta?.source_url ||
        '',
    ).trim() || null;
  const sourceUrl =
    String(
      draft.source_url ||
        draft.product_url ||
        existingItem?.source_url ||
        existingItem?.product_url ||
        existingMeta?.source_url ||
        existingMeta?.product_url ||
        '',
    ).trim() || null;
  const sourceDomain =
    String(draft.source_domain || existingItem?.source_domain || existingMeta?.source_domain || '').trim() || null;
  const sourceType =
    String(draft.source_type || existingItem?.source_type || existingMeta?.source_type || '').trim() || null;
  const sourceId =
    String(draft.source_id || existingItem?.source_id || existingMeta?.source_id || '').trim() || null;
  const externalProductId =
    String(draft.external_product_id || existingItem?.external_product_id || existingMeta?.external_product_id || '').trim() ||
    null;
  const sourceImageUrl =
    String(draft.source_image_url || existingItem?.source_image_url || existingMeta?.source_image_url || '').trim() ||
    null;
  const originalImageUrl =
    String(
      draft.original_image_url ||
        existingItem?.original_image_url ||
        existingMeta?.original_image_url ||
        existingItem?.source_image_url ||
        existingMeta?.source_image_url ||
        '',
    ).trim() || null;
  const material =
    String(
      draft.material ||
        existingItem?.material ||
        existingItem?.material_guess ||
        existingMeta?.material ||
        existingMeta?.material_guess ||
        '',
    ).trim() || null;
  const formality = String(draft.formality || existingItem?.formality || existingMeta?.formality || '').trim() || null;
  const silhouette =
    String(draft.silhouette || existingItem?.silhouette || existingMeta?.silhouette || '').trim() || null;
  const tryOnFitNotes =
    String(draft.try_on_fit_notes || existingItem?.try_on_fit_notes || existingMeta?.try_on_fit_notes || '').trim() ||
    null;
  const layeringRole =
    String(draft.layering_role || existingItem?.layering_role || existingMeta?.layering_role || '').trim() ||
    getDefaultLayeringRole(resolvedSubcategory, resolvedMainCategory) ||
    null;
  const statementLevel =
    String(draft.statement_level || existingItem?.statement_level || existingMeta?.statement_level || '').trim() ||
    null;
  const footwearStyle =
    String(draft.footwear_style || existingItem?.footwear_style || existingMeta?.footwear_style || '').trim() || null;
  const stylingNotes =
    String(draft.styling_notes || existingItem?.styling_notes || existingMeta?.styling_notes || '').trim() || null;
  const notes = String(draft.notes || existingItem?.notes || existingMeta?.notes || '').trim() || null;
  const marketplaceSettings =
    String(draft.marketplace_settings || existingItem?.marketplace_settings || existingMeta?.marketplace_settings || '').trim() ||
    null;
  const listedStatus = String(draft.listed_status || '').trim().toLowerCase();
  const listedValue = listedStatus
    ? ['listed', 'true', 'yes', '1', 'on'].includes(listedStatus)
    : existingItem?.is_listed === true || existingItem?.listed === true;
  const fitNotes = {
    stacking: stackingValue,
    rise: riseValue,
    length: lengthValue,
    fit: fitValue,
  };
  const brand = String(draft.brand || existingItem?.brand || existingMeta?.brand || '').trim() || null;
  const currency = String(draft.currency || existingItem?.currency || existingMeta?.currency || '').trim() || null;

  return {
    name,
    source_title: sourceTitle,
    main_category: resolvedMainCategory,
    subcategory: resolvedSubcategory,
    type: resolvedType,
    primary_color: primaryColor,
    color: primaryColor,
    pattern_description: String(draft.pattern_description || '').trim(),
    season: resolvedSeason,
    vibe_tags: vibeTags,
    brand,
    price,
    retail_price: price,
    currency,
    retailer,
    retailer_name: retailerName,
    product_url: productUrl,
    source_url: sourceUrl,
    source_domain: sourceDomain,
    source_type: sourceType,
    source_id: sourceId,
    external_product_id: externalProductId,
    source_image_url: sourceImageUrl,
    original_image_url: originalImageUrl,
    material,
    material_guess: material,
    fit_type: fitValue,
    formality,
    silhouette,
    occasion_tags: occasionTags,
    try_on_fit_notes: tryOnFitNotes,
    layering_role: layeringRole,
    statement_level: statementLevel,
    footwear_style: footwearStyle,
    styling_notes: stylingNotes,
    fit_notes: fitNotes,
    is_listed: listedValue,
    meta: {
      ...existingMeta,
      source_title: sourceTitle,
      brand,
      price,
      retail_price: price,
      currency,
      retailer,
      retailer_name: retailerName,
      product_url: productUrl,
      source_url: sourceUrl,
      source_domain: sourceDomain,
      source_type: sourceType,
      source_id: sourceId,
      external_product_id: externalProductId,
      source_image_url: sourceImageUrl,
      original_image_url: originalImageUrl,
      main_category: resolvedMainCategory,
      subcategory: resolvedSubcategory,
      type: resolvedType,
      primary_color: primaryColor,
      pattern_description: String(draft.pattern_description || '').trim() || null,
      season: resolvedSeason,
      vibe_tags: vibeTags,
      occasion_tags: occasionTags,
      material,
      material_guess: material,
      fit_type: fitValue,
      formality,
      silhouette,
      try_on_fit_notes: tryOnFitNotes,
      layering_role: layeringRole,
      statement_level: statementLevel,
      footwear_style: footwearStyle,
      styling_notes: stylingNotes,
      fit_notes: fitNotes,
      tags,
      notes,
      marketplace_settings: parseMarketplaceSettings(marketplaceSettings),
      listed_status: listedValue ? 'listed' : 'not listed',
    },
  };
}

export function formatItemMeta(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/_/g, ' ');
}
