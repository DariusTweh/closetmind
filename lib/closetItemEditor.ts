export const CATEGORY_OPTIONS = ['top', 'bottom', 'shoes', 'outerwear', 'onepiece', 'accessory', 'layer'];

export const TYPE_OPTIONS: Record<string, string[]> = {
  top: ['t-shirt', 'blouse', 'sweater', 'shirt', 'tank'],
  bottom: ['jeans', 'shorts', 'skirt', 'trousers', 'pants'],
  shoes: ['sneakers', 'boots', 'heels', 'loafers', 'sandals'],
  outerwear: ['jacket', 'coat', 'blazer', 'parka'],
  onepiece: ['dress', 'jumpsuit', 'romper'],
  accessory: ['hat', 'bag', 'scarf', 'belt', 'jewelry'],
  layer: ['hoodie', 'cardigan', 'vest', 'overshirt'],
};

export const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all'];
export const COLORS = ['black', 'white', 'gray', 'blue', 'beige', 'brown', 'green', 'red'];

export function createEditItemDraft(item: any) {
  return {
    name: item?.name || '',
    source_title: item?.source_title || '',
    main_category: item?.main_category || '',
    type: item?.type || '',
    primary_color: item?.primary_color || item?.color || '',
    pattern_description: item?.pattern_description || '',
    season: item?.season || '',
    vibe_tags: Array.isArray(item?.vibe_tags) ? item.vibe_tags.join(', ') : '',
    brand: item?.brand || '',
    price: item?.price ? String(item.price) : item?.retail_price ? String(item.retail_price) : '',
    retail_price: item?.retail_price ? String(item.retail_price) : item?.price ? String(item.price) : '',
    currency: item?.currency || '',
    retailer: item?.retailer || item?.retailer_name || '',
    retailer_name: item?.retailer_name || item?.retailer || '',
    product_url: item?.product_url || item?.source_url || '',
    source_url: item?.source_url || item?.product_url || '',
    source_domain: item?.source_domain || '',
    source_type: item?.source_type || '',
    source_id: item?.source_id || '',
    external_product_id: item?.external_product_id || '',
    source_image_url: item?.source_image_url || '',
    original_image_url: item?.original_image_url || item?.source_image_url || '',
    material: item?.material || item?.material_guess || '',
    fit_type: item?.fit_type || item?.fit_notes?.fit || '',
    formality: item?.formality || '',
    silhouette: item?.silhouette || '',
    occasion_tags: Array.isArray(item?.occasion_tags) ? item.occasion_tags.join(', ') : '',
    try_on_fit_notes: item?.try_on_fit_notes || '',
    layering_role: item?.layering_role || '',
    statement_level: item?.statement_level || '',
    footwear_style: item?.footwear_style || '',
    styling_notes: item?.styling_notes || '',
    fit_notes:
      typeof item?.fit_notes === 'string'
        ? item.fit_notes
        : item?.fit_notes?.fit || item?.try_on_fit_notes || '',
    tags: Array.isArray(item?.tags) ? item.tags.join(', ') : '',
    listed_status: item?.is_listed === true || item?.listed === true ? 'listed' : 'not listed',
    marketplace_settings: item?.marketplace_settings || '',
    notes: item?.notes || '',
  };
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

export function buildEditItemPayload(draft: any, existingItem: any = {}) {
  const price = normalizeNumber(draft.retail_price || draft.price || existingItem?.retail_price || existingItem?.price);
  const fitValue = String(draft.fit_type || '').trim() || null;
  const riseValue = existingItem?.fit_notes?.rise || existingItem?.rise || null;
  const lengthValue = existingItem?.fit_notes?.length || existingItem?.length || null;
  const stackingValue = existingItem?.fit_notes?.stacking || null;

  return {
    name: String(draft.name || '').trim(),
    source_title: String(draft.source_title || existingItem?.source_title || '').trim() || null,
    main_category: draft.main_category || existingItem?.main_category || null,
    type: String(draft.type || existingItem?.type || '').trim() || null,
    primary_color: String(draft.primary_color || existingItem?.primary_color || existingItem?.color || '').trim() || null,
    color: String(draft.primary_color || existingItem?.primary_color || existingItem?.color || '').trim() || null,
    pattern_description: String(draft.pattern_description || '').trim(),
    season: draft.season === 'all' ? 'all' : (draft.season || existingItem?.season || 'all'),
    vibe_tags: normalizeCsv(draft.vibe_tags),
    brand: String(draft.brand || '').trim() || null,
    price,
    retail_price: price,
    currency: String(draft.currency || existingItem?.currency || '').trim() || null,
    retailer: String(draft.retailer || draft.retailer_name || existingItem?.retailer || existingItem?.retailer_name || '').trim() || null,
    retailer_name: String(draft.retailer_name || draft.retailer || existingItem?.retailer_name || existingItem?.retailer || '').trim() || null,
    product_url: String(draft.product_url || draft.source_url || existingItem?.product_url || existingItem?.source_url || '').trim() || null,
    source_url: String(draft.source_url || draft.product_url || existingItem?.source_url || existingItem?.product_url || '').trim() || null,
    source_domain: String(draft.source_domain || existingItem?.source_domain || '').trim() || null,
    source_type: String(draft.source_type || existingItem?.source_type || '').trim() || null,
    source_id: String(draft.source_id || existingItem?.source_id || '').trim() || null,
    external_product_id: String(draft.external_product_id || existingItem?.external_product_id || '').trim() || null,
    source_image_url: String(draft.source_image_url || existingItem?.source_image_url || '').trim() || null,
    original_image_url: String(draft.original_image_url || existingItem?.original_image_url || existingItem?.source_image_url || '').trim() || null,
    material: String(draft.material || existingItem?.material || existingItem?.material_guess || '').trim() || null,
    material_guess: String(draft.material || existingItem?.material_guess || existingItem?.material || '').trim() || null,
    fit_type: fitValue,
    formality: String(draft.formality || existingItem?.formality || '').trim() || null,
    silhouette: String(draft.silhouette || existingItem?.silhouette || '').trim() || null,
    occasion_tags: draft.occasion_tags ? normalizeCsv(draft.occasion_tags) : Array.isArray(existingItem?.occasion_tags) ? existingItem.occasion_tags : [],
    try_on_fit_notes: String(draft.try_on_fit_notes || existingItem?.try_on_fit_notes || '').trim() || null,
    layering_role: String(draft.layering_role || existingItem?.layering_role || '').trim() || null,
    statement_level: String(draft.statement_level || existingItem?.statement_level || '').trim() || null,
    footwear_style: String(draft.footwear_style || existingItem?.footwear_style || '').trim() || null,
    styling_notes: String(draft.styling_notes || existingItem?.styling_notes || '').trim() || null,
    fit_notes: {
      stacking: stackingValue,
      rise: riseValue,
      length: lengthValue,
      fit: fitValue,
    },
  };
}

export function formatItemMeta(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/_/g, ' ');
}
