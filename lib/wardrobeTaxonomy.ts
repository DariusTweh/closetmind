export const CATEGORY_OPTIONS = ['top', 'bottom', 'shoes', 'outerwear', 'onepiece', 'accessory', 'layer'] as const;

export type WardrobeMainCategory = (typeof CATEGORY_OPTIONS)[number];

type LayeringRole = 'base' | 'standalone' | 'mid' | 'outer' | 'accessory';

type WardrobeSubtypeDefinition = {
  value: string;
  category: WardrobeMainCategory;
  displayLabel: string;
  typeLabel: string;
  layeringRole: LayeringRole;
  aliases: string[];
};

const SUBTYPE_DEFINITIONS: WardrobeSubtypeDefinition[] = [
  { value: 'tee', category: 'top', displayLabel: 'T-Shirt', typeLabel: 't-shirt', layeringRole: 'base', aliases: ['tee', 't shirt', 't-shirt', 'tshirt'] },
  { value: 'tank', category: 'top', displayLabel: 'Tank', typeLabel: 'tank', layeringRole: 'base', aliases: ['tank', 'cami', 'camisole'] },
  { value: 'polo', category: 'top', displayLabel: 'Polo', typeLabel: 'polo', layeringRole: 'base', aliases: ['polo'] },
  { value: 'button_up', category: 'top', displayLabel: 'Button-Up Shirt', typeLabel: 'button-up shirt', layeringRole: 'base', aliases: ['button up', 'button-up', 'buttondown', 'button-down', 'oxford shirt', 'dress shirt'] },
  { value: 'blouse', category: 'top', displayLabel: 'Blouse', typeLabel: 'blouse', layeringRole: 'base', aliases: ['blouse'] },
  { value: 'hoodie', category: 'layer', displayLabel: 'Hoodie', typeLabel: 'hoodie', layeringRole: 'mid', aliases: ['hoodie', 'hooded sweatshirt'] },
  { value: 'crewneck_sweatshirt', category: 'layer', displayLabel: 'Crewneck Sweatshirt', typeLabel: 'crewneck sweatshirt', layeringRole: 'mid', aliases: ['crewneck sweatshirt', 'sweatshirt', 'crewneck', 'crew neck'] },
  { value: 'sweater', category: 'layer', displayLabel: 'Sweater', typeLabel: 'sweater', layeringRole: 'mid', aliases: ['sweater', 'jumper', 'pullover', 'knit pullover'] },
  { value: 'quarter_zip', category: 'layer', displayLabel: 'Quarter / Half Zip', typeLabel: 'quarter / half zip', layeringRole: 'mid', aliases: ['quarter zip', 'quarter-zip', 'quarterzip', 'half zip', 'half-zip', 'halfzip', 'zip pullover', 'half zip pullover', 'quarter zip pullover'] },
  { value: 'cardigan', category: 'layer', displayLabel: 'Cardigan', typeLabel: 'cardigan', layeringRole: 'mid', aliases: ['cardigan'] },
  { value: 'overshirt', category: 'layer', displayLabel: 'Overshirt', typeLabel: 'overshirt', layeringRole: 'mid', aliases: ['overshirt', 'shacket', 'shirt jacket'] },
  { value: 'vest', category: 'layer', displayLabel: 'Vest', typeLabel: 'vest', layeringRole: 'mid', aliases: ['vest', 'gilet'] },
  { value: 'jeans', category: 'bottom', displayLabel: 'Jeans', typeLabel: 'jeans', layeringRole: 'standalone', aliases: ['jeans', 'denim jeans'] },
  { value: 'trousers', category: 'bottom', displayLabel: 'Trousers', typeLabel: 'trousers', layeringRole: 'standalone', aliases: ['trouser', 'trousers', 'slacks', 'dress pants', 'tailored pants', 'tailored pant'] },
  { value: 'cargos', category: 'bottom', displayLabel: 'Cargo Pants', typeLabel: 'cargo pants', layeringRole: 'standalone', aliases: ['cargo', 'cargos', 'cargo pants'] },
  { value: 'joggers', category: 'bottom', displayLabel: 'Sweatpants / Joggers', typeLabel: 'sweatpants / joggers', layeringRole: 'standalone', aliases: ['jogger', 'joggers', 'track pant', 'track pants', 'trackpants', 'sweatpant', 'sweatpants'] },
  { value: 'shorts', category: 'bottom', displayLabel: 'Shorts', typeLabel: 'shorts', layeringRole: 'standalone', aliases: ['short', 'shorts'] },
  { value: 'skirt', category: 'bottom', displayLabel: 'Skirt', typeLabel: 'skirt', layeringRole: 'standalone', aliases: ['skirt'] },
  { value: 'leggings', category: 'bottom', displayLabel: 'Leggings', typeLabel: 'leggings', layeringRole: 'standalone', aliases: ['legging', 'leggings'] },
  { value: 'sneakers', category: 'shoes', displayLabel: 'Sneakers', typeLabel: 'sneakers', layeringRole: 'standalone', aliases: ['sneaker', 'sneakers', 'trainer', 'trainers'] },
  { value: 'boots', category: 'shoes', displayLabel: 'Boots', typeLabel: 'boots', layeringRole: 'standalone', aliases: ['boot', 'boots'] },
  { value: 'loafers', category: 'shoes', displayLabel: 'Loafers', typeLabel: 'loafers', layeringRole: 'standalone', aliases: ['loafer', 'loafers', 'moccasin', 'moccasins'] },
  { value: 'sandals', category: 'shoes', displayLabel: 'Sandals', typeLabel: 'sandals', layeringRole: 'standalone', aliases: ['sandal', 'sandals', 'flip flop', 'flip flops', 'flip-flop', 'flip-flops', 'slide', 'slides'] },
  { value: 'heels', category: 'shoes', displayLabel: 'Heels', typeLabel: 'heels', layeringRole: 'standalone', aliases: ['heel', 'heels', 'pump', 'pumps'] },
  { value: 'dress_shoes', category: 'shoes', displayLabel: 'Dress Shoes', typeLabel: 'dress shoes', layeringRole: 'standalone', aliases: ['dress shoe', 'dress shoes', 'oxford', 'derby', 'brogue', 'brogues'] },
  { value: 'flats', category: 'shoes', displayLabel: 'Flats', typeLabel: 'flats', layeringRole: 'standalone', aliases: ['flat', 'flats', 'ballet flat', 'ballet flats'] },
  { value: 'jacket', category: 'outerwear', displayLabel: 'Jacket', typeLabel: 'jacket', layeringRole: 'outer', aliases: ['jacket', 'bomber', 'windbreaker'] },
  { value: 'coat', category: 'outerwear', displayLabel: 'Coat', typeLabel: 'coat', layeringRole: 'outer', aliases: ['coat', 'parka', 'trench', 'overcoat', 'puffer'] },
  { value: 'blazer', category: 'outerwear', displayLabel: 'Blazer', typeLabel: 'blazer', layeringRole: 'outer', aliases: ['blazer', 'sport coat', 'suit jacket'] },
  { value: 'bag', category: 'accessory', displayLabel: 'Bag', typeLabel: 'bag', layeringRole: 'accessory', aliases: ['bag', 'handbag', 'purse', 'tote', 'backpack'] },
  { value: 'hat', category: 'accessory', displayLabel: 'Hat', typeLabel: 'hat', layeringRole: 'accessory', aliases: ['hat', 'cap', 'beanie'] },
  { value: 'belt', category: 'accessory', displayLabel: 'Belt', typeLabel: 'belt', layeringRole: 'accessory', aliases: ['belt'] },
  { value: 'scarf', category: 'accessory', displayLabel: 'Scarf', typeLabel: 'scarf', layeringRole: 'accessory', aliases: ['scarf'] },
  { value: 'sunglasses', category: 'accessory', displayLabel: 'Sunglasses', typeLabel: 'sunglasses', layeringRole: 'accessory', aliases: ['sunglasses', 'shades', 'glasses'] },
  { value: 'jewelry', category: 'accessory', displayLabel: 'Jewelry', typeLabel: 'jewelry', layeringRole: 'accessory', aliases: ['jewelry', 'jewellery', 'necklace', 'bracelet', 'ring', 'earrings'] },
  { value: 'watch', category: 'accessory', displayLabel: 'Watch', typeLabel: 'watch', layeringRole: 'accessory', aliases: ['watch'] },
  { value: 'dress', category: 'onepiece', displayLabel: 'Dress', typeLabel: 'dress', layeringRole: 'standalone', aliases: ['dress'] },
  { value: 'jumpsuit', category: 'onepiece', displayLabel: 'Jumpsuit', typeLabel: 'jumpsuit', layeringRole: 'standalone', aliases: ['jumpsuit'] },
  { value: 'romper', category: 'onepiece', displayLabel: 'Romper', typeLabel: 'romper', layeringRole: 'standalone', aliases: ['romper'] },
];

