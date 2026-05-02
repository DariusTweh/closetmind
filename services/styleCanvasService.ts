import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { resolveItemImage } from '../lib/itemImage';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { supabase } from '../lib/supabase';
import type { CanvasItem, SavedStyleCanvas, WardrobeCanvasSourceItem } from '../types/styleCanvas';
import { ensureExternalCanvasItemRefs } from './externalItemsService';
import { saveMixedOutfit } from './savedOutfitService';
import { canvasItemsToSavedOutfitItems, deserializeStyleCanvas, getCanvasItemDisplayUri, serializeCanvasItemsForSave } from '../utils/styleCanvasAdapters';

const STYLE_CANVAS_SELECT_V2 =
  'id, user_id, title, origin, preview_image_url, background_color, metadata, created_at, updated_at';
const STYLE_CANVAS_SELECT_V1 = 'id, user_id, title, origin, background_color, metadata, created_at, updated_at';
const STYLE_CANVAS_ITEM_SELECT_V2 =
  'id, canvas_id, source_type, source_item_id, image_url, image_path, thumbnail_url, display_image_url, original_image_url, cutout_image_url, cutout_thumbnail_url, cutout_display_url, cutout_url, title, brand, retailer, product_url, price, category, subcategory, color, x, y, scale, rotation, z_index, locked';
const STYLE_CANVAS_ITEM_SELECT_V1 =
  'id, canvas_id, source_type, source_item_id, image_url, image_path, cutout_url, title, brand, retailer, product_url, price, category, color, x, y, scale, rotation, z_index, locked';
const WARDROBE_CANVAS_SELECT =
  'id, name, source_title, brand, retailer, product_url, price, type, main_category, subcategory, primary_color, image_url, image_path, thumbnail_url, display_image_url, original_image_url, cutout_image_url, cutout_thumbnail_url, cutout_display_url';
const WARDROBE_CANVAS_FALLBACK_SELECT = 'id, name, type, main_category, image_url, image_path';
const STYLE_CANVAS_PREVIEW_BUCKET = 'fit-check-posts';
const OPTIONAL_STYLE_CANVAS_ITEM_FIELDS = [
  'thumbnail_url',
  'display_image_url',
  'original_image_url',
  'cutout_image_url',
  'cutout_thumbnail_url',
  'cutout_display_url',
  'subcategory',
] as const;

function getStyleCanvasPreviewPathFromMetadata(metadata: any) {
  const previewPath = String(metadata?.preview_image_path || '').trim();
  return previewPath || null;
}

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

