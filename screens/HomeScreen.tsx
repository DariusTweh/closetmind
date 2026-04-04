import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, View, Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { supabase } from '../lib/supabase';

import TodayFitCard from '../components/home/TodayFitCard';
import RecentlyAddedRow from '../components/home/RecentlyAddedRow';
import StyleThisItemCard from '../components/home/StyleThisItemCard';
import StorePicksRow from '../components/home/StorePicksRow';
const getCacheKey = (uid: string) => `home_cache_v1_${uid}`;

const hydrateFromCache = async (uid: string, setStateFns) => {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(uid));
    if (!raw) return;
    const cached = JSON.parse(raw);

    const { setOutfit, setOutfitWeather, setOutfitLocation, setFocusItem, setOutfitSuggestions } = setStateFns;

    if (cached.outfit) setOutfit(cached.outfit);
    if (cached.outfitWeather) setOutfitWeather(cached.outfitWeather);
    if (cached.outfitLocation) setOutfitLocation(cached.outfitLocation);
    if (cached.focusItem) setFocusItem(cached.focusItem);
    if (cached.outfitSuggestions) setOutfitSuggestions(cached.outfitSuggestions);
  } catch {}
};
hydrateFromCache
const persistCache = async (uid: string, patch) => {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(uid));
    const base = raw ? JSON.parse(raw) : {};
    const next = { ...base, ...patch };
    await AsyncStorage.setItem(getCacheKey(uid), JSON.stringify(next));
  } catch {}
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

const getUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return user?.id;
};

export default function HomeScreen() {
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
    userId = await getUserId();
  } catch {}

  if (!userId) return;

  // ✅ Hydrate cache AFTER user is known
  await hydrateFromCache(userId, {
    setOutfit,
    setOutfitWeather,
    setOutfitLocation,
    setFocusItem,
    setOutfitSuggestions,
  });

  updateUserLocation(userId).catch(() => {});

  try {
    const [wardrobeData, dailyFit] = await Promise.all([
      fetchWardrobe(userId),
      fetchTodaysFit(userId),
    ]);

    if (!mountedRef.current) return;

    // STEP 2: clear cache if no wardrobe items
    if (!wardrobeData.length) {
      setWardrobe([]);
      setRecentItems([]);
      setFocusItem(null);
      setOutfitSuggestions([]);
      await AsyncStorage.removeItem(getCacheKey(userId));
      return; // stop here, nothing to display
    }

    setWardrobe(wardrobeData);
    setRecentItems(wardrobeData.slice(0, 10));

    if (dailyFit) {
      const matched = dailyFit.items
        .map(o => wardrobeData.find(w => w.id === o.id))
        .filter(Boolean);
      setOutfit(matched);
      if (dailyFit.weather) {
        setOutfitWeather(`${dailyFit.weather.temperature}°F`);
        setOutfitLocation(dailyFit.weather.city || 'Your Area');
      }
      persistCache(userId, {
        outfit: matched,
        outfitWeather: `${dailyFit.weather?.temperature ?? ''}°F`,
        outfitLocation: dailyFit.weather?.city ?? 'Your Area',
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

  const updateUserLocation = async (userId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const { coords } = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = coords;

    await supabase
      .from('profiles')
      .update({
        location_lat: latitude,
        location_lon: longitude,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  };

  const fetchWardrobe = async (userId) => {
    const { data, error } = await supabase
      .from('wardrobe')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  };

  const fetchTodaysFit = async (userId) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('daily_outfits')
      .select('*')
      .eq('user_id', userId)
      .eq('outfit_date', today)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') return null;
    return data;
  };

  const fetchGeneratedOutfit = async (wardrobeData) => {
    try {
      const res = await fetch('http://192.168.0.187:5000/generate-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'chill and stylish 75°F LA summer',
          used_recently: [],
          wardrobe: wardrobeData,
        }),
      });
      const raw = await res.text();
      const data = JSON.parse(raw);
      return wardrobeData.filter(item =>
        data.outfit?.some(o => o.id === item.id)
      );
    } catch {
      return [];
    }
  };

  const fetchStyleSuggestions = async (item, wardrobeData, ctx = {}) => {
    const {
      vibe = '',
      context = '',
      season = 'all',
      temperature = 72,
    } = ctx;

    const wardrobeLite = wardrobeData.map(w => ({
      id: w.id,
      name: w.name,
      type: w.type,
      main_category: w.main_category,
      primary_color: w.primary_color,
      secondary_colors: w.secondary_colors,
      pattern_description: w.pattern_description,
      vibe_tags: w.vibe_tags,
      season: w.season,
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('http://192.168.0.187:5000/style-single-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          vibe, context, season, temperature,
          wardrobe: wardrobeLite,
          locked_item: item,
        }),
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

      return [{ items: withLockedFirst.filter(x => x.id !== item.id), reason: `Here’s a fit that pairs well with your selected item.` }];
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
    persistCache({ focusItem: randomItem, outfitSuggestions: suggestions });
  };

  const handleRegenerate = async (userId) => {
    if (!wardrobe.length) return;
    setOutfitLoading(true);
    setOutfit([]);
    const regenerated = await fetchGeneratedOutfit(wardrobe);
    setOutfit(regenerated);
    setOutfitLoading(false);
    persistCache({ outfit: regenerated });
  };

  const handlePullNewItem = async (userId) => {
    if (!recentItems.length) return;
    setStyleLoading(true);
    const newItem = recentItems[Math.floor(Math.random() * recentItems.length)];
    setFocusItem(newItem);
    const suggestions = await fetchStyleSuggestions(newItem, wardrobe);
    if (!mountedRef.current) return;
    setOutfitSuggestions(suggestions);
    setStyleLoading(false);
    persistCache({ focusItem: newItem, outfitSuggestions: suggestions });
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
            Today’s weather: {outfitWeather || '—'}{outfitLocation ? `, ${outfitLocation}` : ''}
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
          onPullNewItem={handlePullNewItem}
        />

        <StorePicksRow
          items={[
            { id: '1', name: 'Beige Zip-Up Hoodie', image_url: 'https://i.imgur.com/dZ0gASb.png' },
            { id: '2', name: 'Chunky White Sneakers', image_url: 'https://i.imgur.com/yKwpj3N.png' },
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
