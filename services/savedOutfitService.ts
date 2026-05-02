import {
  buildSavedOutfitItemSnapshot,
  extractSavedOutfitExternalIds,
  extractSavedOutfitItemIds,
  hydrateSavedOutfitItems,
} from '../lib/savedOutfitItems';
import { SubscriptionLimitError } from '../lib/subscriptions/errors';
import { canUseFeature } from '../lib/subscriptions/usageService';
import { supabase } from '../lib/supabase';
import type { SavedOutfitItem } from '../types/styleCanvas';
import { ensureExternalSavedOutfitRefs, loadExternalItemsByIds } from './externalItemsService';

const SAVED_OUTFIT_SELECT_V3 =
  'id, user_id, name, context, season, is_favorite, created_at, items, canvas_id, source_kind, travel_collection_id, activity_label, day_label, sort_order, outfit_mode';
const SAVED_OUTFIT_SELECT_V2 =
  'id, user_id, name, context, season, is_favorite, created_at, items, canvas_id, source_kind';
const SAVED_OUTFIT_SELECT_V1 = 'id, user_id, name, context, season, is_favorite, created_at, items';
const SAVED_OUTFIT_ITEM_SELECT =
  'id, saved_outfit_id, source_type, source_item_id, image_url, image_path, cutout_url, title, brand, retailer, product_url, price, category, color, reason, position';
const WARDROBE_SELECT_V4 =
  'id, user_id, image_url, image_path, thumbnail_url, display_image_url, original_image_url, cutout_image_url, cutout_thumbnail_url, cutout_display_url, name, type, main_category, subcategory, primary_color, secondary_colors, pattern_description, vibe_tags, season, brand, retailer, product_url, price';
const WARDROBE_SELECT_V3 =
  'id, user_id, image_url, image_path, cutout_image_url, name, type, main_category, subcategory, primary_color, secondary_colors, pattern_description, vibe_tags, season, brand, retailer, product_url, price';
const WARDROBE_SELECT_V2 =
  'id, user_id, image_url, image_path, name, type, main_category, subcategory, primary_color, secondary_colors, pattern_description, vibe_tags, season, brand, retailer, product_url, price';
const WARDROBE_SELECT_V1 =
  'id, user_id, image_url, image_path, name, type, main_category, primary_color, secondary_colors, pattern_description, vibe_tags, season, brand, retailer, product_url, price';

function normalizeText(value: any, maxLength = 240) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function isMissingSchemaError(error: any, target?: string) {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (target && !normalized.includes(String(target).toLowerCase())) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the table') ||
    normalized.includes('schema cache') ||
    normalized.includes('column') ||
    normalized.includes('relation')
  );
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You must be logged in to manage saved outfits.');
  }

  return user.id;
}

type FetchSavedOutfitRowsArgs = {
  userId: string;
  from?: number;
  to?: number;
  outfitIds?: string[];
  travelCollectionId?: string | null;
  travelCollectionIds?: string[];
  favoritesOnly?: boolean;
  outfitMode?: string | null;
};

async function fetchSavedOutfitRows(args: FetchSavedOutfitRowsArgs) {
  const {
    userId,
    from,
    to,
    outfitIds,
    travelCollectionId,
    travelCollectionIds,
    favoritesOnly,
    outfitMode,
  } = args;

  const normalizedOutfitIds = Array.from(
    new Set((outfitIds || []).map((value) => String(value || '').trim()).filter(Boolean)),
  );
  const normalizedTravelCollectionIds = Array.from(
    new Set((travelCollectionIds || []).map((value) => String(value || '').trim()).filter(Boolean)),
  );

  if (outfitIds && !normalizedOutfitIds.length) return [];
  if (travelCollectionIds && !normalizedTravelCollectionIds.length) return [];

  const runQuery = async (selectFields: string) => {
    let query = supabase
      .from('saved_outfits')
      .select(selectFields)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (normalizedOutfitIds.length) {
      query = query.in('id', normalizedOutfitIds);
    }

    if (travelCollectionId) {
      query = query.eq('travel_collection_id', travelCollectionId);
    } else if (normalizedTravelCollectionIds.length) {
      query = query.in('travel_collection_id', normalizedTravelCollectionIds);
    }

    if (favoritesOnly) {
      query = query.eq('is_favorite', true);
    }

    if (outfitMode) {
      query = query.eq('outfit_mode', outfitMode);
    }

    if (Number.isInteger(from) && Number.isInteger(to)) {
      query = query.range(Number(from), Number(to));
    }

    return query;
  };

  let response: any = await runQuery(SAVED_OUTFIT_SELECT_V3);
  if (response.error && isMissingSchemaError(response.error)) {
    response = await runQuery(SAVED_OUTFIT_SELECT_V2);
  }
  if (response.error && isMissingSchemaError(response.error)) {
    response = await runQuery(SAVED_OUTFIT_SELECT_V1);
  }

  if (response.error) {
    throw response.error;
  }

  return (response.data || []).map((row: any) => ({
    ...row,
    canvas_id: row?.canvas_id ?? null,
    source_kind: row?.source_kind ?? null,
    travel_collection_id: row?.travel_collection_id ?? null,
    activity_label: normalizeText(row?.activity_label, 120),
    day_label: normalizeText(row?.day_label, 120),
    sort_order:
      row?.sort_order === null || row?.sort_order === undefined || row?.sort_order === ''
        ? null
        : Number(row.sort_order),
    outfit_mode:
      normalizeText(row?.outfit_mode, 24) || (row?.travel_collection_id ? 'travel' : 'regular'),
  }));
}