function extractMissingStyleCanvasItemColumn(message: string) {
  const rawMessage = String(message || '');
  const patterns = [
    /column ["']?style_canvas_items\.([^"'\s]+)["']?/i,
    /column ["']?([^"'\s]+)["']? of relation ["']?style_canvas_items["']?/i,
    /Could not find the ['"]([^'"]+)['"] column of ['"]style_canvas_items['"]/i,
  ];

  for (const pattern of patterns) {
    const match = rawMessage.match(pattern);
    if (match?.[1]) {
      return String(match[1]).trim();
    }
  }

  return null;
}

async function loadStyleCanvasItems(canvasId: string) {
  let itemsResponse: any = await supabase
    .from('style_canvas_items')
    .select(STYLE_CANVAS_ITEM_SELECT_V2)
    .eq('canvas_id', canvasId)
    .order('z_index', { ascending: true });

  if (itemsResponse.error && isMissingSchemaError(itemsResponse.error)) {
    itemsResponse = await supabase
      .from('style_canvas_items')
      .select(STYLE_CANVAS_ITEM_SELECT_V1)
      .eq('canvas_id', canvasId)
      .order('z_index', { ascending: true });
  }

  if (itemsResponse.error) {
    throw new Error(itemsResponse.error.message);
  }

  return itemsResponse.data || [];
}

async function insertStyleCanvasItemsWithSchemaFallback(payload: Record<string, any>[]) {
  if (!payload.length) return;

  const nextPayload = payload.map((item) => ({ ...item }));

  while (nextPayload.length) {
    const { error } = await supabase.from('style_canvas_items').insert(nextPayload);
    if (!error) return;

    const missingColumn = extractMissingStyleCanvasItemColumn(error.message);
    if (
      !missingColumn ||
      !(OPTIONAL_STYLE_CANVAS_ITEM_FIELDS as readonly string[]).includes(missingColumn)
    ) {
      throw new Error(error.message);
    }

    nextPayload.forEach((item) => {
      delete item[missingColumn];
    });
  }
}

async function resolveWardrobeDisplayImage(item: WardrobeCanvasSourceItem) {
  const resolvedImage = await resolveItemImage(item, {
    bucket: 'clothes',
    preferBackendSigner: true,
  }).catch(() => ({
    uri: item.cutout_url || item.cutout_image_url || item.image_url || null,
    isCutout: Boolean(item.cutout_url || item.cutout_image_url),
  }));

  return {
    uri: resolvedImage?.uri || item.cutout_url || item.cutout_image_url || item.image_url || null,
    isCutout: Boolean(resolvedImage?.isCutout),
  };
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
    wardrobeItems.map(async (item) => {
      const resolvedImage = await resolveWardrobeDisplayImage(item);
      return {
        ...item,
        cutout_url: resolvedImage.isCutout ? resolvedImage.uri : item.cutout_url || null,
        image_url: resolvedImage.uri || item.image_url || null,
      };
    }),
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

  const items = await loadStyleCanvasItems(canvasId);

  const resolvedPreviewUrl = await resolveStyleCanvasPreviewUrl(canvasResponse.data).catch(
    () => String(canvasResponse.data?.preview_image_url || '').trim() || null,
  );

  return deserializeStyleCanvas(
    {
      ...canvasResponse.data,
      preview_image_url: resolvedPreviewUrl,
    },
    items || [],
  );
}

export async function saveStyleCanvas(args: {
  canvasId?: string | null;
  title?: string | null;
  origin?: string | null;
  previewImageUrl?: string | null;
  previewImagePath?: string | null;
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
  const previewImagePath = String(args.previewImagePath || '').trim() || null;
  const metadata = {
    ...(args.metadata || {}),
    preview_image_path: previewImagePath,
  };

  let canvasId = String(args.canvasId || '').trim() || null;

  if (canvasId) {
    let updateResponse: any = await supabase
      .from('style_canvases')
      .update({
        title: normalizedTitle,
        origin: args.origin || 'manual',
        preview_image_url: previewImageUrl,
        background_color: args.backgroundColor || '#f7f1e7',
        metadata,
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
          metadata,
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
          metadata,
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
            metadata,
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
    await insertStyleCanvasItemsWithSchemaFallback(payload);
  }

  return loadStyleCanvas(canvasId);
}

export async function uploadStyleCanvasPreviewImage(args: {
  uri: string;
  canvasId?: string | null;
}) {
  const userId = await getAuthenticatedUserId();
  const normalizedUri = String(args.uri || '').trim();
  if (!normalizedUri) {
    throw new Error('Missing style canvas preview image.');
  }

  let uploadUri = normalizedUri;
  try {
    const normalized = await ImageManipulator.manipulateAsync(uploadUri, [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    uploadUri = String(normalized?.uri || '').trim() || uploadUri;
  } catch (error) {
    console.warn('Style canvas preview normalization skipped:', error);
  }

  const path = [
    userId,
    'canvas-previews',
    `${String(args.canvasId || 'draft').trim() || 'draft'}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.jpg`,
  ].join('/');

  const fileData = await FileSystem.readAsStringAsync(uploadUri, {
    encoding: 'base64' as any,
  });

  const { error } = await supabase.storage.from(STYLE_CANVAS_PREVIEW_BUCKET).upload(path, decode(fileData), {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const url = await resolvePrivateMediaUrl({
    path,
    bucket: STYLE_CANVAS_PREVIEW_BUCKET,
  }).catch(() => null);

  return {
    path,
    url: url || null,
  };
}

export async function resolveStyleCanvasPreviewUrl(canvas: {
  preview_image_url?: string | null;
  metadata?: Record<string, any> | null;
}) {
  const previewPath = getStyleCanvasPreviewPathFromMetadata(canvas?.metadata);
  const legacyUrl = String(canvas?.preview_image_url || '').trim() || null;

  if (!previewPath && !legacyUrl) return null;

  return resolvePrivateMediaUrl({
    path: previewPath,
    legacyUrl,
    bucket: STYLE_CANVAS_PREVIEW_BUCKET,
  }).catch(() => legacyUrl);
}

export async function persistStyleCanvasPreviewReference(args: {
  canvasId: string;
  previewImageUrl?: string | null;
  previewImagePath?: string | null;
}) {
  const userId = await getAuthenticatedUserId();
  const canvasId = String(args.canvasId || '').trim();
  if (!canvasId) {
    throw new Error('Missing style canvas id.');
  }

  const previewImageUrl = String(args.previewImageUrl || '').trim() || null;
  const previewImagePath = String(args.previewImagePath || '').trim() || null;

  const { data: existingCanvas, error: existingCanvasError } = await supabase
    .from('style_canvases')
    .select(STYLE_CANVAS_SELECT_V2)
    .eq('id', canvasId)
    .eq('user_id', userId)
    .single();

  let normalizedExistingCanvas: any = existingCanvas;
  if (existingCanvasError && isMissingSchemaError(existingCanvasError)) {
    const legacyCanvasResponse = await supabase
      .from('style_canvases')
      .select(STYLE_CANVAS_SELECT_V1)
      .eq('id', canvasId)
      .eq('user_id', userId)
      .single();

    if (legacyCanvasResponse.error) {
      throw new Error(legacyCanvasResponse.error.message);
    }

    normalizedExistingCanvas = legacyCanvasResponse.data;
  } else if (existingCanvasError) {
    throw new Error(existingCanvasError.message);
  }

  const metadata = {
    ...((normalizedExistingCanvas?.metadata && typeof normalizedExistingCanvas.metadata === 'object')
      ? normalizedExistingCanvas.metadata
      : {}),
    preview_image_path: previewImagePath,
  };

  let updateResponse: any = await supabase
    .from('style_canvases')
    .update({
      preview_image_url: previewImageUrl,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', canvasId)
    .eq('user_id', userId);

  if (updateResponse.error && isMissingSchemaError(updateResponse.error, 'preview_image_url')) {
    updateResponse = await supabase
      .from('style_canvases')
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', canvasId)
      .eq('user_id', userId);
  }

  if (updateResponse.error) {
    throw new Error(updateResponse.error.message);
  }

  return {
    previewImageUrl,
    previewImagePath,
  };
}

export async function saveCanvasAsOutfit(args: {
  canvasId?: string | null;
  title?: string | null;
  context?: string | null;
  season?: string | null;
  items: CanvasItem[];
  travelCollectionId?: string | null;
  activityLabel?: string | null;
  dayLabel?: string | null;
  sortOrder?: number | null;
  outfitMode?: 'regular' | 'travel' | string | null;
}) {
  const savedOutfit = await saveMixedOutfit({
    name: String(args.title || 'Canvas Look').trim() || 'Canvas Look',
    context: args.context || null,
    season: args.season || null,
    items: canvasItemsToSavedOutfitItems(args.items || []),
    canvasId: args.canvasId || null,
    sourceKind: 'canvas',
    travelCollectionId: args.travelCollectionId || null,
    activityLabel: args.activityLabel || null,
    dayLabel: args.dayLabel || null,
    sortOrder: args.sortOrder ?? null,
    outfitMode: args.outfitMode || null,
  });

  return savedOutfit;
}
