import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { supabase } from '../lib/supabase';
import type { CanvasItem, SavedStyleCanvas, WardrobeCanvasSourceItem } from '../types/styleCanvas';
import { ensureExternalCanvasItemRefs } from './externalItemsService';
import { saveMixedOutfit } from './savedOutfitService';
import { canvasItemsToSavedOutfitItems, deserializeStyleCanvas, getCanvasItemDisplayUri, serializeCanvasItemsForSave } from '../utils/styleCanvasAdapters';

const STYLE_CANVAS_SELECT_V2 =
  'id, user_id, title, origin, preview_image_url, background_color, metadata, created_at, updated_at';
const STYLE_CANVAS_SELECT_V1 = 'id, user_id, title, origin, background_color, metadata, created_at, updated_at';
const STYLE_CANVAS_ITEM_SELECT =
  'id, canvas_id, source_type, source_item_id, image_url, image_path, cutout_url, title, brand, retailer, product_url, price, category, color, x, y, scale, rotation, z_index, locked';
const WARDROBE_CANVAS_SELECT =
  'id, name, source_title, brand, retailer, product_url, price, type, main_category, primary_color, image_url, image_path';
const WARDROBE_CANVAS_FALLBACK_SELECT = 'id, name, type, main_category, image_url, image_path';

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You must be logged in to use Style Canvas.');
  }

  return user.id;
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

async function resolveWardrobeImageUrl(item: WardrobeCanvasSourceItem) {
  const resolvedUrl = await resolvePrivateMediaUrl({
    path: item.image_path,
    legacyUrl: item.image_url,
    bucket: 'clothes',
    preferBackendSigner: true,
  }).catch(() => item.image_url || null);

  return resolvedUrl || item.image_url || null;
}

export async function fetchClosetCanvasItems(): Promise<WardrobeCanvasSourceItem[]> {
  const userId = await getAuthenticatedUserId();

  let response: any = await supabase
    .from('wardrobe')
    .select(WARDROBE_CANVAS_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (response.error) {
    response = await supabase
      .from('wardrobe')
      .select(WARDROBE_CANVAS_FALLBACK_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
  }

  if (response.error) {
    throw new Error(response.error.message);
  }

  const wardrobeItems = (response.data || []) as WardrobeCanvasSourceItem[];
  const resolved = await Promise.all(
    wardrobeItems.map(async (item) => ({
      ...item,
      image_url: await resolveWardrobeImageUrl(item),
    })),
  );

  return resolved.filter((item) => item.image_url);
}

export async function loadStyleCanvas(canvasId: string): Promise<SavedStyleCanvas> {
  const userId = await getAuthenticatedUserId();

  let canvasResponse: any = await supabase
    .from('style_canvases')
    .select(STYLE_CANVAS_SELECT_V2)
    .eq('id', canvasId)
    .eq('user_id', userId)
    .single();

  if (canvasResponse.error && isMissingSchemaError(canvasResponse.error)) {
    canvasResponse = await supabase
      .from('style_canvases')
      .select(STYLE_CANVAS_SELECT_V1)
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();
  }

  if (canvasResponse.error) {
    throw new Error(canvasResponse.error.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from('style_canvas_items')
    .select(STYLE_CANVAS_ITEM_SELECT)
    .eq('canvas_id', canvasId)
    .order('z_index', { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return deserializeStyleCanvas(canvasResponse.data, items || []);
}

export async function saveStyleCanvas(args: {
  canvasId?: string | null;
  title?: string | null;
  origin?: string | null;
  previewImageUrl?: string | null;
  backgroundColor?: string | null;
  metadata?: Record<string, any> | null;
  items: CanvasItem[];
}) {
  const userId = await getAuthenticatedUserId();
  const nowIso = new Date().toISOString();
  const normalizedTitle = String(args.title || '').trim() || 'Style Canvas';
  const normalizedItems = await ensureExternalCanvasItemRefs(args.items || []).catch(() => args.items || []);
  const previewImageUrl =
    String(args.previewImageUrl || '').trim() ||
    getCanvasItemDisplayUri((normalizedItems.find((item) => item?.image_url) || normalizedItems[0] || {}) as CanvasItem) ||
    null;

  let canvasId = String(args.canvasId || '').trim() || null;

  if (canvasId) {
    let updateResponse: any = await supabase
      .from('style_canvases')
      .update({
        title: normalizedTitle,
        origin: args.origin || 'manual',
        preview_image_url: previewImageUrl,
        background_color: args.backgroundColor || '#f7f1e7',
        metadata: args.metadata || {},
        updated_at: nowIso,
      })
      .eq('id', canvasId)
      .eq('user_id', userId);

    if (updateResponse.error && isMissingSchemaError(updateResponse.error, 'preview_image_url')) {
      updateResponse = await supabase
        .from('style_canvases')
        .update({
          title: normalizedTitle,
          origin: args.origin || 'manual',
          background_color: args.backgroundColor || '#f7f1e7',
          metadata: args.metadata || {},
          updated_at: nowIso,
        })
        .eq('id', canvasId)
        .eq('user_id', userId);
    }

    if (updateResponse.error) {
      throw new Error(updateResponse.error.message);
    }
  } else {
    let createResponse: any = await supabase
      .from('style_canvases')
      .insert([
        {
          user_id: userId,
          title: normalizedTitle,
          origin: args.origin || 'manual',
          preview_image_url: previewImageUrl,
          background_color: args.backgroundColor || '#f7f1e7',
          metadata: args.metadata || {},
          updated_at: nowIso,
        },
      ])
      .select('id')
      .single();

    if (createResponse.error && isMissingSchemaError(createResponse.error, 'preview_image_url')) {
      createResponse = await supabase
        .from('style_canvases')
        .insert([
          {
            user_id: userId,
            title: normalizedTitle,
            origin: args.origin || 'manual',
            background_color: args.backgroundColor || '#f7f1e7',
            metadata: args.metadata || {},
            updated_at: nowIso,
          },
        ])
        .select('id')
        .single();
    }

    if (createResponse.error || !createResponse.data?.id) {
      throw new Error(createResponse.error?.message || 'Unable to create style canvas.');
    }

    canvasId = createResponse.data.id;
  }

  const { error: deleteItemsError } = await supabase.from('style_canvas_items').delete().eq('canvas_id', canvasId);
  if (deleteItemsError) {
    throw new Error(deleteItemsError.message);
  }

  const payload = serializeCanvasItemsForSave(normalizedItems).map((item) => ({
    ...item,
    canvas_id: canvasId,
  }));

  if (payload.length) {
    const { error: insertItemsError } = await supabase.from('style_canvas_items').insert(payload);
    if (insertItemsError) {
      throw new Error(insertItemsError.message);
    }
  }

  return loadStyleCanvas(canvasId);
}

export async function saveCanvasAsOutfit(args: {
  canvasId?: string | null;
  title?: string | null;
  context?: string | null;
  season?: string | null;
  items: CanvasItem[];
}) {
  const savedOutfit = await saveMixedOutfit({
    name: String(args.title || 'Canvas Look').trim() || 'Canvas Look',
    context: args.context || null,
    season: args.season || null,
    items: canvasItemsToSavedOutfitItems(args.items || []),
    canvasId: args.canvasId || null,
    sourceKind: 'canvas',
  });

  return savedOutfit;
}
