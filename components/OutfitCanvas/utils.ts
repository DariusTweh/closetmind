import type { CanvasItem as LegacyCanvasItem } from '../../types/styleCanvas';
import type { OutfitCanvasItem, OutfitCanvasLayout, OutfitCanvasReasonItem } from './types';

const LEGACY_STAGE_WIDTH = 345;
const LEGACY_STAGE_HEIGHT = 420;
const LEGACY_ITEM_WIDTH = 146;
const LEGACY_ITEM_HEIGHT = 196;
const BOARD_ASPECT_RATIO = 0.78;

type CanvasItemVisualFrame = {
  widthScale: number;
  heightScale: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(value: unknown, maxLength = 180) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export function getOutfitCanvasBoardAspectRatio() {
  return BOARD_ASPECT_RATIO;
}

export function resolveCanvasRole(item: any) {
  const candidates = [
    item?.outfit_role,
    item?.main_category,
    item?.category,
    item?.type,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'top' || candidate === 'base' || candidate === 'base_top') return 'base_top';
    if (candidate === 'layer' || candidate === 'top_layer') return 'top_layer';
    if (candidate === 'outerwear') return 'outerwear';
    if (candidate === 'onepiece' || candidate === 'dress' || candidate === 'jumpsuit' || candidate === 'romper') return 'onepiece';
    if (candidate === 'bottom') return 'bottom';
    if (candidate === 'shoes' || candidate === 'shoe') return 'shoes';
    if (candidate === 'accessory' || candidate === 'accessories') return 'accessory';
  }

  return 'base_top';
}

