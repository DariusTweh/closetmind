import type { SavedOutfitItem } from '../types/styleCanvas';
import { normalizeSavedOutfitLikeItem } from '../utils/styleCanvasAdapters';

const DISPLAY_ORDER = ['onepiece', 'top', 'layer', 'bottom', 'shoes', 'outerwear', 'accessory'];

function normalizeString(value: unknown) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
}

function categorySortKey(item: any) {
  const rawCategory = String(item?.main_category || item?.category || item?.type || '').trim().toLowerCase();
  const index = DISPLAY_ORDER.indexOf(rawCategory);
  return index === -1 ? 99 : index;
}

export function buildSavedOutfitItemSnapshot(item: any, reason?: string | null): SavedOutfitItem {
  const normalized = normalizeSavedOutfitLikeItem({
    ...item,
    reason: String(reason ?? item?.reason ?? '').trim() || null,
  });

  return {
    ...normalized,
    name: normalized.name || normalized.title || null,
    type: normalized.type || normalized.category || null,
    main_category: normalized.main_category || normalized.category || normalized.type || null,
    subcategory: normalized.subcategory || null,
    primary_color: normalized.primary_color || normalized.color || null,
    secondary_colors: normalizeStringArray(item?.secondary_colors),
    season: normalizeString(item?.season),
    is_saved_to_closet: normalized.source_type === 'wardrobe',
  };
}

export function extractSavedOutfitItemIds(items: any[]) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((entry) => buildSavedOutfitItemSnapshot(entry))
        .filter((entry) => entry.source_type === 'wardrobe')
        .map((entry) => normalizeString(entry.source_item_id || entry.id))
        .filter(Boolean),
    ),
  );
}

export function extractSavedOutfitExternalIds(items: any[]) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((entry) => buildSavedOutfitItemSnapshot(entry))
        .filter((entry) => entry.source_type === 'external')
        .map((entry) => normalizeString(entry.source_item_id || entry.external_item_id || entry.id))
        .filter(Boolean),
    ),
  );
}

export function hydrateSavedOutfitItems(savedItems: any[], wardrobeItems: any[], externalItems: any[] = []) {
  const wardrobeById = new Map(
    (Array.isArray(wardrobeItems) ? wardrobeItems : []).map((item: any) => [String(item?.id || ''), item]),
  );
  const externalById = new Map(
    (Array.isArray(externalItems) ? externalItems : []).map((item: any) => [String(item?.id || ''), item]),
  );

  return (Array.isArray(savedItems) ? savedItems : [])
    .map((entry, index) => {
      const snapshot = buildSavedOutfitItemSnapshot(entry, entry?.reason);
      const sourceLookupId = String(
        snapshot.source_item_id || snapshot.external_item_id || snapshot.id || `snapshot-${index}`,
      ).trim();

      if (snapshot.source_type === 'wardrobe') {
        const current = sourceLookupId ? wardrobeById.get(sourceLookupId) : null;
        return {
          ...snapshot,
          ...current,
          id: current?.id || snapshot.source_item_id || snapshot.id || `wardrobe-${index}`,
          source_type: 'wardrobe',
          source_item_id: current?.id || snapshot.source_item_id || snapshot.id || null,
          title: snapshot.title || current?.name || snapshot.name || null,
          name: current?.name || snapshot.name || snapshot.title || null,
          type: current?.type || snapshot.type || snapshot.category || null,
          main_category: current?.main_category || snapshot.main_category || snapshot.category || snapshot.type || null,
          subcategory: current?.subcategory || snapshot.subcategory || null,
          category: snapshot.category || current?.main_category || current?.type || null,
          color: snapshot.color || current?.primary_color || snapshot.primary_color || null,
          primary_color: current?.primary_color || snapshot.primary_color || snapshot.color || null,
          thumbnail_url: current?.thumbnail_url || snapshot.thumbnail_url || null,
          display_image_url: current?.display_image_url || snapshot.display_image_url || null,
          original_image_url: current?.original_image_url || snapshot.original_image_url || null,
          cutout_image_url: current?.cutout_image_url || snapshot.cutout_image_url || null,
          cutout_thumbnail_url: current?.cutout_thumbnail_url || snapshot.cutout_thumbnail_url || null,
          cutout_display_url: current?.cutout_display_url || snapshot.cutout_display_url || null,
          image_url: current?.image_url || snapshot.image_url,
          image_path: current?.image_path || snapshot.image_path || null,
          reason: snapshot.reason || null,
          locked: Boolean(snapshot.locked),
          outfit_role: snapshot.outfit_role || null,
          layout: snapshot.layout || null,
          is_saved_to_closet: true,
          is_external: false,
        };
      }

      const current = sourceLookupId ? externalById.get(sourceLookupId) : null;
      return {
        ...snapshot,
        ...current,
        id: current?.id || snapshot.source_item_id || snapshot.external_item_id || snapshot.id || `external-${index}`,
        source_type: 'external',
        source_item_id:
          current?.id || snapshot.source_item_id || snapshot.external_item_id || snapshot.id || null,
        external_item_id:
          current?.id || snapshot.external_item_id || snapshot.source_item_id || snapshot.id || null,
        title: snapshot.title || current?.title || snapshot.name || null,
        name: snapshot.name || snapshot.title || current?.title || 'External item',
        type: snapshot.type || snapshot.category || current?.category || null,
        main_category: snapshot.main_category || snapshot.category || current?.category || null,
        subcategory: snapshot.subcategory || null,
        category: snapshot.category || current?.category || snapshot.main_category || null,
        color: snapshot.color || current?.color || snapshot.primary_color || null,
        primary_color: snapshot.primary_color || snapshot.color || current?.color || null,
        thumbnail_url: current?.thumbnail_url || snapshot.thumbnail_url || null,
        display_image_url: current?.display_image_url || snapshot.display_image_url || null,
        original_image_url: current?.original_image_url || snapshot.original_image_url || null,
        cutout_image_url: current?.cutout_image_url || snapshot.cutout_image_url || null,
        cutout_thumbnail_url: current?.cutout_thumbnail_url || snapshot.cutout_thumbnail_url || null,
        cutout_display_url: current?.cutout_display_url || snapshot.cutout_display_url || null,
        image_url: current?.image_url || snapshot.image_url,
        image_path: current?.image_path || snapshot.image_path || null,
        cutout_url: current?.cutout_url || snapshot.cutout_url || null,
        product_url: current?.product_url || snapshot.product_url || null,
        brand: current?.brand || snapshot.brand || null,
        retailer: current?.retailer || snapshot.retailer || null,
        price: current?.price ?? snapshot.price ?? null,
        reason: snapshot.reason || null,
        locked: Boolean(snapshot.locked),
        outfit_role: snapshot.outfit_role || null,
        layout: snapshot.layout || null,
        source_subtype: snapshot.source_subtype || current?.source_subtype || 'browser_import',
        is_saved_to_closet: false,
        is_external: true,
      };
    })
    .filter(
      (item) =>
        item?.cutout_url ||
        item?.cutout_image_url ||
        item?.image_url ||
        item?.image_path ||
        item?.name ||
        item?.title ||
        item?.type,
    )
    .sort((left, right) => categorySortKey(left) - categorySortKey(right));
}