const MAIN_CATEGORY_SET = new Set<string>(CATEGORY_OPTIONS);
const SUBTYPE_BY_VALUE = new Map(SUBTYPE_DEFINITIONS.map((definition) => [definition.value, definition] as const));
const SORTED_DEFINITIONS = SUBTYPE_DEFINITIONS.slice().sort((left, right) => {
  const leftLength = Math.max(...left.aliases.map((alias) => normalizeTaxonomyText(alias).length), left.value.length);
  const rightLength = Math.max(...right.aliases.map((alias) => normalizeTaxonomyText(alias).length), right.value.length);
  return rightLength - leftLength;
});

function normalizeTaxonomyText(value: any, maxLength = 120) {
  return String(value || '')
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, maxLength);
}

function includesAlias(text: string, alias: string) {
  if (!text || !alias) return false;
  return ` ${text} `.includes(` ${normalizeTaxonomyText(alias)} `);
}

function formatFallbackLabel(value: string | null | undefined) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function fallbackCategoryFromText(value: string, layeringRole?: string | null): WardrobeMainCategory | null {
  if (!value) return null;
  if (/\b(dress|jumpsuit|romper|onepiece|one piece)\b/.test(value)) return 'onepiece';
  if (/\b(blazer|jacket|coat|parka|trench|overcoat|puffer|outerwear)\b/.test(value)) return 'outerwear';
  if (
    /\b(cardigan|vest|gilet|overshirt|shacket|hoodie|crewneck sweatshirt|crewneck|sweater|pullover|quarter zip|half zip)\b/.test(value) ||
    ['mid', 'outer'].includes(String(layeringRole || '').trim().toLowerCase())
  ) {
    return 'layer';
  }
  if (/\b(shoe|sneaker|loafer|boot|heel|sandal|slide|flat|derby|brogue|oxford)\b/.test(value)) return 'shoes';
  if (/\b(pant|pants|jean|jeans|trouser|trousers|slacks|jogger|joggers|sweatpants|track pants|short|shorts|skirt|legging|leggings|cargo|cargos)\b/.test(value)) return 'bottom';
  if (/\b(bag|hat|belt|scarf|watch|sunglasses|jewelry|jewellery|necklace|bracelet|ring|earrings)\b/.test(value)) return 'accessory';
  if (/\b(tee|t shirt|t-shirt|tank|cami|blouse|button up|button-down|dress shirt|oxford shirt|polo|shirt|top)\b/.test(value)) return 'top';
  return null;
}

