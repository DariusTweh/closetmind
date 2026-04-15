import { buildSavedOutfitItemSnapshot, extractSavedOutfitExternalIds, extractSavedOutfitItemIds, hydrateSavedOutfitItems } from '../lib/savedOutfitItems';
import { supabase } from '../lib/supabase';
import type { SavedOutfitItem } from '../types/styleCanvas';
import { ensureExternalSavedOutfitRefs, loadExternalItemsByIds } from './externalItemsService';

const SAVED_OUTFIT_SELECT_V2 = 'id, user_id, name, context, season, is_favorite, created_at, items, canvas_id, source_kind';
const SAVED_OUTFIT_SELECT_V1 = 'id, user_id, name, context, season, is_favorite, created_at, items';
const SAVED_OUTFIT_ITEM_SELECT =
  'id, saved_outfit_id, source_type, source_item_id, image_url, image_path, cutout_url, title, brand, retailer, product_url, price, category, color, reason, position';
const WARDROBE_SELECT =
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

async function fetchSavedOutfitRows(args: {
  userId: string;
  from?: number;
  to?: number;
  outfitIds?: string[];
}) {
  const { userId, from, to, outfitIds } = args;

  const runQuery = async (selectFields: string) => {
    let query = supabase
      .from('saved_outfits')
      .select(selectFields)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (outfitIds?.length) {
      query = query.in('id', outfitIds);
    }

    if (Number.isInteger(from) && Number.isInteger(to)) {
      query = query.range(Number(from), Number(to));
    }

    return query;
  };

  let response: any = await runQuery(SAVED_OUTFIT_SELECT_V2);
  if (response.error) {
    response = await runQuery(SAVED_OUTFIT_SELECT_V1);
  }

  if (response.error) {
    throw response.error;
  }

  return (response.data || []).map((row: any) => ({
    ...row,
    canvas_id: row?.canvas_id ?? null,
    source_kind: row?.source_kind ?? null,
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

async function hydrateOutfits(userId: string, outfits: any[]) {
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

  const allSavedItems = outfits.flatMap((outfit) => {
    const relational = relationalByOutfitId.get(outfit.id);
    return relational?.length ? relational : Array.isArray(outfit.items) ? outfit.items : [];
  });

  const wardrobeIds = extractSavedOutfitItemIds(allSavedItems);
  const externalIds = extractSavedOutfitExternalIds(allSavedItems);

  const { data: wardrobeItems, error: wardrobeError } = wardrobeIds.length
    ? await supabase
        .from('wardrobe')
        .select(WARDROBE_SELECT)
        .eq('user_id', userId)
        .in('id', wardrobeIds)
    : { data: [], error: null };

  if (wardrobeError) {
    throw wardrobeError;
  }

  const externalItems = externalIds.length ? await loadExternalItemsByIds(externalIds).catch(() => []) : [];

  return outfits.map((outfit) => {
    const savedItems = relationalByOutfitId.get(outfit.id)?.length
      ? relationalByOutfitId.get(outfit.id)
      : Array.isArray(outfit.items)
        ? outfit.items
        : [];

    const resolvedItems = hydrateSavedOutfitItems(savedItems, wardrobeItems || [], externalItems || []);
    const hasExternalItems = resolvedItems.some((item) => item?.source_type === 'external');
    const sourceKind = normalizeText(outfit?.source_kind, 40) || (outfit?.canvas_id ? 'canvas' : 'generated');

    return {
      ...outfit,
      canvas_id: outfit?.canvas_id ?? null,
      source_kind: sourceKind,
      resolvedItems,
      wardrobeItems: resolvedItems,
      has_external_items: hasExternalItems,
    };
  });
}

export async function fetchSavedOutfitsPage(args: {
  userId?: string | null;
  from: number;
  to: number;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const outfits = await fetchSavedOutfitRows({
    userId,
    from: args.from,
    to: args.to,
  });

  return hydrateOutfits(userId, outfits);
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

  const hydrated = await hydrateOutfits(userId, rows.length ? rows : [args.outfit]);
  return hydrated[0] || { ...args.outfit, resolvedItems: hydrateSavedOutfitItems(args.outfit?.items || [], [], []) };
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
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const normalizedItems = (args.items || []).map((item) => buildSavedOutfitItemSnapshot(item, item?.reason));
  const itemsWithExternalRefs = await ensureExternalSavedOutfitRefs(normalizedItems).catch(() => normalizedItems);
  const legacyItems = itemsWithExternalRefs.map((item) => buildSavedOutfitItemSnapshot(item, item.reason));

  const basePayload: Record<string, any> = {
    user_id: userId,
    name: String(args.name || 'Untitled Fit').trim() || 'Untitled Fit',
    context: args.context || null,
    season: args.season || null,
    is_favorite: Boolean(args.isFavorite),
    items: legacyItems,
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
    .select(SAVED_OUTFIT_SELECT_V2)
    .single();

  if (response.error && isMissingSchemaError(response.error)) {
    response = await supabase
      .from('saved_outfits')
      .insert([basePayload])
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

  const hydrated = await hydrateOutfits(userId, [
    {
      ...response.data,
      items: legacyItems,
      canvas_id: response.data?.canvas_id ?? args.canvasId ?? null,
      source_kind: response.data?.source_kind ?? args.sourceKind ?? null,
    },
  ]);

  return hydrated[0] || response.data;
}
