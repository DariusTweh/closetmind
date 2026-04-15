import type {
  BrowserItem,
  CanvasItem,
  CanvasSourceType,
  SavedOutfitItem,
  SavedStyleCanvas,
  WardrobeCanvasSourceItem,
} from '../types/styleCanvas';

const STAGGER_X = 24;
const STAGGER_Y = 18;
const DEFAULT_START_X = 28;
const DEFAULT_START_Y = 36;
const WARDROBE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeText(value: any, maxLength = 160) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeNumber(value: any, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStringArray(value: any, maxItems = 8, maxLength = 48) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeText(entry, maxLength))
        .filter(Boolean),
    ),
  ).slice(0, maxItems) as string[];
}

function normalizePrice(value: any) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createCanvasItemId(prefix: string, sourceId?: string | null) {
  const normalizedSourceId = String(sourceId || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 48);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const stableSource = normalizedSourceId || 'item';
  return `${prefix}_${Date.now()}_${stableSource}_${randomSuffix}`;
}

function defaultPosition(index: number) {
  return {
    x: DEFAULT_START_X + (index % 4) * STAGGER_X,
    y: DEFAULT_START_Y + index * STAGGER_Y,
  };
}

export function getCanvasItemDisplayUri(item: Pick<CanvasItem, 'cutout_url' | 'image_url'>) {
  return item.cutout_url || item.image_url;
}

function isWardrobeUuid(value: any) {
  return WARDROBE_UUID_PATTERN.test(String(value || '').trim());
}

function inferSourceType(item: any): CanvasSourceType {
  if (item?.source_type === 'external') return 'external';
  if (item?.source_type === 'wardrobe') return 'wardrobe';
  if (item?.is_saved_to_closet === false) return 'external';
  if (item?.external_item_id) return 'external';
  if (String(item?.id || '').trim().startsWith('ext_')) return 'external';
  if (isWardrobeUuid(item?.source_item_id || item?.id)) return 'wardrobe';
  return 'external';
}

export function reindexCanvasItems(items: CanvasItem[]) {
  return (items || [])
    .slice()
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((item, index) => ({
      ...item,
      zIndex: index + 1,
    }));
}

export function moveCanvasItemToLayer(items: CanvasItem[], itemId: string, direction: 'front' | 'back') {
  const ordered = reindexCanvasItems(items);
  const currentIndex = ordered.findIndex((item) => item.id === itemId);
  if (currentIndex === -1) return ordered;

  const nextOrdered = ordered.slice();
  const [target] = nextOrdered.splice(currentIndex, 1);

  if (direction === 'front') {
    nextOrdered.push(target);
  } else {
    nextOrdered.unshift(target);
  }

  return reindexCanvasItems(nextOrdered);
}

export function browserItemsToCanvasItems(
  items: BrowserItem[],
  options?: { startingZIndex?: number },
): CanvasItem[] {
  const startingZIndex = Number(options?.startingZIndex) || 1;

  return (items || [])
    .filter((item) => item?.image_url)
    .map((item, index) => {
      const position = defaultPosition(index);
      return {
        id: createCanvasItemId('canvas_external', item.id),
        source_type: 'external' as const,
        source_item_id: item.id || null,
        image_url: item.image_url,
        image_path: item.image_path ?? null,
        cutout_url: item.cutout_url ?? null,
        title: normalizeText(item.title, 180),
        brand: normalizeText(item.brand, 80),
        retailer: normalizeText(item.retailer, 80),
        product_url: normalizeText(item.product_url, 500),
        price: normalizePrice(item.price),
        category: normalizeText(item.category, 60),
        color: normalizeText(item.color, 40),
        x: position.x,
        y: position.y,
        scale: 1,
        rotation: 0,
        zIndex: startingZIndex + index,
        locked: false,
      };
    });
}

export function wardrobeItemsToCanvasItems(
  items: WardrobeCanvasSourceItem[],
  options?: { startingZIndex?: number },
): CanvasItem[] {
  const startingZIndex = Number(options?.startingZIndex) || 1;

  return (items || [])
    .filter((item) => item?.image_url)
    .map((item, index) => {
      const position = defaultPosition(index);
      return {
        id: createCanvasItemId('canvas_wardrobe', item.id),
        source_type: 'wardrobe' as const,
        source_item_id: item.id || null,
        image_url: String(item.image_url || '').trim(),
        image_path: item.image_path ?? null,
        cutout_url: item.cutout_url ?? null,
        title: normalizeText(item.name || item.source_title, 180),
        brand: normalizeText(item.brand, 80),
        retailer: normalizeText(item.retailer, 80),
        product_url: normalizeText(item.product_url, 500),
        price: normalizePrice(item.price),
        category: normalizeText(item.main_category || item.type, 60),
        color: normalizeText(item.primary_color, 40),
        x: position.x,
        y: position.y,
        scale: 1,
        rotation: 0,
        zIndex: startingZIndex + index,
        locked: false,
      };
    });
}