async function fetchRelationalSavedOutfitItems(outfitIds: string[]) {
  if (!outfitIds.length) return [] as any[];

  const { data, error } = await supabase
    .from('saved_outfit_items')
    .select(SAVED_OUTFIT_ITEM_SELECT)
    .in('saved_outfit_id', outfitIds)
    .order('position', { ascending: true });

  if (error) {
    if (isMissingSchemaError(error, 'saved_outfit_items')) return [] as any[];
    throw error;
  }

  return data || [];
}

function buildSavedItemMatchKey(item: any, fallbackIndex = 0) {
  const sourceType = normalizeText(item?.source_type, 40) || 'unknown';
  const sourceId =
    normalizeText(item?.source_item_id, 120) ||
    normalizeText(item?.external_item_id, 120) ||
    normalizeText(item?.id, 120) ||
    `index-${fallbackIndex}`;
  return `${sourceType}:${sourceId}`;
}

function mergeSavedItemSnapshots(snapshotItems: any[], relationalItems: any[]) {
  const snapshots = Array.isArray(snapshotItems) ? snapshotItems : [];
  const relationals = Array.isArray(relationalItems) ? relationalItems : [];

  if (!snapshots.length) return relationals;
  if (!relationals.length) return snapshots;

  const relationalByKey = new Map(
    relationals.map((item, index) => [buildSavedItemMatchKey(item, index), item]),
  );
  const usedKeys = new Set<string>();

  const merged = snapshots.map((snapshot, index) => {
    const key = buildSavedItemMatchKey(snapshot, index);
    const relational = relationalByKey.get(key);

    if (!relational) return snapshot;

    usedKeys.add(key);

    return {
      ...relational,
      ...snapshot,
      source_type: snapshot?.source_type || relational?.source_type,
      source_item_id: snapshot?.source_item_id || relational?.source_item_id || null,
      image_url: snapshot?.image_url || relational?.image_url || null,
      image_path: snapshot?.image_path || relational?.image_path || null,
      cutout_url: snapshot?.cutout_url || relational?.cutout_url || null,
      title: snapshot?.title || relational?.title || null,
      brand: snapshot?.brand || relational?.brand || null,
      retailer: snapshot?.retailer || relational?.retailer || null,
      product_url: snapshot?.product_url || relational?.product_url || null,
      price: snapshot?.price ?? relational?.price ?? null,
      category: snapshot?.category || relational?.category || null,
      color: snapshot?.color || relational?.color || null,
      reason: snapshot?.reason ?? relational?.reason ?? null,
      locked: Boolean(snapshot?.locked),
      outfit_role: snapshot?.outfit_role || null,
      layout: snapshot?.layout || null,
    };
  });

  relationals.forEach((relational, index) => {
    const key = buildSavedItemMatchKey(relational, index);
    if (!usedKeys.has(key)) {
      merged.push(relational);
    }
  });

  return merged;
}

