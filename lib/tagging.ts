export interface FitNotes {
  stacking?: string | null;
  rise?: string | null;
  length?: string | null;
  fit?: string | null;
}

export interface TaggingConfidence {
  overall?: number | null;
  category?: number | null;
  color?: number | null;
  material?: number | null;
  occasion?: number | null;
  fit?: number | null;
}

export interface TaggedFashionItem {
  name: string;
  source_title?: string | null;
  type: string | null;
  main_category: string | null;
  primary_color: string | null;
  secondary_colors: string[];
  color_family?: string[];
  pattern_description: string | null;
  pattern_type?: string | null;
  material?: string | null;
  material_guess?: string | null;
  fabric_weight?: string | null;
  texture_notes?: string | null;
  silhouette?: string | null;
  fit_type?: string | null;
  length?: string | null;
  rise?: string | null;
  sleeve_length?: string | null;
  formality?: string | null;
  occasion_tags: string[];
  layering_role?: string | null;
  statement_level?: string | null;
  footwear_style?: string | null;
  style_role?: string | null;
  garment_function?: string | null;
  weather_use?: string[];
  fit_notes?: FitNotes | null;
  try_on_fit_notes?: string | null;
  styling_notes?: string | null;
  vibe_tags: string[];
  season: string | null;
  brand?: string | null;
  inferred_brand?: boolean | null;
  price?: number | null;
  retail_price?: number | null;
  currency?: string | null;
  retailer?: string | null;
  retailer_name?: string | null;
  product_url?: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  source_image_url?: string | null;
  original_image_url?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  external_product_id?: string | null;
  subcategory?: string | null;
  subcategory_confidence?: number | null;
  function_confidence?: number | null;
  material_confidence?: number | null;
  confidence?: TaggingConfidence | number | null;
  [key: string]: any;
}

export interface TaggingImportContext {
  source_url?: string | null;
  product_url?: string | null;
  source_domain?: string | null;
  retailer?: string | null;
  retailer_name?: string | null;
  brand?: string | null;
  price?: number | null;
  retail_price?: number | null;
  currency?: string | null;
  source_image_url?: string | null;
  original_image_url?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  external_product_id?: string | null;
  source_title?: string | null;
}

export interface TaggingResponse {
  success?: boolean;
  raw_tags?: Record<string, any> | null;
  normalized_tags?: TaggedFashionItem | null;
  warnings?: string[];
  confidence?: TaggingConfidence | null;
  latency?: {
    model_ms?: number;
    normalize_ms?: number;
    total_ms?: number;
  } | null;
  meta?: {
    model?: string;
    used_retry?: boolean;
  } | null;
  tags?: TaggedFashionItem | null;
  error?: string;
  error_code?: string;
  [key: string]: any;
}

export interface VerdictPrepInput {
  item: TaggedFashionItem;
  userProfile: {
    primary_vibes?: string[];
    core_colors?: string[];
    accent_colors?: string[];
    silhouettes?: string[];
    seasons?: string[];
    fit_prefs?: Record<string, any> | null;
    brand_tiers?: Record<string, any> | null;
    avoided_colors?: string[];
    avoided_vibes?: string[];
    preferred_occasions?: string[];
    preferred_formality?: string | null;
    favorite_categories?: string[];
    avoided_categories?: string[];
    preferred_patterns?: string[];
    avoided_patterns?: string[];
    contrast_preference?: string | null;
    profile_confidence?: number | null;
  };
  wardrobeSummary?: {
    dominant_colors?: string[];
    dominant_vibes?: string[];
    overrepresented_categories?: string[];
    underrepresented_categories?: string[];
    duplicate_item_hints?: string[];
  } | null;
}

export function extractNormalizedTags(payload: TaggingResponse | TaggedFashionItem | null | undefined): TaggedFashionItem {
  const response = (payload || {}) as TaggingResponse;
  return (response.normalized_tags || response.tags || response || {}) as TaggedFashionItem;
}

export function extractTaggingWarnings(payload: TaggingResponse | null | undefined): string[] {
  return Array.isArray(payload?.warnings) ? payload.warnings : [];
}