export function deserializeStyleCanvas(canvas: any, items: any[] = []): SavedStyleCanvas {
  return {
    id: String(canvas?.id || ''),
    user_id: String(canvas?.user_id || ''),
    title: normalizeText(canvas?.title, 160) || 'Style Canvas',
    origin: normalizeText(canvas?.origin, 40) || 'manual',
    preview_image_url: normalizeText(canvas?.preview_image_url, 500),
    background_color: normalizeText(canvas?.background_color, 24) || '#f7f1e7',
    metadata: canvas?.metadata && typeof canvas.metadata === 'object' ? canvas.metadata : {},
    created_at: canvas?.created_at || null,
    updated_at: canvas?.updated_at || null,
    items: reindexCanvasItems(
      (items || []).map((item, index) => ({
        id: String(item?.id || createCanvasItemId('canvas_saved')),
        source_type: item?.source_type === 'wardrobe' ? 'wardrobe' : 'external',
        source_item_id: normalizeText(item?.source_item_id, 120),
        image_url: String(item?.image_url || '').trim(),
        image_path: normalizeText(item?.image_path, 240),
        cutout_url: normalizeText(item?.cutout_url, 500),
        title: normalizeText(item?.title, 180),
        brand: normalizeText(item?.brand, 80),
        retailer: normalizeText(item?.retailer, 80),
        product_url: normalizeText(item?.product_url, 500),
        price: normalizePrice(item?.price),
        category: normalizeText(item?.category, 60),
        color: normalizeText(item?.color, 40),
        x: normalizeNumber(item?.x, DEFAULT_START_X),
        y: normalizeNumber(item?.y, DEFAULT_START_Y),
        scale: normalizeNumber(item?.scale, 1),
        rotation: normalizeNumber(item?.rotation, 0),
        zIndex: normalizeNumber(item?.z_index, index + 1),
        locked: Boolean(item?.locked),
      })),
    ),
  };
}

export function serializeCanvasItemsForSave(items: CanvasItem[]) {
  return reindexCanvasItems(items).map((item) => ({
    id: item.id,
    source_type: item.source_type,
    source_item_id: item.source_item_id,
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
    x: Number(item.x || 0),
    y: Number(item.y || 0),
    scale: Number(item.scale || 1),
    rotation: Number(item.rotation || 0),
    z_index: Number(item.zIndex || 1),
    locked: Boolean(item.locked),
  }));
}

export function buildBrowserItemsFromImageUrls(
  imageUrls: string[],
  meta?: {
    title?: string | null;
    brand?: string | null;
    retailer?: string | null;
    product_url?: string | null;
    price?: number | null;
    category?: string | null;
    color?: string | null;
    currency?: string | null;
  },
): BrowserItem[] {
  const deduped = Array.from(new Set((imageUrls || []).filter(Boolean)));

  return deduped.map((imageUrl, index) => {
    const stableKey = String(meta?.product_url || imageUrl || index)
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 80);

    return {
      id: `browser_${stableKey}_${index}`,
      image_url: imageUrl,
      cutout_url: null,
      title: normalizeText(meta?.title, 180),
      brand: normalizeText(meta?.brand, 80),
      retailer: normalizeText(meta?.retailer, 80),
      product_url: normalizeText(meta?.product_url, 500),
      price: normalizePrice(meta?.price),
      category: normalizeText(meta?.category, 60),
      color: normalizeText(meta?.color, 40),
      currency: normalizeText(meta?.currency, 12),
    };
  });
}

export function canvasItemsToSavedOutfitItems(items: CanvasItem[]): SavedOutfitItem[] {
  return (items || [])
    .filter((item) => item?.image_url)
    .map((item) => {
      const sourceType = inferSourceType(item);
      const sourceItemId =
        normalizeText(item.source_item_id, 120) ||
        (sourceType === 'wardrobe' ? normalizeText(item.id, 120) : normalizeText(item.source_item_id || item.id, 120));
      const title = normalizeText(item.title, 180);
      const category = normalizeText(item.category, 60);
      const color = normalizeText(item.color, 40);

      return {
        id: sourceItemId || createCanvasItemId('saved_outfit_item', item.id),
        source_type: sourceType,
        source_item_id: sourceItemId,
        image_url: String(item.image_url || '').trim(),
        image_path: normalizeText(item.image_path, 240),
        cutout_url: normalizeText(item.cutout_url, 500),
        title,
        name: title,
        brand: normalizeText(item.brand, 80),
        retailer: normalizeText(item.retailer, 80),
        product_url: normalizeText(item.product_url, 500),
        price: normalizePrice(item.price),
        category,
        color,
        reason: null,
        type: category,
        main_category: category,
        primary_color: color,
        secondary_colors: [],
        season: null,
        source_subtype: sourceType === 'external' ? 'browser_import' : null,
        external_item_id: sourceType === 'external' ? sourceItemId : null,
        is_saved_to_closet: sourceType === 'wardrobe',
      };
    });
}

