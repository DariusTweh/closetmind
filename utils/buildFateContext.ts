type MaybeArray<T> = T[] | T | null | undefined;

export type FateProfile = {
  style_tags?: string[] | null;
  color_prefs?: string[] | null;
  fit_prefs?: string[] | Record<string, any> | null;
};

export type FatePreferences = {
  primary_vibes?: string[] | null;
  silhouettes?: string[] | null;
  seasons?: string[] | null;
  core_colors?: string[] | null;
  accent_colors?: string[] | null;
  fit_prefs?: string[] | Record<string, any> | null;
  keywords?: string[] | null;
  preferred_occasions?: string[] | null;
  preferred_formality?: string | null;
};

export type FateWardrobeItem = {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  main_category?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[] | null;
  vibe_tags?: string[] | null;
  season?: string | string[] | null;
  pattern_description?: string | null;
  fit_type?: string | null;
  silhouette?: string | null;
  formality?: string | null;
  occasion_tags?: string[] | null;
};

export type FateWeatherInfo = {
  season?: string | null;
  temperature?: string | number | null;
};

export type FateContext = {
  vibe: string;
  context: string;
  season: string;
  temperature: string;
  colorDirection?: string[];
  fitDirection?: string[];
  mood?: string;
  avoid?: string[];
  debug?: {
    topStyleTags: string[];
    topColors: string[];
    topFits: string[];
    inferredContexts: string[];
    selectedKey?: string;
    candidateCount?: number;
  };
};

export type FateModeOverrides = {
  variantIndex?: number;
  previous?: Pick<FateContext, 'vibe' | 'context' | 'season' | 'temperature'> | null;
  avoidKeys?: string[] | null;
};

const STYLE_SYNONYMS: Record<string, string> = {
  minimal: 'minimal',
  minimalist: 'minimal',
  clean: 'clean',
  refined: 'elevated',
  elevated: 'elevated',
  polished: 'elevated',
  tailored: 'elevated',
  sleek: 'sleek',
  monochrome: 'monochrome',
  neutral: 'neutral',
  neutrals: 'neutral',
  street: 'streetwear',
  streetwear: 'streetwear',
  sporty: 'sporty',
  athletic: 'sporty',
  active: 'sporty',
  relaxed: 'relaxed',
  oversized: 'relaxed',
  easy: 'relaxed',
  confident: 'confident',
  bold: 'bold',
  edgy: 'bold',
  classic: 'classic',
  timeless: 'classic',
  layered: 'layered',
  cozy: 'layered',
  masculine: 'masculine',
  soft: 'soft',
  romantic: 'soft',
  smart: 'smart-casual',
  'smart casual': 'smart-casual',
  'date night': 'date-night',
  office: 'office-ready',
};

const COLOR_SYNONYMS: Record<string, string> = {
  black: 'black',
  charcoal: 'charcoal',
  grey: 'gray',
  gray: 'gray',
  white: 'white',
  ivory: 'cream',
  cream: 'cream',
  beige: 'beige',
  taupe: 'taupe',
  stone: 'stone',
  tan: 'tan',
  camel: 'camel',
  brown: 'brown',
  espresso: 'espresso',
  navy: 'navy',
  blue: 'blue',
  denim: 'blue',
  olive: 'olive',
  green: 'green',
  sage: 'sage',
  red: 'red',
  burgundy: 'burgundy',
  pink: 'pink',
  yellow: 'yellow',
  orange: 'orange',
  purple: 'purple',
};

const FIT_SYNONYMS: Record<string, string> = {
  relaxed: 'relaxed',
  oversized: 'oversized',
  boxy: 'boxy',
  fitted: 'fitted',
  slim: 'slim',
  cropped: 'cropped',
  straight: 'straight',
  tapered: 'tapered',
  wide: 'wide-leg',
  'wide leg': 'wide-leg',
  bodycon: 'bodycon',
  structured: 'structured',
};

