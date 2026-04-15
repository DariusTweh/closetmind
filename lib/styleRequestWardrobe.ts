type StyleRequestWardrobeLike = {
  id?: string | number | null;
  source_type?: string | null;
  source_subtype?: string | null;
  external_item_id?: string | null;
  is_saved_to_closet?: boolean | null;
  name?: string | null;
  type?: string | null;
  main_category?: string | null;
  subcategory?: string | null;
  garment_function?: string | null;
  fabric_weight?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[] | null;
  pattern_description?: string | null;
  vibe_tags?: string[] | null;
  season?: string | string[] | null;
  style_role?: string | null;
  material_guess?: string | null;
  silhouette?: string | null;
  weather_use?: string[] | null;
  occasion_tags?: string[] | null;
  fit?: string | null;
  fit_notes?: { fit?: string | null } | null;
};

function cleanArray(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function toStyleRequestWardrobeItem(item: StyleRequestWardrobeLike | null | undefined) {
  if (!item?.id) return null;

  return {
    id: String(item.id),
    source_type: item.source_type ?? null,
    source_subtype: item.source_subtype ?? null,
    external_item_id: item.external_item_id ?? null,
    is_saved_to_closet: item.is_saved_to_closet ?? null,
    name: item.name ?? null,
    type: item.type ?? null,
    main_category: item.main_category ?? null,
    subcategory: item.subcategory ?? null,
    garment_function: item.garment_function ?? null,
    fabric_weight: item.fabric_weight ?? null,
    primary_color: item.primary_color ?? null,
    secondary_colors: cleanArray(item.secondary_colors),
    pattern_description: item.pattern_description ?? null,
    vibe_tags: cleanArray(item.vibe_tags),
    season: item.season ?? null,
    style_role: item.style_role ?? null,
    material_guess: item.material_guess ?? null,
    silhouette: item.silhouette ?? null,
    weather_use: cleanArray(item.weather_use),
    occasion_tags: cleanArray(item.occasion_tags),
    fit: item.fit ?? item.fit_notes?.fit ?? null,
  };
}

export function toStyleRequestWardrobeList(items: StyleRequestWardrobeLike[] | null | undefined) {
  return Array.isArray(items)
    ? items.map((item) => toStyleRequestWardrobeItem(item)).filter(Boolean)
    : [];
}