export async function hydrateOutfitWardrobeItems(userId: string, outfits: any[]) {
  if (!outfits.length) return [];

  const relationalItems = await fetchRelationalSavedOutfitItems(outfits.map((outfit) => outfit.id));
  const relationalByOutfitId = new Map<string, any[]>();

  relationalItems.forEach((item) => {
    const outfitId = String(item?.saved_outfit_id || '').trim();
    if (!outfitId) return;
    const current = relationalByOutfitId.get(outfitId) || [];
    current.push(item);
    relationalByOutfitId.set(outfitId, current);
  });

  const savedItemsByOutfitId = new Map<string, any[]>();

  outfits.forEach((outfit) => {
    const snapshotItems = Array.isArray(outfit.items) ? outfit.items : [];
    const relationalItems = relationalByOutfitId.get(outfit.id) || [];
    savedItemsByOutfitId.set(
      String(outfit?.id || ''),
      mergeSavedItemSnapshots(snapshotItems, relationalItems),
    );
  });

  const allSavedItems = outfits.flatMap((outfit) => savedItemsByOutfitId.get(String(outfit?.id || '')) || []);

  const wardrobeIds = extractSavedOutfitItemIds(allSavedItems);
  const externalIds = extractSavedOutfitExternalIds(allSavedItems);

  let wardrobeResponse: any = { data: [], error: null };
  if (wardrobeIds.length) {
    wardrobeResponse = await supabase
      .from('wardrobe')
      .select(WARDROBE_SELECT_V4)
      .eq('user_id', userId)
      .in('id', wardrobeIds);

    if (
      wardrobeResponse.error &&
      (
        isMissingSchemaError(wardrobeResponse.error, 'thumbnail_url') ||
        isMissingSchemaError(wardrobeResponse.error, 'display_image_url') ||
        isMissingSchemaError(wardrobeResponse.error, 'cutout_thumbnail_url') ||
        isMissingSchemaError(wardrobeResponse.error, 'cutout_display_url')
      )
    ) {
      wardrobeResponse = await supabase
        .from('wardrobe')
        .select(WARDROBE_SELECT_V3)
        .eq('user_id', userId)
        .in('id', wardrobeIds);
    }

    if (wardrobeResponse.error && isMissingSchemaError(wardrobeResponse.error, 'cutout_image_url')) {
      wardrobeResponse = await supabase
        .from('wardrobe')
        .select(WARDROBE_SELECT_V2)
        .eq('user_id', userId)
        .in('id', wardrobeIds);
    }

    if (wardrobeResponse.error && isMissingSchemaError(wardrobeResponse.error, 'subcategory')) {
      wardrobeResponse = await supabase
        .from('wardrobe')
        .select(WARDROBE_SELECT_V1)
        .eq('user_id', userId)
        .in('id', wardrobeIds);
    }
  }

  if (wardrobeResponse.error) {
    throw wardrobeResponse.error;
  }

  const externalItems = externalIds.length ? await loadExternalItemsByIds(externalIds).catch(() => []) : [];

  return outfits.map((outfit) => {
    const savedItems = savedItemsByOutfitId.get(String(outfit?.id || '')) || [];

    const resolvedItems = hydrateSavedOutfitItems(savedItems, wardrobeResponse.data || [], externalItems || []);
    const hasExternalItems = resolvedItems.some((item) => item?.source_type === 'external');
    const sourceKind = normalizeText(outfit?.source_kind, 40) || (outfit?.canvas_id ? 'canvas' : 'generated');

    return {
      ...outfit,
      canvas_id: outfit?.canvas_id ?? null,
      source_kind: sourceKind,
      travel_collection_id: outfit?.travel_collection_id ?? null,
      activity_label: normalizeText(outfit?.activity_label, 120),
      day_label: normalizeText(outfit?.day_label, 120),
      sort_order:
        outfit?.sort_order === null || outfit?.sort_order === undefined || outfit?.sort_order === ''
          ? null
          : Number(outfit.sort_order),
      outfit_mode:
        normalizeText(outfit?.outfit_mode, 24) || (outfit?.travel_collection_id ? 'travel' : 'regular'),
      resolvedItems,
      wardrobeItems: resolvedItems,
      has_external_items: hasExternalItems,
    };
  });
}