export function extractTryOnCandidatesFromCanvas(items: CanvasItem[]) {
  const candidates = (items || []).filter((item) => item?.image_url);
  const deduped = Array.from(
    new Map(
      candidates.map((item) => {
        const sourceType = inferSourceType(item);
        const stableKey =
          sourceType === 'wardrobe'
            ? `wardrobe:${item.source_item_id || item.id}`
            : `external:${item.source_item_id || item.product_url || item.image_url || item.id}`;
        return [stableKey, item];
      }),
    ).values(),
  );

  const tryOnItems = deduped.map((item) => {
    const sourceType = inferSourceType(item);
    const category = normalizeText(item.category, 60);
    const color = normalizeText(item.color, 40);
    const sourceItemId =
      normalizeText(item.source_item_id, 120) ||
      normalizeText(sourceType === 'wardrobe' ? item.id : item.source_item_id || item.id, 120);

    return {
      id: sourceItemId || item.id,
      source_type: sourceType,
      source_subtype: sourceType === 'external' ? 'browser_import' : null,
      external_item_id: sourceType === 'external' ? sourceItemId || item.id : null,
      is_saved_to_closet: sourceType === 'wardrobe',
      name: normalizeText(item.title, 180),
      type: category,
      main_category: category,
      image_url: String(item.image_url || '').trim(),
      image_path: normalizeText(item.image_path, 240),
      primary_color: color,
      color,
      product_url: normalizeText(item.product_url, 500),
      brand: normalizeText(item.brand, 80),
      retailer: normalizeText(item.retailer, 80),
      cutout_url: normalizeText(item.cutout_url, 500),
      tags: [],
      vibe_tags: [],
    };
  });

  return {
    items: tryOnItems,
    ignoredCount: Math.max((items || []).length - tryOnItems.length, 0),
  };
}

export function canvasItemsToBrowserItems(items: CanvasItem[]): BrowserItem[] {
  return (items || [])
    .filter((item) => inferSourceType(item) === 'external' && item?.image_url)
    .map((item) => ({
      id: normalizeText(item.source_item_id || item.id, 120) || createCanvasItemId('browser_canvas_item'),
      image_url: String(item.image_url || '').trim(),
      image_path: normalizeText(item.image_path, 240),
      cutout_url: normalizeText(item.cutout_url, 500),
      title: normalizeText(item.title, 180),
      brand: normalizeText(item.brand, 80),
      retailer: normalizeText(item.retailer, 80),
      product_url: normalizeText(item.product_url, 500),
      price: normalizePrice(item.price),
      category: normalizeText(item.category, 60),
      color: normalizeText(item.color, 40),
    }));
}

export function normalizeSavedOutfitLikeItem(item: any): SavedOutfitItem {
  const sourceType = inferSourceType(item);
  const category = normalizeText(item?.category || item?.main_category || item?.type, 60);
  const color = normalizeText(item?.color || item?.primary_color, 40);
  const title = normalizeText(item?.title || item?.name, 180);
  const sourceItemId =
    normalizeText(item?.source_item_id, 120) ||
    normalizeText(sourceType === 'wardrobe' ? item?.id : item?.external_item_id || item?.id, 120);

  return {
    id: sourceItemId || createCanvasItemId('saved_outfit_normalized', item?.id),
    source_type: sourceType,
    source_item_id: sourceItemId,
    image_url: String(item?.image_url || '').trim(),
    image_path: normalizeText(item?.image_path, 240),
    cutout_url: normalizeText(item?.cutout_url, 500),
    title,
    name: title,
    brand: normalizeText(item?.brand, 80),
    retailer: normalizeText(item?.retailer, 80),
    product_url: normalizeText(item?.product_url, 500),
    price: normalizePrice(item?.price),
    category,
    color,
    reason: normalizeText(item?.reason, 400),
    type: normalizeText(item?.type, 60) || category,
    main_category: normalizeText(item?.main_category, 60) || category,
    primary_color: normalizeText(item?.primary_color, 40) || color,
    secondary_colors: normalizeStringArray(item?.secondary_colors),
    season: normalizeText(item?.season, 24),
    source_subtype: normalizeText(item?.source_subtype, 40) || (sourceType === 'external' ? 'browser_import' : null),
    external_item_id:
      sourceType === 'external'
        ? normalizeText(item?.external_item_id || sourceItemId || item?.id, 120)
        : null,
    is_saved_to_closet: sourceType === 'wardrobe',
  };
}