const OCCASION_SYNONYMS: Record<string, string> = {
  everyday: 'everyday',
  daily: 'everyday',
  errands: 'errands',
  errand: 'errands',
  class: 'class',
  school: 'class',
  work: 'office',
  office: 'office',
  business: 'office',
  meeting: 'office',
  dinner: 'dinner',
  date: 'date-night',
  'date night': 'date-night',
  evening: 'going-out',
  'night out': 'going-out',
  'going out': 'going-out',
  social: 'social',
  weekend: 'weekend',
  travel: 'travel',
  vacation: 'vacation',
  resort: 'vacation',
  holiday: 'vacation',
  beach: 'beach',
  pool: 'beach',
  gym: 'gym',
  workout: 'gym',
  athletic: 'gym',
  lounge: 'lounge',
  home: 'lounge',
  cozy: 'lounge',
  coffee: 'coffee-run',
  'coffee run': 'coffee-run',
  rainy: 'rainy-day',
  rain: 'rainy-day',
  'rainy day': 'rainy-day',
};

const DEFAULT_COLOR_DIRECTIONS: Record<string, string[]> = {
  minimal: ['black', 'cream', 'stone'],
  elevated: ['charcoal', 'cream', 'taupe'],
  streetwear: ['black', 'gray', 'olive'],
  sporty: ['gray', 'white', 'navy'],
  sleek: ['black', 'charcoal', 'white'],
};

function toArray<T>(value: MaybeArray<T>): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function flattenFitPrefs(value: FateProfile['fit_prefs'] | FatePreferences['fit_prefs']) {
  if (Array.isArray(value)) return value.map((entry) => String(entry || ''));
  if (!value || typeof value !== 'object') return [];
  return Object.values(value)
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .map((entry) => String(entry || ''));
}

export function normalizeTag(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  return normalized || '';
}

