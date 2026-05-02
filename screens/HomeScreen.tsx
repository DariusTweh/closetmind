// Legacy landing screen retained for rollback safety.
import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, View, Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { apiPost } from '../lib/api';
import { toStyleRequestWardrobeItem, toStyleRequestWardrobeList } from '../lib/styleRequestWardrobe';
import { fetchStyleContextSignals } from '../lib/styleProfile';
import { supabase } from '../lib/supabase';
import { buildFateContext } from '../utils/buildFateContext';
import {
  buildDashboardRegenerationRequest,
  clearDashboardCache,
  extractDailyFitSummary,
  fetchDailyFitForUser,
  getRecentWardrobeItems,
  mapGeneratedOutfitToWardrobe,
  mapDailyFitItems,
  maybeRefreshUserLocation,
  persistManualDailyFit,
  persistDashboardCache,
  readDashboardCache,
  resolveCurrentUserId,
} from '../lib/closetDashboard';

import TodayFitCard from '../components/home/TodayFitCard';
import RecentlyAddedRow from '../components/home/RecentlyAddedRow';
import StyleThisItemCard from '../components/home/StyleThisItemCard';
import StorePicksRow from '../components/home/StorePicksRow';

const CORE_HOME_WARDROBE_FIELDS = [
  'id',
  'name',
  'type',
  'main_category',
  'primary_color',
  'secondary_colors',
  'pattern_description',
  'vibe_tags',
  'season',
  'image_url',
  'source_type',
  'wardrobe_status',
  'created_at',
];
const HOME_REQUIRED_MEDIA_FIELDS = [
  'image_path',
  'cutout_image_url',
  'original_image_url',
];
const HOME_MEDIA_FIELDS = [
  'thumbnail_url',
  'display_image_url',
  'cutout_thumbnail_url',
  'cutout_display_url',
];
const OPTIONAL_HOME_STYLE_FIELDS = [
  'subcategory',
  'garment_function',
  'fabric_weight',
  'style_role',
  'material_guess',
  'silhouette',
  'weather_use',
  'occasion_tags',
  'fit',
  'fit_notes',
];
const HOME_WARDROBE_SELECT_FIELDS = [
  ...CORE_HOME_WARDROBE_FIELDS,
  ...HOME_REQUIRED_MEDIA_FIELDS,
  ...HOME_MEDIA_FIELDS,
  ...OPTIONAL_HOME_STYLE_FIELDS,
].join(', ');
const HOME_WARDROBE_MEDIA_ONLY_SELECT_FIELDS = [
  ...CORE_HOME_WARDROBE_FIELDS,
  ...HOME_REQUIRED_MEDIA_FIELDS,
  ...HOME_MEDIA_FIELDS,
].join(', ');
const HOME_WARDROBE_PATH_ONLY_SELECT_FIELDS = [
  ...CORE_HOME_WARDROBE_FIELDS,
  ...HOME_REQUIRED_MEDIA_FIELDS,
].join(', ');
const HOME_WARDROBE_MINIMAL_SELECT_FIELDS = [
  ...CORE_HOME_WARDROBE_FIELDS,
  'image_path',
].join(', ');
const HOME_WARDROBE_QUERY_ATTEMPTS = [
  { select: HOME_WARDROBE_SELECT_FIELDS, excludeScannedCandidates: true },
  { select: HOME_WARDROBE_MEDIA_ONLY_SELECT_FIELDS, excludeScannedCandidates: true },
  { select: HOME_WARDROBE_PATH_ONLY_SELECT_FIELDS, excludeScannedCandidates: true },
  { select: HOME_WARDROBE_MINIMAL_SELECT_FIELDS, excludeScannedCandidates: true },
  { select: HOME_WARDROBE_MINIMAL_SELECT_FIELDS, excludeScannedCandidates: false },
];

const isMissingSchemaError = (error: any) => {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the') ||
    normalized.includes('schema cache') ||
    normalized.includes('column') ||
    normalized.includes('relation')
  );
};