export function getSubtypeDefinition(value: string | null | undefined) {
  return SUBTYPE_BY_VALUE.get(String(value || '').trim()) || null;
}

export function canonicalizeSubtype(
  value: any,
  options?: {
    mainCategory?: string | null;
  },
) {
  const normalizedValue = normalizeTaxonomyText(value, 160);
  if (!normalizedValue) return null;

  const preferredCategory = normalizeMainCategoryOption(options?.mainCategory);
  const candidateSets = preferredCategory
    ? [
        SORTED_DEFINITIONS.filter((definition) => definition.category === preferredCategory),
        SORTED_DEFINITIONS,
      ]
    : [SORTED_DEFINITIONS];

  for (const definitions of candidateSets) {
    for (const definition of definitions) {
      if (normalizedValue === definition.value) return definition.value;
      if (definition.aliases.some((alias) => includesAlias(normalizedValue, alias))) {
        return definition.value;
      }
    }
  }

  return null;
}

export function normalizeMainCategoryOption(value: any): WardrobeMainCategory | null {
  const normalized = normalizeTaxonomyText(value, 48);
  return MAIN_CATEGORY_SET.has(normalized) ? (normalized as WardrobeMainCategory) : null;
}

export function deriveMainCategory({
  mainCategory,
  subcategory,
  type,
  name,
  layeringRole,
}: {
  mainCategory?: string | null;
  subcategory?: string | null;
  type?: string | null;
  name?: string | null;
  layeringRole?: string | null;
}) {
  const normalizedCategory = normalizeMainCategoryOption(mainCategory);
  const canonicalSubtype = canonicalizeSubtype(subcategory || type || name, {
    mainCategory: normalizedCategory,
  });
  if (canonicalSubtype) {
    return getSubtypeDefinition(canonicalSubtype)?.category || normalizedCategory || null;
  }
  if (normalizedCategory) return normalizedCategory;
  const fallbackText = normalizeTaxonomyText([mainCategory, type, name].filter(Boolean).join(' '), 180);
  return fallbackCategoryFromText(fallbackText, layeringRole);
}

