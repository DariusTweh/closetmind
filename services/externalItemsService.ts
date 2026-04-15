import { supabase } from '../lib/supabase';
import type { BrowserItem, CanvasItem, ExternalItemRecord, SavedOutfitItem } from '../types/styleCanvas';
import { normalizeSavedOutfitLikeItem } from '../utils/styleCanvasAdapters';

const EXTERNAL_ITEMS_SELECT =
  'id, user_id, image_url, image_path, cutout_url, title, brand, retailer, product_url, price, category, color, metadata, source_subtype, created_at, updated_at';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeText(value: any, maxLength = 240) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizePrice(value: any) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUuid(value: any) {
  return UUID_PATTERN.test(String(value || '').trim());
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
    throw new Error('You must be logged in to manage external items.');
  }

  return user.id;
}

function toExternalRecordPayload(item: Partial<BrowserItem & CanvasItem & SavedOutfitItem>) {
  const normalized = normalizeSavedOutfitLikeItem(item);

  return {
    image_url: String(normalized.image_url || '').trim(),
    image_path: normalizeText(normalized.image_path, 240),
    cutout_url: normalizeText(normalized.cutout_url, 500),
    title: normalizeText(normalized.title || normalized.name, 180),
    brand: normalizeText(normalized.brand, 80),
    retailer: normalizeText(normalized.retailer, 80),
    product_url: normalizeText(normalized.product_url, 500),
    price: normalizePrice(normalized.price),
    category: normalizeText(normalized.category || normalized.main_category || normalized.type, 60),
    color: normalizeText(normalized.color || normalized.primary_color, 40),
    metadata: {
      source_type: 'external',
      source_subtype: normalizeText(normalized.source_subtype, 40) || 'browser_import',
    },
    source_subtype: normalizeText(normalized.source_subtype, 40) || 'browser_import',
  };
}

async function loadExistingExternalItem(userId: string, item: Partial<BrowserItem & CanvasItem & SavedOutfitItem>) {
  const explicitId = normalizeText((item as any)?.source_item_id || item?.id, 120);
  if (explicitId && isUuid(explicitId)) {
    const { data, error } = await supabase
      .from('external_items')
      .select(EXTERNAL_ITEMS_SELECT)
      .eq('user_id', userId)
      .eq('id', explicitId)
      .maybeSingle();

    if (error) {
      if (isMissingSchemaError(error, 'external_items')) return null;
      throw error;
    }

    if (data) return data as ExternalItemRecord;
  }

  const productUrl = normalizeText((item as any)?.product_url, 500);
  const imageUrl = normalizeText((item as any)?.image_url, 500);

  if (!productUrl && !imageUrl) {
    return null;
  }

  let query = supabase.from('external_items').select(EXTERNAL_ITEMS_SELECT).eq('user_id', userId);

  if (productUrl) {
    query = query.eq('product_url', productUrl);
  }

  if (imageUrl) {
    query = query.eq('image_url', imageUrl);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    if (isMissingSchemaError(error, 'external_items')) return null;
    throw error;
  }

  return (data as ExternalItemRecord | null) || null;
}

export async function ensureExternalItemRecord(item: Partial<BrowserItem & CanvasItem & SavedOutfitItem>) {
  const userId = await getAuthenticatedUserId();
  const payload = toExternalRecordPayload(item);

  if (!payload.image_url) {
    return null;
  }

  const existing = await loadExistingExternalItem(userId, item);
  if (existing?.id) {
    return existing;
  }

  const { data, error } = await supabase
    .from('external_items')
    .insert([
      {
        user_id: userId,
        ...payload,
      },
    ])
    .select(EXTERNAL_ITEMS_SELECT)
    .single();

  if (error) {
    if (isMissingSchemaError(error, 'external_items')) return null;
    throw new Error(error.message);
  }

  return (data as ExternalItemRecord | null) || null;
}

export async function ensureExternalCanvasItemRefs(items: CanvasItem[]) {
  const resolved = await Promise.all(
    (items || []).map(async (item) => {
      if (item?.source_type !== 'external') return item;
      const externalRecord = await ensureExternalItemRecord(item).catch(() => null);
      if (!externalRecord?.id) return item;

      return {
        ...item,
        source_item_id: externalRecord.id,
        image_path: externalRecord.image_path || item.image_path || null,
        cutout_url: externalRecord.cutout_url || item.cutout_url || null,
      };
    }),
  );

  return resolved;
}

export async function ensureExternalSavedOutfitRefs(items: SavedOutfitItem[]) {
  const resolved = await Promise.all(
    (items || []).map(async (item) => {
      if (item?.source_type !== 'external') return item;
      const externalRecord = await ensureExternalItemRecord(item).catch(() => null);
      if (!externalRecord?.id) return item;

      return {
        ...item,
        id: externalRecord.id,
        source_item_id: externalRecord.id,
        external_item_id: externalRecord.id,
        image_path: externalRecord.image_path || item.image_path || null,
        cutout_url: externalRecord.cutout_url || item.cutout_url || null,
      };
    }),
  );

  return resolved;
}

export async function loadExternalItemsByIds(ids: string[]) {
  const userId = await getAuthenticatedUserId();
  const uniqueIds = Array.from(new Set((ids || []).filter((value) => isUuid(value))));
  if (!uniqueIds.length) return [] as ExternalItemRecord[];

  const { data, error } = await supabase
    .from('external_items')
    .select(EXTERNAL_ITEMS_SELECT)
    .eq('user_id', userId)
    .in('id', uniqueIds);

  if (error) {
    if (isMissingSchemaError(error, 'external_items')) return [] as ExternalItemRecord[];
    throw new Error(error.message);
  }

  return (data || []) as ExternalItemRecord[];
}

export async function fetchRecentExternalBrowserItems(limit = 60): Promise<BrowserItem[]> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('external_items')
    .select(EXTERNAL_ITEMS_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingSchemaError(error, 'external_items')) return [];
    throw new Error(error.message);
  }

  return ((data || []) as ExternalItemRecord[])
    .filter((item) => item?.image_url)
    .map((item) => ({
      id: item.id,
      image_url: item.image_url,
      image_path: item.image_path ?? null,
      cutout_url: item.cutout_url ?? null,
      title: item.title ?? null,
      brand: item.brand ?? null,
      retailer: item.retailer ?? null,
      product_url: item.product_url ?? null,
      price: item.price ?? null,
      category: item.category ?? null,
      color: item.color ?? null,
    }));
}
