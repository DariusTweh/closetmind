export type CanvasSourceType = 'wardrobe' | 'external';

export type StyleCanvasOrigin = 'browser' | 'closet' | 'saved' | 'manual' | 'mixed' | string;

export type BrowserItem = {
  id: string;
  image_url: string;
  cutout_url?: string | null;
  title?: string | null;
  brand?: string | null;
  retailer?: string | null;
  product_url?: string | null;
  price?: number | null;
  category?: string | null;
  color?: string | null;
  currency?: string | null;
  image_path?: string | null;
};

export type WardrobeCanvasSourceItem = {
  id: string;
  source_type?: CanvasSourceType | null;
  source_subtype?: string | null;
  external_item_id?: string | null;
  is_saved_to_closet?: boolean | null;
  name?: string | null;
  source_title?: string | null;
  brand?: string | null;
  retailer?: string | null;
  product_url?: string | null;
  price?: number | null;
  type?: string | null;
  main_category?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[] | null;
  season?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  cutout_url?: string | null;
};

export type CanvasItem = {
  id: string;
  source_type: CanvasSourceType;
  source_item_id: string | null;
  image_url: string;
  image_path?: string | null;
  cutout_url?: string | null;
  title?: string | null;
  brand?: string | null;
  retailer?: string | null;
  product_url?: string | null;
  price?: number | null;
  category?: string | null;
  color?: string | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  locked?: boolean;
};

export type SavedOutfitItem = {
  id: string;
  source_type: CanvasSourceType;
  source_item_id: string | null;
  image_url: string;
  image_path?: string | null;
  cutout_url?: string | null;
  title?: string | null;
  name?: string | null;
  brand?: string | null;
  retailer?: string | null;
  product_url?: string | null;
  price?: number | null;
  category?: string | null;
  color?: string | null;
  reason?: string | null;
  type?: string | null;
  main_category?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[];
  season?: string | null;
  source_subtype?: string | null;
  external_item_id?: string | null;
  is_saved_to_closet?: boolean | null;
};

export type ExternalItemRecord = {
  id: string;
  user_id?: string | null;
  image_url: string;
  image_path?: string | null;
  cutout_url?: string | null;
  title?: string | null;
  brand?: string | null;
  retailer?: string | null;
  product_url?: string | null;
  price?: number | null;
  category?: string | null;
  color?: string | null;
  metadata?: Record<string, any> | null;
  source_subtype?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StyleCanvasRecord = {
  id: string;
  user_id: string;
  title?: string | null;
  origin?: StyleCanvasOrigin | null;
  preview_image_url?: string | null;
  background_color?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SavedStyleCanvas = StyleCanvasRecord & {
  items: CanvasItem[];
};