const parseMissingWardrobeColumn = (error: any) => {
  const message = String(error?.message || error?.details || error || '');
  const matches = [
    message.match(/column\s+wardrobe\.([a-zA-Z0-9_]+)\s+does not exist/i),
    message.match(/column\s+([a-zA-Z0-9_]+)\s+does not exist/i),
    message.match(/Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i),
  ];

  for (const match of matches) {
    const column = match?.[1]?.trim();
    if (column) return column;
  }

  return null;
};

const removeSelectColumn = (selectFields: string, columnName: string) => {
  const nextFields = selectFields
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
    .filter((field) => field !== columnName);

  if (!nextFields.length || nextFields.length === selectFields.split(',').filter(Boolean).length) {
    return null;
  }

  return nextFields.join(', ');
};

const pickOnePerCategory = (items) => {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const cat = (it.main_category || '').toLowerCase();
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    out.push(it);
  }
  return out;
};

const toNumericTemperature = (value) => {
  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  const parsed = Number(match?.[0]);
  return Number.isFinite(parsed) ? parsed : 72;
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [homeUserId, setHomeUserId] = useState<string | null>(null);
  const [wardrobe, setWardrobe] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [outfit, setOutfit] = useState([]);
  const [outfitWeather, setOutfitWeather] = useState(null);
  const [outfitLocation, setOutfitLocation] = useState(null);
  const [focusItem, setFocusItem] = useState(null);
  const [focusStyleSeed, setFocusStyleSeed] = useState(null);
  const [outfitSuggestions, setOutfitSuggestions] = useState([]);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);

  const mountedRef = useRef(true);
  const styleContextRef = useRef({ profile: null, preferences: null });

  useEffect(() => {
    mountedRef.current = true;
    bootstrap();
    return () => { mountedRef.current = false; };
  }, []);

  const buildProfileDrivenSeed = (wardrobeData) =>
    buildFateContext({
      profile: styleContextRef.current.profile,
      preferences: styleContextRef.current.preferences,
      wardrobe: wardrobeData,
      weather: {
        temperature: toNumericTemperature(outfitWeather),
      },
    });

  const bootstrap = async () => {
    let userId;
    try {
      userId = await resolveCurrentUserId();
    } catch {}

    if (!userId) return;
    setHomeUserId(userId);

    const cached = await readDashboardCache(userId);
    if (cached?.outfit) setOutfit(cached.outfit);
    if (cached?.outfitWeather) setOutfitWeather(cached.outfitWeather);
    if (cached?.outfitLocation) setOutfitLocation(cached.outfitLocation);
    if (cached?.focusItem) setFocusItem(cached.focusItem);
    if (cached?.outfitSuggestions) setOutfitSuggestions(cached.outfitSuggestions);

    maybeRefreshUserLocation(userId).catch(() => {});

    try {
      const [wardrobeData, dailyFit, styleSignals] = await Promise.all([
        fetchWardrobe(userId),
        fetchDailyFitForUser(userId),
        fetchStyleContextSignals(userId).catch(() => ({ profile: null, preferences: null })),
      ]);

      if (!mountedRef.current) return;

      styleContextRef.current = styleSignals;

      if (!wardrobeData.length) {
        setWardrobe([]);
        setRecentItems([]);
        setFocusItem(null);
        setFocusStyleSeed(null);
        setOutfitSuggestions([]);
        await clearDashboardCache(userId);
        return;
      }

      setWardrobe(wardrobeData);
      setRecentItems(getRecentWardrobeItems(wardrobeData, 10));

      if (dailyFit) {
        const matched = mapDailyFitItems(dailyFit, wardrobeData);
        const {
          outfitWeather: nextWeather,
          outfitLocation: nextLocation,
        } = extractDailyFitSummary(dailyFit);
        setOutfit(matched);
        setOutfitWeather(nextWeather);
        setOutfitLocation(nextLocation);
        persistDashboardCache(userId, {
          outfit: matched,
          outfitWeather: nextWeather,
          outfitLocation: nextLocation,
        });
      } else {
        setOutfit([]);
        setOutfitWeather(null);
        setOutfitLocation(null);
      }

      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => lazyBuildStyleSuggestion(wardrobeData, userId), 300);
      });
    } catch (e) {
      console.warn('Home bootstrap error:', e.message);
    }
  };

  const fetchWardrobe = async (userId) => {
    const runWardrobeQuery = async (selectFields, excludeScannedCandidates = true) => {
      let query = supabase
        .from('wardrobe')
        .select(selectFields)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (excludeScannedCandidates) {
        query = query.neq('wardrobe_status', 'scanned_candidate');
      }

      return query;
    };

    let data = null;
    let error = null;

    for (const attempt of HOME_WARDROBE_QUERY_ATTEMPTS) {
      let selectFields = attempt.select;
      const removedColumns = new Set<string>();

      while (selectFields) {
        const response = await runWardrobeQuery(
          selectFields,
          attempt.excludeScannedCandidates,
        );
        data = response.data;
        error = response.error;

        if (!error) break;
        if (!isMissingSchemaError(error)) break;

        const missingColumn = parseMissingWardrobeColumn(error);
        if (!missingColumn || removedColumns.has(missingColumn)) break;

        const nextSelectFields = removeSelectColumn(selectFields, missingColumn);
        if (!nextSelectFields) break;

        removedColumns.add(missingColumn);
        selectFields = nextSelectFields;
      }

      if (!error) break;
      if (!isMissingSchemaError(error)) break;
    }

    if (error) throw new Error(error.message);
    return data || [];
  };

  const fetchGeneratedOutfit = async (wardrobeData) => {
    const request = buildDashboardRegenerationRequest({
      outfitWeather,
      outfitLocation,
      currentOutfit: outfit,
      wardrobe: wardrobeData,
    });

    try {
      const res = await apiPost('/generate-multistep-outfit', request);
      if (!res.ok) return { items: [], request };
      const data = await res.json().catch(() => null);
      return {
        items: mapGeneratedOutfitToWardrobe(data, wardrobeData),
        request,
      };
    } catch {
      return { items: [], request };
    }
  };

  const fetchStyleSuggestions = async (
    item,
    wardrobeData,
    ctx: { vibe?: string; context?: string; season?: string; temperature?: number } = {}
  ) => {
    const {
      vibe = '',
      context = '',
      season = 'all',
      temperature = 72,
    } = ctx;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await apiPost('/style-single-item', {
        vibe, context, season, temperature,
        locked_item: toStyleRequestWardrobeItem(item),
        wardrobe: toStyleRequestWardrobeList(wardrobeData),
        count: 1,
      }, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) return [];

      const data = await res.json();
      if (!data || !Array.isArray(data.outfit)) return [];

      const matchedItemsRaw = data.outfit.map((o) => {
        const match = wardrobeData.find((w) => w.id === o.id);
        return match ? { ...match, reason: o.reason } : null;
      }).filter(Boolean);

      const withLockedFirst = (() => {
        const hasLocked = matchedItemsRaw.some(x => x.id === item.id);
        const arr = hasLocked ? matchedItemsRaw : [{ ...item, reason: 'Anchor piece' }, ...matchedItemsRaw];
        return pickOnePerCategory(arr);
      })();

      return [{ items: withLockedFirst.filter(x => x.id !== item.id), reason: "Here's a fit that pairs well with your selected item." }];
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  };

  const lazyBuildStyleSuggestion = async (wardrobeData,userId) => {
    if (!wardrobeData.length) return;
    setStyleLoading(true);
    const randomItem = wardrobeData[Math.floor(Math.random() * wardrobeData.length)];
    const nextSeed = buildProfileDrivenSeed(wardrobeData);
    setFocusItem(randomItem);
    setFocusStyleSeed(nextSeed);
    const suggestions = await fetchStyleSuggestions(randomItem, wardrobeData, {
      vibe: nextSeed.vibe,
      context: nextSeed.context,
      season: nextSeed.season,
      temperature: toNumericTemperature(nextSeed.temperature),
    });
    if (!mountedRef.current) return;
    setOutfitSuggestions(suggestions);
    setStyleLoading(false);
    persistDashboardCache(userId, { focusItem: randomItem, outfitSuggestions: suggestions });
  };

  const handleRegenerate = async () => {
    if (!homeUserId || !wardrobe.length || outfitLoading) return;
    setOutfitLoading(true);
    try {
      const { items: regenerated, request } = await fetchGeneratedOutfit(wardrobe);
      const nextOutfit = regenerated.length ? regenerated : outfit;
      setOutfit(nextOutfit);
      await persistDashboardCache(homeUserId, {
        outfit: nextOutfit,
        outfitWeather,
        outfitLocation,
      });

      if (regenerated.length) {
        await persistManualDailyFit({
          userId: homeUserId,
          items: regenerated,
          outfitWeather,
          outfitLocation,
          context: request?.context ?? null,
        });
      }
    } finally {
      setOutfitLoading(false);
    }
  };

  const handlePullNewItem = async () => {
    if (!homeUserId || !recentItems.length) return;
    setStyleLoading(true);
    const newItem = recentItems[Math.floor(Math.random() * recentItems.length)];
    const nextSeed = buildProfileDrivenSeed(wardrobe);
    setFocusItem(newItem);
    setFocusStyleSeed(nextSeed);
    const suggestions = await fetchStyleSuggestions(newItem, wardrobe, {
      vibe: nextSeed.vibe,
      context: nextSeed.context,
      season: nextSeed.season,
      temperature: toNumericTemperature(nextSeed.temperature),
    });
    if (!mountedRef.current) return;
    setOutfitSuggestions(suggestions);
    setStyleLoading(false);
    persistDashboardCache(homeUserId, { focusItem: newItem, outfitSuggestions: suggestions });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeHeader}>
          <Text style={styles.welcomeText}>👋 Welcome back</Text>
          <Text style={styles.weatherText}>
            Today's weather: {outfitWeather || '-'}{outfitLocation ? `, ${outfitLocation}` : ''}
          </Text>
        </View>

        <TodayFitCard
          outfit={outfit}
          weather={outfitWeather || '—'}
          location={outfitLocation || '—'}
          loading={outfitLoading}
          onRegenerate={handleRegenerate}
        />

        <RecentlyAddedRow items={recentItems} />

        <StyleThisItemCard
          item={focusItem}
          suggestions={outfitSuggestions}
          loading={styleLoading}
          onPullNew={handlePullNewItem}
          onOpenStyle={() => {
            if (focusItem?.id) {
              navigation.navigate('StyleItemScreen', {
                item: focusItem,
                initialVibe: focusStyleSeed?.vibe || '',
                initialContext: focusStyleSeed?.context || '',
                initialSeason: focusStyleSeed?.season || 'all',
                initialTemperature: focusStyleSeed?.temperature || '72',
              });
            }
          }}
        />

        <StorePicksRow
          picks={[
            {
              id: '1',
              name: 'Beige Zip-Up Hoodie',
              image_url: 'https://i.imgur.com/dZ0gASb.png',
              link: 'https://www.asos.com/',
            },
            {
              id: '2',
              name: 'Chunky White Sneakers',
              image_url: 'https://i.imgur.com/yKwpj3N.png',
              link: 'https://www.asos.com/',
            },
          ]}
        />

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 20, backgroundColor: '#fff' },
  welcomeHeader: { marginBottom: 24 },
  welcomeText: { fontSize: 22, fontWeight: '700', color: '#111' },
  weatherText: { fontSize: 14, color: '#555', marginTop: 4 },
});