export async function fetchSavedOutfits(args: {
  userId?: string | null;
  from?: number;
  to?: number;
  outfitIds?: string[];
  travelCollectionId?: string | null;
  travelCollectionIds?: string[];
  favoritesOnly?: boolean;
  outfitMode?: string | null;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const outfits = await fetchSavedOutfitRows({
    userId,
    from: args.from,
    to: args.to,
    outfitIds: args.outfitIds,
    travelCollectionId: args.travelCollectionId,
    travelCollectionIds: args.travelCollectionIds,
    favoritesOnly: args.favoritesOnly,
    outfitMode: args.outfitMode,
  });

  return hydrateOutfitWardrobeItems(userId, outfits);
}

export async function fetchSavedOutfitsByIds(args: {
  userId?: string | null;
  outfitIds: string[];
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const outfitIds = Array.from(new Set((args.outfitIds || []).map((value) => String(value || '').trim()).filter(Boolean)));
  if (!outfitIds.length) return [];

  const outfits = await fetchSavedOutfitRows({
    userId,
    outfitIds,
  });

  const hydrated = await hydrateOutfitWardrobeItems(userId, outfits);
  const orderById = new Map(outfitIds.map((id, index) => [id, index]));
  return hydrated.sort(
    (left, right) =>
      (orderById.get(String(left?.id || '')) ?? 999) - (orderById.get(String(right?.id || '')) ?? 999),
  );
}

export async function fetchAllSavedOutfits(userIdArg?: string | null) {
  return fetchSavedOutfits({
    userId: userIdArg,
  });
}

export async function fetchSavedOutfitsPage(args: {
  userId?: string | null;
  from: number;
  to: number;
}) {
  return fetchSavedOutfits({
    userId: args.userId,
    from: args.from,
    to: args.to,
  });
}

export async function loadSavedOutfitItemsForDetail(args: {
  outfit: any;
  userId?: string | null;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const rows = await fetchSavedOutfitRows({
    userId,
    outfitIds: [String(args.outfit?.id || '')],
  });

  const hydrated = await hydrateOutfitWardrobeItems(userId, rows.length ? rows : [args.outfit]);
  return hydrated[0] || { ...args.outfit, resolvedItems: hydrateSavedOutfitItems(args.outfit?.items || [], [], []) };
}

async function resolveNextTravelSortOrder(userId: string, travelCollectionId: string) {
  const { data, error } = await supabase
    .from('saved_outfits')
    .select('sort_order')
    .eq('user_id', userId)
    .eq('travel_collection_id', travelCollectionId);

  if (error) {
    if (isMissingSchemaError(error, 'sort_order')) return null;
    throw error;
  }

  const maxSortOrder = (data || []).reduce((highest: number, row: any) => {
    const nextValue = Number(row?.sort_order);
    return Number.isFinite(nextValue) ? Math.max(highest, nextValue) : highest;
  }, 0);

  return maxSortOrder + 1;
}

export async function saveMixedOutfit(args: {
  userId?: string | null;
  name: string;
  context?: string | null;
  season?: string | null;
  items: SavedOutfitItem[];
  isFavorite?: boolean;
  canvasId?: string | null;
  sourceKind?: string | null;
  lockedItemId?: string | null;
  travelCollectionId?: string | null;
  activityLabel?: string | null;
  dayLabel?: string | null;
  sortOrder?: number | null;
  outfitMode?: 'regular' | 'travel' | string | null;
  sourceFitCheckPostId?: string | null;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const normalizedItems = (args.items || []).map((item) => buildSavedOutfitItemSnapshot(item, item?.reason));
  const itemsWithExternalRefs = await ensureExternalSavedOutfitRefs(normalizedItems).catch(() => normalizedItems);
  const legacyItems = itemsWithExternalRefs.map((item) => buildSavedOutfitItemSnapshot(item, item.reason));

  const normalizedTravelCollectionId = normalizeText(args.travelCollectionId, 80);
  const requestedMode =
    normalizeText(args.outfitMode, 24) === 'travel' || normalizedTravelCollectionId ? 'travel' : 'regular';

  if (requestedMode === 'travel' && !normalizedTravelCollectionId) {
    throw new Error('Choose a trip before saving this travel outfit.');
  }

  const saveAccess = await canUseFeature(userId, 'saved_outfit');
  if (!saveAccess.allowed) {
    throw new SubscriptionLimitError('saved_outfit', saveAccess, saveAccess.reason);
  }

  if (requestedMode === 'travel') {
    const organizationAccess = await canUseFeature(userId, 'premium_organization');
    if (!organizationAccess.allowed) {
      throw new SubscriptionLimitError('premium_organization', organizationAccess, organizationAccess.reason);
    }
  }

  const resolvedSortOrder =
    requestedMode === 'travel'
      ? Number.isFinite(Number(args.sortOrder))
        ? Number(args.sortOrder)
        : await resolveNextTravelSortOrder(userId, normalizedTravelCollectionId!)
      : null;

  const basePayload: Record<string, any> = {
    user_id: userId,
    name: String(args.name || 'Untitled Fit').trim() || 'Untitled Fit',
    context: args.context || null,
    season: args.season || null,
    is_favorite: Boolean(args.isFavorite),
    items: legacyItems,
    travel_collection_id: requestedMode === 'travel' ? normalizedTravelCollectionId : null,
    activity_label: requestedMode === 'travel' ? normalizeText(args.activityLabel, 120) : null,
    day_label: requestedMode === 'travel' ? normalizeText(args.dayLabel, 120) : null,
    sort_order: requestedMode === 'travel' ? resolvedSortOrder : null,
    outfit_mode: requestedMode,
    source_fit_check_post_id: normalizeText(args.sourceFitCheckPostId, 80),
  };

  if (args.lockedItemId) {
    basePayload.locked_item_id = args.lockedItemId;
  }

  let response: any = await supabase
    .from('saved_outfits')
    .insert([
      {
        ...basePayload,
        canvas_id: args.canvasId || null,
        source_kind: normalizeText(args.sourceKind, 32) || (args.canvasId ? 'canvas' : 'generated'),
      },
    ])
    .select(SAVED_OUTFIT_SELECT_V3)
    .single();

  if (response.error && isMissingSchemaError(response.error) && requestedMode !== 'travel') {
    const legacyPayload = {
      user_id: userId,
      name: basePayload.name,
      context: basePayload.context,
      season: basePayload.season,
      is_favorite: basePayload.is_favorite,
      items: basePayload.items,
      locked_item_id: basePayload.locked_item_id,
      canvas_id: args.canvasId || null,
      source_kind: normalizeText(args.sourceKind, 32) || (args.canvasId ? 'canvas' : 'generated'),
    };

    response = await supabase
      .from('saved_outfits')
      .insert([legacyPayload])
      .select(SAVED_OUTFIT_SELECT_V2)
      .single();
  }

  if (response.error && isMissingSchemaError(response.error) && requestedMode !== 'travel') {
    const legacyPayload = {
      user_id: userId,
      name: basePayload.name,
      context: basePayload.context,
      season: basePayload.season,
      is_favorite: basePayload.is_favorite,
      items: basePayload.items,
    };

    response = await supabase
      .from('saved_outfits')
      .insert([legacyPayload])
      .select(SAVED_OUTFIT_SELECT_V1)
      .single();
  }

  if (response.error || !response.data?.id) {
    throw new Error(response.error?.message || 'Could not save this outfit.');
  }

  const savedOutfitId = String(response.data.id);
  const relationalPayload = legacyItems.map((item, index) => ({
    saved_outfit_id: savedOutfitId,
    source_type: item.source_type,
    source_item_id: item.source_item_id || null,
    image_url: item.image_url,
    image_path: item.image_path ?? null,
    cutout_url: item.cutout_url ?? null,
    title: item.title || item.name || null,
    brand: item.brand ?? null,
    retailer: item.retailer ?? null,
    product_url: item.product_url ?? null,
    price: item.price ?? null,
    category: item.category || item.main_category || item.type || null,
    color: item.color || item.primary_color || null,
    reason: item.reason || null,
    position: index + 1,
  }));

  if (relationalPayload.length) {
    const insertItemsResponse = await supabase.from('saved_outfit_items').insert(relationalPayload);
    if (insertItemsResponse.error && !isMissingSchemaError(insertItemsResponse.error, 'saved_outfit_items')) {
      throw new Error(insertItemsResponse.error.message);
    }
  }

  const hydrated = await hydrateOutfitWardrobeItems(userId, [
    {
      ...response.data,
      items: legacyItems,
      canvas_id: response.data?.canvas_id ?? args.canvasId ?? null,
      source_kind: response.data?.source_kind ?? args.sourceKind ?? null,
      travel_collection_id: response.data?.travel_collection_id ?? basePayload.travel_collection_id ?? null,
      activity_label: response.data?.activity_label ?? basePayload.activity_label ?? null,
      day_label: response.data?.day_label ?? basePayload.day_label ?? null,
      sort_order: response.data?.sort_order ?? basePayload.sort_order ?? null,
      outfit_mode: response.data?.outfit_mode ?? basePayload.outfit_mode ?? requestedMode,
    },
  ]);

  return hydrated[0] || response.data;
}
