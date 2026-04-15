import type { FitNotes, TaggingConfidence } from './tagging';

export type VerdictType = 'strong_buy' | 'maybe' | 'skip';
export type GapInsightType = 'gap_fill' | 'duplicate_risk' | 'neutral';
export type VerdictRouteSource = 'add' | 'browser' | 'closet' | 'manual';

export interface VerdictItem {
  id?: string;
  wardrobe_status?: 'owned' | 'wishlist' | 'scanned_candidate' | string | null;
  source_type?: 'wardrobe' | 'external' | string | null;
  source_subtype?: string | null;
  external_item_id?: string | null;
  is_saved_to_closet?: boolean | null;
  category?: string | null;
  name: string;
  source_title?: string | null;
  type?: string | null;
  main_category?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[];
  color_family?: string[];
  pattern_description?: string | null;
  pattern_type?: string | null;
  silhouette?: string | null;
  fit_type?: string | null;
  material?: string | null;
  formality?: string | null;
  occasion_tags?: string[];
  layering_role?: string | null;
  statement_level?: string | null;
  footwear_style?: string | null;
  style_role?: string | null;
  material_guess?: string | null;
  weather_use?: string[];
  vibe_tags?: string[];
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  product_url?: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  source_image_url?: string | null;
  original_image_url?: string | null;
  source_id?: string | null;
  external_product_id?: string | null;
  retailer?: string | null;
  retailer_name?: string | null;
  retail_price?: number | null;
  confidence?: TaggingConfidence | number | null;
  fit_notes?: FitNotes | null;
  summary?: string | null;
  season?: string[] | string | null;
  meta?: Record<string, any> | null;
}

export interface VerdictScores {
  style_match: number;
  closet_fit: number;
  versatility: number;
}

export interface OutfitProof {
  label: string;
  item_ids: string[];
  reason?: string | null;
}

export interface GapInsight {
  type: GapInsightType;
  message: string;
}

export interface ItemVerdictResponse {
  item: VerdictItem;
  item_source?: 'wardrobe' | 'external';
  is_saved_to_closet?: boolean;
  verdict: VerdictType;
  summary: string;
  scores: VerdictScores;
  reasons: string[];
  gap_or_duplicate: GapInsight;
  outfit_proofs: OutfitProof[];
  actions: {
    can_style: boolean;
    can_try_on: boolean;
    can_save: boolean;
  };
}

export interface ItemVerdictRouteParams {
  itemId?: string;
  item?: VerdictItem;
  source?: VerdictRouteSource;
  autoSaved?: boolean;
}

export function normalizeVerdictItemSeason(value?: VerdictItem['season']): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim().toLowerCase()).filter(Boolean);
  }
  const single = String(value || '').trim().toLowerCase();
  return single ? [single] : [];
}