export function formatCanvasRoleLabel(role?: string | null) {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return 'Piece';
  if (normalized === 'base_top') return 'Top';
  if (normalized === 'top_layer') return 'Layer';
  if (normalized === 'onepiece') return 'One-Piece';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getCanvasItemVisualFrame(itemOrRole?: any): CanvasItemVisualFrame {
  const normalized =
    typeof itemOrRole === 'string'
      ? String(itemOrRole || '').trim().toLowerCase()
      : resolveCanvasRole(itemOrRole);
  const subtype =
    typeof itemOrRole === 'object' && itemOrRole
      ? [itemOrRole?.subcategory, itemOrRole?.type, itemOrRole?.category]
          .map((value) => String(value || '').trim().toLowerCase())
          .find(Boolean) || ''
      : '';

  if (normalized === 'bottom') {
    return { widthScale: 0.86, heightScale: 0.86 };
  }

  if (normalized === 'shoes') {
    return { widthScale: 1.44, heightScale: 1.44 };
  }

  if (normalized === 'base_top') {
    return { widthScale: 1.14, heightScale: 1.14 };
  }

  if (normalized === 'top_layer') {
    return { widthScale: 1.1, heightScale: 1.1 };
  }

  if (normalized === 'outerwear') {
    return { widthScale: 1.04, heightScale: 1.04 };
  }

  if (normalized === 'accessory') {
    if (subtype.includes('belt') || subtype.includes('scarf')) {
      return { widthScale: 1.9, heightScale: 1.34 };
    }

    if (subtype.includes('bag') || subtype.includes('hat')) {
      return { widthScale: 1.4, heightScale: 1.4 };
    }

    return { widthScale: 1.6, heightScale: 1.36 };
  }

  return { widthScale: 1, heightScale: 1 };
}

export function normalizeOutfitCanvasLayout(value?: Partial<OutfitCanvasLayout> | null): OutfitCanvasLayout | null {
  if (!value) return null;

  const width = clamp(normalizeNumber(value.w) ?? 0, 0.1, 0.72);
  const height = clamp(normalizeNumber(value.h) ?? 0, 0.08, 0.82);
  const x = clamp(normalizeNumber(value.x) ?? 0, 0.02, Math.max(0.02, 0.98 - width));
  const y = clamp(normalizeNumber(value.y) ?? 0, 0.02, Math.max(0.02, 0.98 - height));
  const rotation = clamp(normalizeNumber(value.rotation) ?? 0, -24, 24);
  const zIndex = Math.max(1, Math.round(normalizeNumber(value.zIndex) ?? 1));

  return { x, y, w: width, h: height, rotation, zIndex };
}

function layoutKeyForItem(item: any, index: number) {
  return (
    normalizeText(item?.source_item_id, 120) ||
    normalizeText(item?.external_item_id, 120) ||
    normalizeText(item?.id, 120) ||
    `item-${index}`
  );
}

function roleSlot(role: string, itemCountForRole: number, indexInRole: number) {
  if (role === 'onepiece') {
    return { x: 0.20, y: 0.04, w: 0.60, h: 0.74, zIndex: 4 };
  }

  if (role === 'outerwear') {
    return { x: 0.16, y: 0.03, w: 0.54, h: 0.46, zIndex: 2 };
  }

  if (role === 'bottom') {
    return { x: 0.26, y: 0.38, w: 0.44, h: 0.38, zIndex: 3 };
  }

  if (role === 'shoes') {
    if (itemCountForRole <= 1) {
      return { x: 0.31, y: 0.79, w: 0.30, h: 0.18, zIndex: 6 };
    }
    return indexInRole % 2 === 0
      ? { x: 0.10, y: 0.79, w: 0.24, h: 0.16, zIndex: 6 }
      : { x: 0.66, y: 0.79, w: 0.24, h: 0.16, zIndex: 6 };
  }

  if (role === 'accessory') {
    return { x: 0.68, y: 0.16, w: 0.22, h: 0.16, zIndex: 7 };
  }

  if (role === 'top_layer') {
    return { x: 0.54, y: 0.07, w: 0.38, h: 0.36, zIndex: 5 };
  }

  return { x: 0.08, y: 0.07, w: 0.46, h: 0.38, zIndex: 4 };
}

function applyRoleOffsets(layout: OutfitCanvasLayout, role: string, indexInRole: number, itemCountForRole: number) {
  if (itemCountForRole <= 1) return layout;

  const spread = indexInRole - (itemCountForRole - 1) / 2;
  const xOffset = role === 'shoes' ? spread * 0.04 : spread * 0.035;
  const yOffset = role === 'outerwear' ? spread * 0.01 : Math.abs(spread) * 0.012;
  const rotation = (layout.rotation ?? 0) + spread * 2.8;

  return normalizeOutfitCanvasLayout({
    ...layout,
    x: layout.x + xOffset,
    y: layout.y + yOffset,
    rotation,
    zIndex: (layout.zIndex ?? 1) + indexInRole,
  })!;
}

export function buildAutoLayout(items: any[]): Record<string, OutfitCanvasLayout> {
  const normalizedItems = Array.isArray(items) ? items : [];
  const grouped = new Map<string, any[]>();

  normalizedItems.forEach((item) => {
    const role = resolveCanvasRole(item);
    const current = grouped.get(role) || [];
    current.push(item);
    grouped.set(role, current);
  });

  const upperRoles = ['base_top', 'top_layer', 'outerwear'];
  const upperCount = upperRoles.reduce((count, role) => count + (grouped.get(role)?.length || 0), 0);
  const hasOnepiece = (grouped.get('onepiece')?.length || 0) > 0;

  const layoutMap: Record<string, OutfitCanvasLayout> = {};

  normalizedItems.forEach((item, index) => {
    const role = resolveCanvasRole(item);
    const roleItems = grouped.get(role) || [];
    const indexInRole = roleItems.findIndex((entry) => entry === item);
    const layoutId = layoutKeyForItem(item, index);

    if (!hasOnepiece && upperCount === 1 && upperRoles.includes(role)) {
      layoutMap[layoutId] = normalizeOutfitCanvasLayout({
        x: 0.24,
        y: 0.06,
        w: role === 'outerwear' ? 0.56 : 0.52,
        h: role === 'outerwear' ? 0.44 : 0.40,
        rotation: 0,
        zIndex: role === 'outerwear' ? 2 : 4,
      })!;
      return;
    }

    const baseLayout = roleSlot(role, roleItems.length, Math.max(indexInRole, 0));
    layoutMap[layoutId] = applyRoleOffsets(baseLayout, role, Math.max(indexInRole, 0), roleItems.length);
  });

  return layoutMap;
}

export function buildLegacyCanvasLayoutMap(legacyItems: LegacyCanvasItem[] = []) {
  return (legacyItems || []).reduce<Record<string, OutfitCanvasLayout>>((accumulator, item, index) => {
    const sourceId =
      normalizeText(item?.source_item_id, 120) ||
      normalizeText(item?.id, 120) ||
      `legacy-${index}`;
    const scale = normalizeNumber(item?.scale) ?? 1;
    const layout = normalizeOutfitCanvasLayout({
      x: (normalizeNumber(item?.x) ?? 0) / LEGACY_STAGE_WIDTH,
      y: (normalizeNumber(item?.y) ?? 0) / LEGACY_STAGE_HEIGHT,
      w: (LEGACY_ITEM_WIDTH * scale) / LEGACY_STAGE_WIDTH,
      h: (LEGACY_ITEM_HEIGHT * scale) / LEGACY_STAGE_HEIGHT,
      rotation: ((normalizeNumber(item?.rotation) ?? 0) * 180) / Math.PI,
      zIndex: normalizeNumber(item?.zIndex ?? (item as any)?.z_index) ?? index + 1,
    });

    if (layout) {
      accumulator[sourceId] = layout;
    }

    return accumulator;
  }, {});
}

export function buildOutfitCanvasItems(
  items: any[],
  options?: {
    lockedIds?: string[];
    legacyLayoutMap?: Record<string, OutfitCanvasLayout>;
  },
): OutfitCanvasItem[] {
  const normalizedItems = Array.isArray(items) ? items : [];
  const autoLayout = buildAutoLayout(normalizedItems);
  const lockedIds = new Set((options?.lockedIds || []).map((value) => String(value || '').trim()).filter(Boolean));
  const legacyLayoutMap = options?.legacyLayoutMap || {};

  return normalizedItems.map((item, index) => {
    const key = layoutKeyForItem(item, index);
    const savedLayout = normalizeOutfitCanvasLayout(item?.layout);
    const legacyLayout = normalizeOutfitCanvasLayout(legacyLayoutMap[key]);
    const layout = savedLayout || legacyLayout || autoLayout[key];
    const sourceItemId = normalizeText(item?.source_item_id, 120);
    const itemId = normalizeText(item?.id, 120) || sourceItemId || `canvas-item-${index}`;

    return {
      id: itemId,
      source_type: normalizeText(item?.source_type, 40),
      source_item_id: sourceItemId,
      external_item_id: normalizeText(item?.external_item_id, 120),
      name: normalizeText(item?.name, 180),
      title: normalizeText(item?.title, 180),
      type: normalizeText(item?.type, 60),
      main_category: normalizeText(item?.main_category, 60),
      category: normalizeText(item?.category, 60),
      subcategory: normalizeText(item?.subcategory, 60),
      outfit_role: normalizeText(item?.outfit_role, 60),
      primary_color: normalizeText(item?.primary_color || item?.color, 40),
      image_url: normalizeText(item?.image_url, 500),
      image_path: normalizeText(item?.image_path, 240),
      thumbnail_url: normalizeText(item?.thumbnail_url, 500),
      display_image_url: normalizeText(item?.display_image_url, 500),
      original_image_url: normalizeText(item?.original_image_url, 500),
      cutout_image_url: normalizeText(item?.cutout_image_url, 500),
      cutout_thumbnail_url: normalizeText(item?.cutout_thumbnail_url, 500),
      cutout_display_url: normalizeText(item?.cutout_display_url, 500),
      cutout_url: normalizeText(item?.cutout_url, 500),
      reason: normalizeText(item?.reason, 400),
      locked: Boolean(item?.locked) || lockedIds.has(itemId) || (sourceItemId ? lockedIds.has(sourceItemId) : false),
      layout,
    };
  });
}

export function buildOutfitCanvasReasons(items: OutfitCanvasItem[]): OutfitCanvasReasonItem[] {
  return (items || [])
    .map((item) => ({
      id: item.id,
      label: normalizeText(item.name || item.title || item.type, 40) || formatCanvasRoleLabel(resolveCanvasRole(item)),
      reason: normalizeText(item.reason, 240),
      role: formatCanvasRoleLabel(resolveCanvasRole(item)),
      locked: Boolean(item.locked),
    }))
    .filter((item) => item.label || item.reason);
}

export function toSavedItemLayout(layout?: OutfitCanvasLayout | null) {
  const normalized = normalizeOutfitCanvasLayout(layout);
  if (!normalized) return null;
  return {
    x: normalized.x,
    y: normalized.y,
    w: normalized.w,
    h: normalized.h,
    rotation: normalized.rotation ?? 0,
    zIndex: normalized.zIndex ?? 1,
  };
}
