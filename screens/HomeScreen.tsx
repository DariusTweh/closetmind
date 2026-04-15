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
import { supabase } from '../lib/supabase';
import {
  buildDashboardRegenerationRequest,
  clearDashboardCache,
  extractDailyFitSummary,
  fetchDailyFitForUser,
  getRecentWardrobeItems,
  mapDailyFitItems,
  maybeRefreshUserLocation,
  persistDashboardCache,
  readDashboardCache,
  resolveCurrentUserId,
} from '../lib/closetDashboard';

import TodayFitCard from '../components/home/TodayFitCard';
import RecentlyAddedRow from '../components/home/RecentlyAddedRow';
import StyleThisItemCard from '../components/home/StyleThisItemCard';
import StorePicksRow from '../components/home/StorePicksRow';

const BASE_HOME_WARDROBE_FIELDS = [
  'id',
  'user_id',
  'name',
  'type',
  'main_category',
  'primary_color',
  'secondary_colors',
  'pattern_description',
  'vibe_tags',
  'season',
  'image_url',
  'created_at',
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
const OPTIONAL_HOME_MEDIA_FIELDS = ['image_path'];
const OPTIONAL_HOME_STATUS_FIELDS = ['wardrobe_status'];
const HOME_WARDROBE_SELECT_FIELDS = [
  ...BASE_HOME_WARDROBE_FIELDS,
  ...OPTIONAL_HOME_STYLE_FIELDS,
  ...OPTIONAL_HOME_MEDIA_FIELDS,
  ...OPTIONAL_HOME_STATUS_FIELDS,
].join(', ');
const HOME_STATUS_WARDROBE_SELECT_FIELDS = [
  ...BASE_HOME_WARDROBE_FIELDS,
  ...OPTIONAL_HOME_STYLE_FIELDS,
  ...OPTIONAL_HOME_STATUS_FIELDS,
].join(', ');
const LEGACY_HOME_WARDROBE_SELECT_FIELDS = BASE_HOME_WARDROBE_FIELDS.join(', ');

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

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [homeUserId, setHomeUserId] = useState<string | null>(null);
  const [wardrobe, setWardrobe] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [outfit, setOutfit] = useState([]);
  const [outfitWeather, setOutfitWeather] = useState(null);
  const [outfitLocation, setOutfitLocation] = useState(null);
  const [focusItem, setFocusItem] = useState(null);
  const [outfitSuggestions, setOutfitSuggestions] = useState([]);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    bootstrap();
    return () => { mountedRef.current = false; };
  }, []);
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
    const [wardrobeData, dailyFit] = await Promise.all([
      fetchWardrobe(userId),
      fetchDailyFitForUser(userId),
    ]);

    if (!mountedRef.current) return;

    // STEP 2: clear cache if no wardrobe items
    if (!wardrobeData.length) {
      setWardrobe([]);
      setRecentItems([]);
      setFocusItem(null);
      setOutfitSuggestions([]);
      await clearDashboardCache(userId);
      return; // stop here, nothing to display
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

    // Lazy style suggestions
    if (wardrobeData.length) {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => lazyBuildStyleSuggestion(wardrobeData, userId), 300);
      });
    }
  } catch (e) {
    console.warn('Home bootstrap error:', e.message);
  }
};

  const fetchWardrobe = async (userId) => {
    let { data, error } = await supabase
      .from('wardrobe')
      .select(HOME_WARDROBE_SELECT_FIELDS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      const fallbackResponse = await supabase
        .from('wardrobe')
        .select(HOME_STATUS_WARDROBE_SELECT_FIELDS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      data = fallbackResponse.data;
      error = fallbackResponse.error;
    }

    if (error) {
      const fallbackResponse = await supabase
        .from('wardrobe')
        .select(LEGACY_HOME_WARDROBE_SELECT_FIELDS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      data = fallbackResponse.data;
      error = fallbackResponse.error;
    }

    if (error) throw new Error(error.message);
    return (data || []).filter((item: any) => item?.wardrobe_status !== 'scanned_candidate');
  };

  const fetchGeneratedOutfit = async (wardrobeData) => {
    try {
      const request = buildDashboardRegenerationRequest({
        outfitWeather,
        outfitLocation,
        currentOutfit: outfit,
        wardrobe: wardrobeData,
      });
      const res = await apiPost('/generate-multistep-outfit', request);
      if (!res.ok) return [];
      const data = await res.json();
      return wardrobeData.filter(item =>
        data.outfit?.some(o => o.id === item.id)
      );
    } catch {
      return [];
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
    setFocusItem(randomItem);
    const suggestions = await fetchStyleSuggestions(randomItem, wardrobeData);
    if (!mountedRef.current) return;
    setOutfitSuggestions(suggestions);
    setStyleLoading(false);
    persistDashboardCache(userId, { focusItem: randomItem, outfitSuggestions: suggestions });
  };

  const handleRegenerate = async () => {
    if (!homeUserId || !wardrobe.length) return;
    setOutfitLoading(true);
    setOutfit([]);
    const regenerated = await fetchGeneratedOutfit(wardrobe);
    setOutfit(regenerated);
    setOutfitLoading(false);
    persistDashboardCache(homeUserId, { outfit: regenerated });
  };

  const handlePullNewItem = async () => {
    if (!homeUserId || !recentItems.length) return;
    setStyleLoading(true);
    const newItem = recentItems[Math.floor(Math.random() * recentItems.length)];
    setFocusItem(newItem);
    const suggestions = await fetchStyleSuggestions(newItem, wardrobe);
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
              navigation.navigate('StyleItemScreen', { item: focusItem });
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
