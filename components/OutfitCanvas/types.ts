export type OutfitCanvasLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  zIndex?: number;
};

export type OutfitCanvasItem = {
  id: string;
  source_type?: string | null;
  source_item_id?: string | null;
  external_item_id?: string | null;
  name?: string | null;
  title?: string | null;
  type?: string | null;
  main_category?: string | null;
  category?: string | null;
  subcategory?: string | null;
  outfit_role?: string | null;
  primary_color?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  thumbnail_url?: string | null;
  display_image_url?: string | null;
  original_image_url?: string | null;
  cutout_image_url?: string | null;
  cutout_thumbnail_url?: string | null;
  cutout_display_url?: string | null;
  cutout_url?: string | null;
  reason?: string | null;
  locked?: boolean;
  layout: OutfitCanvasLayout;
};

export type OutfitCanvasReasonItem = {
  id: string;
  label: string;
  reason?: string | null;
  role?: string | null;
  locked?: boolean;
};