export function getSubtypeOptionsForCategory(category: string | null | undefined) {
  const normalizedCategory = normalizeMainCategoryOption(category);
  if (!normalizedCategory) return [];

  return SUBTYPE_DEFINITIONS
    .filter((definition) => definition.category === normalizedCategory)
    .map((definition) => ({
      value: definition.value,
      label: definition.displayLabel,
    }));
}

export function getSubtypeDisplayLabel(value: string | null | undefined) {
  const definition = getSubtypeDefinition(value);
  if (definition) return definition.displayLabel;
  return formatFallbackLabel(String(value || '').trim()) || '';
}

export function getFriendlyTypeLabel(value: string | null | undefined, fallback?: string | null) {
  const definition = getSubtypeDefinition(value);
  if (definition) return definition.typeLabel;
  return String(fallback || '').trim() || null;
}

export function getDefaultLayeringRole(
  subcategory?: string | null,
  category?: string | null,
): LayeringRole | null {
  const definition = getSubtypeDefinition(subcategory);
  if (definition) return definition.layeringRole;
  const normalizedCategory = normalizeMainCategoryOption(category);
  if (normalizedCategory === 'outerwear') return 'outer';
  if (normalizedCategory === 'layer') return 'mid';
  if (normalizedCategory === 'top') return 'base';
  if (normalizedCategory === 'accessory') return 'accessory';
  if (normalizedCategory) return 'standalone';
  return null;
}

export function isSubtypeInCategory(subcategory: string | null | undefined, category: string | null | undefined) {
  const definition = getSubtypeDefinition(subcategory);
  const normalizedCategory = normalizeMainCategoryOption(category);
  if (!definition || !normalizedCategory) return false;
  return definition.category === normalizedCategory;
}

export function resolveCanonicalSubtypeDraft(item: any) {
  return canonicalizeSubtype(item?.subcategory || item?.type || item?.name, {
    mainCategory: item?.main_category,
  });
}