export function countTopValues(values: unknown[], limit = 3) {
  const counts = new Map<string, number>();
  for (const rawValue of values) {
    const value = normalizeTag(rawValue);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function mapWithDictionary(values: string[], dictionary: Record<string, string>) {
  return values
    .map((value) => dictionary[value] || value)
    .filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function rotateArray(values: string[], offset: number) {
  if (!values.length) return [];
  const safeOffset = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(safeOffset), ...values.slice(0, safeOffset)];
}

function pickVariant<T>({
  options,
  variantIndex = 0,
  previous,
  getKey,
}: {
  options: T[];
  variantIndex?: number;
  previous?: T | null;
  getKey: (value: T) => string;
}) {
  if (!options.length) return null;
  const safeIndex = ((variantIndex % options.length) + options.length) % options.length;
  let selected = options[safeIndex];

  if (previous && options.length > 1 && getKey(selected) === getKey(previous)) {
    selected = options[(safeIndex + 1) % options.length];
  }

  return selected;
}

function normalizeSeasons(values: MaybeArray<string>) {
  return toArray(values)
    .flatMap((entry) => String(entry || '').split(/[,\s/]+/))
    .map((entry) => normalizeTag(entry))
    .filter((entry) => ['spring', 'summer', 'fall', 'winter', 'all'].includes(entry));
}

function inferSeason(weather: FateWeatherInfo | undefined, wardrobe: FateWardrobeItem[]) {
  const weatherSeason = normalizeTag(weather?.season);
  if (['spring', 'summer', 'fall', 'winter', 'all'].includes(weatherSeason)) {
    return weatherSeason;
  }

  const topWardrobeSeason = countTopValues(
    wardrobe.flatMap((item) => normalizeSeasons(item.season)),
    1,
  )[0];

  return topWardrobeSeason || 'all';
}

function inferTemperature(weather: FateWeatherInfo | undefined, season: string) {
  const explicit = String(weather?.temperature ?? '').trim();
  if (explicit) return explicit;

  switch (season) {
    case 'winter':
      return '48';
    case 'fall':
      return '60';
    case 'summer':
      return '78';
    case 'spring':
      return '68';
    default:
      return '70';
  }
}

export function inferColorDirection(
  profile: FateProfile | null | undefined,
  preferences: FatePreferences | null | undefined,
  wardrobe: FateWardrobeItem[],
  styleSignals: string[],
) {
  const explicitColors = [
    ...toArray(profile?.color_prefs),
    ...toArray(preferences?.core_colors),
    ...toArray(preferences?.accent_colors),
  ].map((entry) => COLOR_SYNONYMS[normalizeTag(entry)] || normalizeTag(entry));

  const wardrobeColors = wardrobe.flatMap((item) => [
    item.primary_color,
    ...toArray(item.secondary_colors),
  ]).map((entry) => COLOR_SYNONYMS[normalizeTag(entry)] || normalizeTag(entry));

  const topColors = countTopValues([...explicitColors, ...wardrobeColors], 3);
  if (topColors.length) return topColors;

  const firstStyle = styleSignals[0] || 'minimal';
  return DEFAULT_COLOR_DIRECTIONS[firstStyle] || ['black', 'cream', 'gray'];
}

export function inferFitDirection(
  profile: FateProfile | null | undefined,
  preferences: FatePreferences | null | undefined,
  wardrobe: FateWardrobeItem[],
  styleSignals: string[],
) {
  const fitSignals = [
    ...flattenFitPrefs(profile?.fit_prefs),
    ...flattenFitPrefs(preferences?.fit_prefs),
    ...toArray(preferences?.silhouettes),
    ...wardrobe.flatMap((item) => [item.fit_type, item.silhouette]),
  ]
    .map((entry) => FIT_SYNONYMS[normalizeTag(entry)] || normalizeTag(entry))
    .filter(Boolean);

  const topFits = countTopValues(fitSignals, 3);
  const directions: string[] = [];

  if (topFits.includes('relaxed') || topFits.includes('oversized') || styleSignals.includes('relaxed')) {
    directions.push('relaxed top');
  }
  if (topFits.includes('wide-leg')) {
    directions.push('wide-leg bottom');
  } else if (topFits.includes('straight') || topFits.includes('tapered')) {
    directions.push('straight-leg bottom');
  }
  if (topFits.includes('fitted') || topFits.includes('slim')) {
    directions.push('fitted base');
  }
  if (styleSignals.includes('streetwear')) {
    directions.push('clean sneakers');
  } else if (styleSignals.includes('elevated') || styleSignals.includes('sleek')) {
    directions.push('clean silhouette');
  }

  return directions.length ? directions.slice(0, 3) : ['relaxed top', 'straight-leg bottom'];
}

function buildStyleSignalVariants(styleSignals: string[]) {
  const baseSignals = uniqueStrings(styleSignals.length ? styleSignals : ['clean', 'relaxed', 'minimal']);
  const fallbackSecondary = baseSignals[1] || 'relaxed';
  const variants = [
    baseSignals,
    uniqueStrings([baseSignals[0], baseSignals[2] || fallbackSecondary, ...baseSignals]),
    uniqueStrings([fallbackSecondary, baseSignals[0], ...baseSignals]),
    uniqueStrings([baseSignals[0], 'minimal', ...baseSignals]),
    uniqueStrings([baseSignals[0], 'elevated', ...baseSignals]),
  ];

  return uniqueStrings(variants.map((entry) => entry.join('|')))
    .map((entry) => entry.split('|').filter(Boolean))
    .filter((entry) => entry.length);
}

function buildColorDirectionCandidates(baseColors: string[], styleSignals: string[]) {
  const colors = uniqueStrings(baseColors.length ? baseColors : ['black', 'cream', 'gray']).slice(0, 3);
  const accent =
    styleSignals.includes('streetwear')
      ? 'olive'
      : styleSignals.includes('elevated') || styleSignals.includes('sleek')
        ? 'taupe'
        : styleSignals.includes('sporty')
          ? 'navy'
          : colors[2] || 'gray';

  const candidates = [
    colors,
    rotateArray(colors, 1),
    uniqueStrings([colors[0], colors[1] || colors[0], accent]).slice(0, 3),
  ];

  return uniqueStrings(candidates.map((entry) => entry.join('|')))
    .map((entry) => entry.split('|').filter(Boolean))
    .filter((entry) => entry.length);
}

function buildFitDirectionCandidates(baseFits: string[], styleSignals: string[]) {
  const fits = uniqueStrings(baseFits.length ? baseFits : ['relaxed top', 'straight-leg bottom']);
  const candidates = [
    fits,
    rotateArray(fits, 1),
    uniqueStrings([
      styleSignals.includes('elevated') ? 'clean silhouette' : fits[0],
      styleSignals.includes('streetwear') ? 'clean sneakers' : fits[1] || 'straight-leg bottom',
      styleSignals.includes('sporty') ? 'fitted base' : fits[2],
    ]).slice(0, 3),
  ];

  return uniqueStrings(candidates.map((entry) => entry.join('|')))
    .map((entry) => entry.split('|').filter(Boolean))
    .filter((entry) => entry.length);
}

function buildVibeCandidates({
  styleVariants,
  colorVariants,
  fitVariants,
}: {
  styleVariants: string[][];
  colorVariants: string[][];
  fitVariants: string[][];
}) {
  const candidates: string[] = [];

  styleVariants.slice(0, 5).forEach((styleVariant, index) => {
    const colorDirection = colorVariants[index % Math.max(colorVariants.length, 1)] || colorVariants[0] || ['black', 'cream', 'gray'];
    const fitDirection = fitVariants[index % Math.max(fitVariants.length, 1)] || fitVariants[0] || ['relaxed top', 'straight-leg bottom'];

    candidates.push(
      buildCompoundVibe({ styleSignals: styleVariant, colorDirection, fitDirection }),
      buildCompoundVibe({ styleSignals: rotateArray(styleVariant, 1), colorDirection, fitDirection }),
    );

    if (!styleVariant.includes('minimal')) {
      candidates.push(
        buildCompoundVibe({
          styleSignals: uniqueStrings([styleVariant[0], 'minimal', ...styleVariant]),
          colorDirection,
          fitDirection,
        }),
      );
    }

    if (!styleVariant.includes('elevated')) {
      candidates.push(
        buildCompoundVibe({
          styleSignals: uniqueStrings([styleVariant[0], 'elevated', ...styleVariant]),
          colorDirection,
          fitDirection,
        }),
      );
    }
  });

  return uniqueStrings(candidates.filter(Boolean));
}

type FateCandidate = {
  key: string;
  vibe: string;
  context: string;
  colorDirection: string[];
  fitDirection: string[];
  styleSignals: string[];
};

function buildFateCandidates({
  styleVariants,
  colorVariants,
  fitVariants,
  season,
  temperature,
  inferredContexts,
}: {
  styleVariants: string[][];
  colorVariants: string[][];
  fitVariants: string[][];
  season: string;
  temperature: string;
  inferredContexts: string[];
}) {
  const candidates: FateCandidate[] = [];

  styleVariants.slice(0, 5).forEach((styleVariant, index) => {
    const colorDirection = colorVariants[index % Math.max(colorVariants.length, 1)] || colorVariants[0] || ['black', 'cream', 'gray'];
    const fitDirection = fitVariants[index % Math.max(fitVariants.length, 1)] || fitVariants[0] || ['relaxed top', 'straight-leg bottom'];
    inferredContexts.slice(0, 4).forEach((occasion) => {
      const vibeOptions = uniqueStrings([
        buildOccasionVibe({ styleSignals: styleVariant, colorDirection, fitDirection, occasion, season, temperature }),
        buildOccasionVibe({
          styleSignals: rotateArray(styleVariant, 1),
          colorDirection,
          fitDirection,
          occasion,
          season,
          temperature,
        }),
        buildCompoundVibe({
          styleSignals: uniqueStrings([styleVariant[0] || 'clean', 'minimal', ...styleVariant]),
          colorDirection,
          fitDirection,
        }),
      ]).slice(0, 3);
      const contextOptions = buildContextCandidates({
        styleSignals: styleVariant,
        season,
        temperature,
        inferredContexts: [occasion, ...inferredContexts.filter((entry) => entry !== occasion)],
      }).slice(0, 3);

      vibeOptions.forEach((vibe) => {
        contextOptions.forEach((context) => {
          candidates.push({
            key: `${vibe}__${context}__${colorDirection.join(',')}__${fitDirection.join(',')}`,
            vibe,
            context,
            colorDirection,
            fitDirection,
            styleSignals: styleVariant,
          });
        });
      });
    });
  });

  return uniqueStrings(candidates.map((entry) => entry.key))
    .map((key) => candidates.find((entry) => entry.key === key)!)
    .filter(Boolean);
}

function inferContexts(
  preferences: FatePreferences | null | undefined,
  wardrobe: FateWardrobeItem[],
  styleSignals: string[],
  season: string,
  temperature: string,
) {
  const temp = Number(temperature);
  const contexts = [
    ...toArray(preferences?.preferred_occasions),
    ...wardrobe.flatMap((item) => toArray(item.occasion_tags)),
  ]
    .map((entry) => OCCASION_SYNONYMS[normalizeTag(entry)] || normalizeTag(entry))
    .filter(Boolean);

  if (styleSignals.includes('date-night') || styleSignals.includes('elevated') || styleSignals.includes('sleek')) {
    contexts.push('date-night', 'dinner', 'going-out');
  }
  if (styleSignals.includes('office-ready') || styleSignals.includes('smart-casual') || styleSignals.includes('classic')) {
    contexts.push('office');
  }
  if (styleSignals.includes('sporty')) {
    contexts.push('gym', 'errands', 'weekend');
  }
  if (styleSignals.includes('streetwear') || styleSignals.includes('relaxed')) {
    contexts.push('class', 'errands', 'weekend', 'everyday');
  }
  if (season === 'summer' || temp >= 75) {
    contexts.push('social', 'weekend');
    if (contexts.includes('travel') || contexts.includes('vacation')) {
      contexts.push('vacation', 'beach');
    }
  } else if ((season === 'fall' || season === 'winter') && temp <= 62) {
    contexts.push('rainy-day', 'coffee-run', 'errands');
  } else {
    contexts.push('everyday', 'weekend');
  }

  return countTopValues(contexts, 6);
}

function buildStyleAddon(styleSignals: string[], colorDirection: string[]) {
  if (styleSignals.includes('streetwear') && styleSignals.includes('minimal')) {
    return 'with minimalist basics';
  }
  if (styleSignals.includes('sporty') && styleSignals.includes('elevated')) {
    return 'with a polished edge';
  }
  if (styleSignals.includes('neutral') || colorDirection.every((entry) => ['black', 'white', 'cream', 'gray', 'stone', 'taupe', 'olive'].includes(entry))) {
    return 'with neutral basics';
  }
  if (styleSignals.includes('monochrome') || colorDirection.slice(0, 2).every((entry) => ['black', 'charcoal', 'white', 'gray'].includes(entry))) {
    return 'with a monochrome lean';
  }
  return '';
}

export function buildCompoundVibe({
  styleSignals,
  colorDirection,
  fitDirection,
}: {
  styleSignals: string[];
  colorDirection: string[];
  fitDirection: string[];
}) {
  const primary = styleSignals[0] || 'clean';
  const secondary = styleSignals[1] || 'relaxed';
  const addon = buildStyleAddon(styleSignals, colorDirection);

  if (primary === 'elevated' && (styleSignals.includes('sleek') || styleSignals.includes('monochrome'))) {
    return 'elevated sleek monochrome styling';
  }
  if (primary === 'streetwear' && styleSignals.includes('relaxed')) {
    return `clean relaxed streetwear ${addon}`.trim();
  }
  if (primary === 'sporty' && styleSignals.includes('elevated')) {
    return 'sporty casual with a polished edge';
  }
  if (primary === 'minimal' && styleSignals.includes('layered')) {
    return 'minimal layered everyday wear';
  }
  if (primary === 'soft' && styleSignals.includes('masculine')) {
    return 'soft masculine earth-tone casual';
  }

  const phrase = [primary, secondary, addon].filter(Boolean).join(' ');
  return phrase.replace(/\s+/g, ' ').trim() || 'clean relaxed everyday basics';
}

function buildOccasionVibe({
  styleSignals,
  colorDirection,
  fitDirection,
  occasion,
  season,
  temperature,
}: {
  styleSignals: string[];
  colorDirection: string[];
  fitDirection: string[];
  occasion: string;
  season: string;
  temperature: string;
}) {
  const temp = Number(temperature);
  const base = buildCompoundVibe({ styleSignals, colorDirection, fitDirection });

  switch (occasion) {
    case 'date-night':
      return styleSignals.includes('elevated') || styleSignals.includes('sleek')
        ? 'elevated date-night dressing'
        : 'clean evening dressing with an elevated edge';
    case 'dinner':
      return styleSignals.includes('elevated')
        ? 'smart casual dinner dressing'
        : 'put-together dinner-ready casual';
    case 'going-out':
      return styleSignals.includes('streetwear')
        ? 'clean going-out streetwear'
        : 'polished going-out dressing';
    case 'office':
      return styleSignals.includes('minimal')
        ? 'clean smart-casual workwear'
        : 'polished office-ready dressing';
    case 'travel':
      return temp >= 74 || season === 'summer'
        ? 'easy travel-ready warm-weather dressing'
        : 'comfortable travel-ready layers';
    case 'vacation':
      return 'vacation-ready warm-weather casual';
    case 'beach':
      return 'easy beach-day warm-weather wear';
    case 'rainy-day':
      return 'layered rainy-day casual';
    case 'gym':
      return 'sporty active off-duty wear';
    case 'lounge':
      return 'soft off-duty lounge layers';
    case 'coffee-run':
      return 'easy layered coffee-run casual';
    case 'class':
      return styleSignals.includes('streetwear')
        ? 'clean class-day streetwear'
        : 'easy class-day casual';
    case 'errands':
      return styleSignals.includes('minimal')
        ? 'clean everyday errand dressing'
        : 'off-duty errands casual';
    case 'social':
      return 'put-together casual social dressing';
    case 'weekend':
      return 'polished off-duty weekend wear';
    case 'everyday':
      return styleSignals.includes('streetwear')
        ? 'clean relaxed everyday streetwear'
        : styleSignals.includes('minimal')
          ? 'minimal everyday basics'
          : base;
    default:
      return base;
  }
}

export function buildRichContext({
  styleSignals,
  season,
  temperature,
  inferredContexts,
}: {
  styleSignals: string[];
  season: string;
  temperature: string;
  inferredContexts: string[];
}) {
  return buildOccasionContext({
    occasion: inferredContexts[0] || 'everyday',
    styleSignals,
    season,
    temperature,
  });
}

function buildOccasionContext({
  occasion,
  styleSignals,
  season,
  temperature,
}: {
  occasion: string;
  styleSignals: string[];
  season: string;
  temperature: string;
}) {
  const temp = Number(temperature);
  const warm = season === 'summer' || temp >= 76;
  const cool = season === 'fall' || season === 'winter' || temp <= 60;

  switch (occasion) {
    case 'date-night':
      return 'slightly elevated outfit for dinner, drinks, or a date night out';
    case 'dinner':
      return 'smart casual dinner look that feels polished without being overdressed';
    case 'going-out':
      return 'going-out look that feels intentional for dinner, drinks, or a night out';
    case 'office':
      return 'work-ready outfit for the office or meetings that still feels easy';
    case 'travel':
      return 'comfortable travel look for transit, long days, and easy city walking';
    case 'vacation':
      return warm
        ? 'vacation-ready outfit for sightseeing, resort dinners, or easy warm-weather days'
        : 'travel-friendly vacation outfit that still feels relaxed and polished';
    case 'beach':
      return 'light beach-day outfit for warm weather, boardwalk time, or post-beach food';
    case 'rainy-day':
      return 'layered rainy-day outfit for errands, coffee runs, and staying put together';
    case 'gym':
      return 'sporty off-duty look for movement, errands, or an active day';
    case 'lounge':
      return 'easy off-duty outfit for staying in, stepping out briefly, or a slow day';
    case 'coffee-run':
      return cool
        ? 'layered daytime outfit for coffee runs, errands, and cooler weather'
        : 'easy daytime outfit for coffee, errands, and a casual reset';
    case 'class':
      return 'easy daytime outfit for class, errands, or hanging out after';
    case 'errands':
      return cool
        ? 'practical everyday fit for errands and cooler-weather movement'
        : 'easy everyday outfit for errands, coffee, or a casual afternoon out';
    case 'social':
      return warm
        ? 'warm-weather social fit that feels put together but easy'
        : 'put-together casual look for a social plan without feeling overdone';
    case 'weekend':
      return 'put-together casual fit for a weekend hang, coffee, or a relaxed dinner';
    case 'everyday':
    default:
      if (styleSignals.includes('streetwear') || styleSignals.includes('relaxed')) {
        return 'clean everyday outfit for class, errands, or a chill afternoon out';
      }
      return 'clean everyday outfit that feels easy, put together, and wearable';
  }
}

function buildContextCandidates({
  styleSignals,
  season,
  temperature,
  inferredContexts,
}: {
  styleSignals: string[];
  season: string;
  temperature: string;
  inferredContexts: string[];
}) {
  const occasionCandidates = inferredContexts.length ? inferredContexts : ['everyday'];
  const candidates = occasionCandidates.slice(0, 4).flatMap((occasion) => {
    const primary = buildOccasionContext({ occasion, styleSignals, season, temperature });
    const alternates = [primary];

    if (occasion === 'date-night' || occasion === 'dinner' || occasion === 'going-out') {
      alternates.push(
        'evening-ready outfit that feels elevated without trying too hard',
        'polished night-out fit for dinner, drinks, or a social evening',
      );
    } else if (occasion === 'vacation' || occasion === 'beach' || occasion === 'travel') {
      alternates.push(
        'easy travel-minded look that stays comfortable but still looks intentional',
        'warm-weather outfit that can move from daytime plans into an easy dinner',
      );
    } else if (occasion === 'rainy-day' || occasion === 'coffee-run' || occasion === 'errands') {
      alternates.push(
        'layered everyday fit that feels practical for movement and changing weather',
        'easy day look for errands, coffee, and staying put together on the go',
      );
    } else if (occasion === 'office' || occasion === 'class') {
      alternates.push(
        'clean daytime outfit that feels polished enough for structure but easy enough to wear all day',
        'put-together daily look for a scheduled day without feeling too formal',
      );
    } else {
      alternates.push(
        'easy everyday outfit that still feels intentional and put together',
        'casual daytime fit that works for plans, movement, and staying comfortable',
      );
    }

    return alternates;
  });

  return uniqueStrings(candidates.map((entry) => entry.replace(/\s+/g, ' ').trim()));
}

export function inferAvoidList({
  styleSignals,
  season,
  temperature,
  colorDirection,
}: {
  styleSignals: string[];
  season: string;
  temperature: string;
  colorDirection: string[];
}) {
  const temp = Number(temperature);
  const avoid = new Set<string>();

  if (temp >= 74 || season === 'summer') {
    avoid.add('duplicate heavy layers');
    avoid.add('heavy outerwear');
  }
  if (temp <= 52 || season === 'winter') {
    avoid.add('sandals in cold weather');
  }
  if (styleSignals.includes('minimal') || styleSignals.includes('elevated') || colorDirection.length <= 3) {
    avoid.add('excessive color clash');
    avoid.add('conflicting patterns');
  }
  if (styleSignals.includes('sporty') || styleSignals.includes('streetwear')) {
    avoid.add('overly formal pieces');
  }

  return [...avoid].slice(0, 4);
}

function buildMood(styleSignals: string[], colorDirection: string[]) {
  if (styleSignals.includes('elevated')) return 'sharp';
  if (styleSignals.includes('streetwear')) return 'grounded';
  if (styleSignals.includes('sporty')) return 'active';
  if (colorDirection.some((entry) => ['olive', 'beige', 'brown', 'taupe'].includes(entry))) return 'earthy';
  return 'clean';
}

export function buildFateContext({
  profile,
  preferences,
  wardrobe,
  weather,
  modeOverrides,
}: {
  profile?: FateProfile | null;
  preferences?: FatePreferences | null;
  wardrobe?: FateWardrobeItem[] | null;
  weather?: FateWeatherInfo | null;
  modeOverrides?: FateModeOverrides | null;
}): FateContext {
  const wardrobeItems = Array.isArray(wardrobe) ? wardrobe : [];
  const rawStyleSignals = [
    ...toArray(profile?.style_tags),
    ...toArray(preferences?.primary_vibes),
    ...toArray(preferences?.keywords),
    ...wardrobeItems.flatMap((item) => toArray(item.vibe_tags)),
  ]
    .map((entry) => STYLE_SYNONYMS[normalizeTag(entry)] || normalizeTag(entry))
    .filter(Boolean);

  const styleSignals = countTopValues(rawStyleSignals, 4);
  const season = inferSeason(weather || undefined, wardrobeItems);
  const temperature = inferTemperature(weather || undefined, season);
  const baseColorDirection = inferColorDirection(profile, preferences, wardrobeItems, styleSignals);
  const baseFitDirection = inferFitDirection(profile, preferences, wardrobeItems, styleSignals);
  const inferredContexts = inferContexts(preferences, wardrobeItems, styleSignals, season, temperature);
  const variantIndex = Math.max(0, Number(modeOverrides?.variantIndex || 0));
  const styleVariants = buildStyleSignalVariants(styleSignals);
  const colorVariants = buildColorDirectionCandidates(baseColorDirection, styleSignals);
  const fitVariants = buildFitDirectionCandidates(baseFitDirection, styleSignals);
  const allCandidates = buildFateCandidates({
    styleVariants,
    colorVariants,
    fitVariants,
    season,
    temperature,
    inferredContexts,
  });
  const previousKey = modeOverrides?.previous
    ? `${modeOverrides.previous.vibe}__${modeOverrides.previous.context}`
    : null;
  const avoidKeys = new Set((modeOverrides?.avoidKeys || []).filter(Boolean));
  const filteredCandidates = allCandidates.filter((entry) => !avoidKeys.has(entry.key));
  const selectedCandidate =
    pickVariant({
      options: filteredCandidates.length ? filteredCandidates : allCandidates,
      variantIndex,
      previous: previousKey
        ? allCandidates.find((entry) => entry.key.startsWith(previousKey)) || null
        : null,
      getKey: (value) => value.key,
    }) || allCandidates[0] || {
      vibe: 'clean relaxed everyday basics',
      context: 'clean everyday outfit for a chill afternoon out',
      colorDirection: baseColorDirection,
      fitDirection: baseFitDirection,
      styleSignals: styleSignals.length ? styleSignals : ['clean', 'relaxed'],
      key: 'fallback',
    };
  const topFits = countTopValues(
    [
      ...flattenFitPrefs(profile?.fit_prefs),
      ...flattenFitPrefs(preferences?.fit_prefs),
      ...toArray(preferences?.silhouettes),
      ...wardrobeItems.flatMap((item) => [item.fit_type, item.silhouette]),
    ].map((entry) => FIT_SYNONYMS[normalizeTag(entry)] || normalizeTag(entry)),
    3,
  );

  return {
    vibe: selectedCandidate.vibe || 'clean relaxed everyday basics',
    context: selectedCandidate.context,
    season,
    temperature,
    colorDirection: selectedCandidate.colorDirection,
    fitDirection: selectedCandidate.fitDirection,
    mood: buildMood(selectedCandidate.styleSignals, selectedCandidate.colorDirection),
    avoid: inferAvoidList({
      styleSignals: selectedCandidate.styleSignals,
      season,
      temperature,
      colorDirection: selectedCandidate.colorDirection,
    }),
    debug: {
      topStyleTags: selectedCandidate.styleSignals,
      topColors: selectedCandidate.colorDirection,
      topFits,
      inferredContexts,
      selectedKey: selectedCandidate.key,
      candidateCount: allCandidates.length,
    },
  };
}
