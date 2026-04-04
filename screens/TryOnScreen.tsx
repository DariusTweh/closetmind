// screens/TryOnScreen.tsx
// Basic mock of a Virtual Try-On screen (no backend yet)
// - Can be navigated to from StyleItemScreen, OutfitGeneratorScreen, or SavedOutfitsScreen
// - Accepts optional route params: baseModelUrl, items (array of wardrobe rows), outfit (array of wardrobe rows)
// - Loads a fallback base model from profiles if not passed
// - Shows a large preview area and simple item chips; "Generate" just toggles a mock result

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, fontSizes } from '../lib/theme';

// ---- Types ----
type WardrobeItem = {
  id: string;
  name?: string;
  type?: string;
  main_category?: string;
  image_url: string;
  primary_color?: string;
};

type RouteParams = {
  baseModelUrl?: string;
  items?: WardrobeItem[];
  outfit?: WardrobeItem[];
  mode?: 'quick' | string;
  lockedItem?: WardrobeItem & {
  primary_color?: string;
  secondary_colors?: string[];
  pattern_description?: string;
  vibe_tags?: string[];
  season?: string;
  meta?: any;
  };
};
const BASE_URL = 'http://192.168.0.187:5000';

export default function TryOnScreen() {
  const navigation = useNavigation();
  const { params } = useRoute() as unknown as { params?: RouteParams };
   const mode = (params as any)?.mode;
  const lockedItem = (params as any)?.lockedItem;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [baseModelUrl, setBaseModelUrl] = useState<string | undefined>(params?.baseModelUrl);
  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [mockGeneratedUrl, setMockGeneratedUrl] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [tryonUrl, setTryonUrl] = useState<string | null>(null);
  const [supportingItems, setSupportingItems] = useState<any[]>([]);
  const [hasSeededQuick, setHasSeededQuick] = useState(false);
  // Seed selection
  useEffect(() => {
    const seed = (params?.items || params?.outfit || []) as WardrobeItem[];
    if (seed?.length) setSelectedItems(seed);
  }, [params]);

useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }

      setUserId(uid);

      // If passed through route params, prefer it
      if (params?.baseModelUrl) {
        console.log("✅ Using baseModelUrl from route params:", params.baseModelUrl);
        setBaseModelUrl(params.baseModelUrl);
        return;
      }

      // Otherwise, fetch from profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('ai_model_url')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn("⚠️ Profile fetch error:", error);
      }

      if (profile?.ai_model_url && mounted) {
        console.log("✅ Using ai_model_url from profile:", profile.ai_model_url);
        setBaseModelUrl(profile.ai_model_url);
      } else {
        console.warn("⚠️ No ai_model_url found for user.");
      }
    } catch (e) {
      console.error("🔥 TryOnScreen hydration error:", e);
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => {
    mounted = false;
  };
}, [params?.baseModelUrl]);
  // Quick "Try On" flow – when coming from ImportBrowserScreen with lockedItem
useEffect(() => {
  if (mode !== 'quick' || !lockedItem) return;
  if (!userId || !baseModelUrl) return;
  if (hasSeededQuick) return; // ✅ don't run twice

  let cancelled = false;

  const runQuick = async () => {
    try {
      setQuickLoading(true);
      setQuickError(null);

      const wardrobe = await loadWardrobeForTryOn();

      const resp = await fetch(`${BASE_URL}/style-single-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'basic everyday outfit for quick try-on',
          vibe: 'casual',
          season: (lockedItem as any).season || 'all',
          temperature: 70,
          wardrobe,
          locked_item: lockedItem,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.outfit) {
        throw new Error(data?.error || 'Failed to build outfit.');
      }

      const outfitIds: string[] = data.outfit.map((o: any) => o.id);
      const wardrobeById: Record<string, WardrobeItem> = {};
      wardrobe.forEach((w) => {
        wardrobeById[w.id] = w;
      });

      const supporting = outfitIds
        .filter((id) => id !== lockedItem.id)
        .map((id) => wardrobeById[id])
        .filter(Boolean);

      if (cancelled) return;

      setSupportingItems(supporting);

      const allItems: WardrobeItem[] = [
        lockedItem as WardrobeItem,
        ...supporting,
      ];
      setSelectedItems(allItems);

      setHasSeededQuick(true); // ✅ mark as done
    } catch (err: any) {
      console.error('Quick try-on seed error:', err);
      if (!cancelled) setQuickError(err?.message || 'Failed to prepare quick outfit.');
    } finally {
      if (!cancelled) setQuickLoading(false);
    }
  };

  runQuick();

  return () => {
    cancelled = true;
  };
}, [mode, lockedItem, userId, baseModelUrl, hasSeededQuick]);



  const hasAnythingToShow = useMemo(() => !!(mockGeneratedUrl || baseModelUrl), [mockGeneratedUrl, baseModelUrl]);

  const generateTryOnWithItems = async (items: WardrobeItem[]) => {
    if (!items.length) {
      Alert.alert("Select items", "Pick at least one item to try on.");
      return;
    }
    if (!baseModelUrl) {
      Alert.alert("Missing model", "We couldn't find your base model.");
      return;
    }
    if (!userId) return;

    setLoading(true);
    setMockGeneratedUrl(null);

    try {
      const response = await fetch(`${BASE_URL}/tryon/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          base_model_url: baseModelUrl,
          clothing_image_urls: items.map((item) => item.image_url),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate try-on image.");
      }

      setMockGeneratedUrl(data.tryon_url);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTryOn = async () => {
    await generateTryOnWithItems(selectedItems);
  };
  const loadWardrobeForTryOn = async () => {
    // Adjust columns to match your wardrobe table
    const { data, error } = await supabase
      .from('wardrobe')
      .select('id, name, type, main_category, image_url, primary_color');

    if (error) throw error;
    return (data || []) as WardrobeItem[];
  };



  const handleRemoveItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

const handleSaveMock = async () => {
  if (!userId) return;
  if (!mockGeneratedUrl) {
    Alert.alert('Nothing to save', "Generate a try-on preview first.");
    return;
  }

  try {
    const { error } = await supabase
      .from('tryon_outfits')
      .insert({
        user_id: userId,
        image_url: mockGeneratedUrl,
        clothing_item_ids: selectedItems.map(item => item.id),
      });

    if (error) {
      console.error("❌ Failed to save try-on outfit:", error.message);
      Alert.alert('Error', 'Failed to save your try-on outfit.');
    } else {
      Alert.alert('Saved!', 'Your try-on preview has been saved successfully.');
    }
  } catch (err: any) {
    Alert.alert('Error', err.message || 'Unexpected error');
  }
};


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.icon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Virtual Try‑On</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.previewCard}>
          {loading ? (
            <ActivityIndicator size="large" color="#888" />
          ) : hasAnythingToShow ? (
            <View style={{ width: '100%', height: '100%' }}>
              <Image
                source={{ uri: mockGeneratedUrl || baseModelUrl! }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              {!!mockGeneratedUrl && (
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>Try-On Result</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewEmptyText}>No model image yet</Text>
              <Text style={styles.previewEmptySub}>Generate your base model in onboarding</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Selected Items</Text>
        {selectedItems.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyRowText}>No items selected yet.</Text>
            <Text style={styles.emptyRowHint}>Come from Style This Item / Generator / Saved Outfit.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
            {selectedItems.map(item => (
              <View key={item.id} style={styles.itemChip}>
                <Image source={{ uri: item.image_url }} style={styles.itemThumb} />
                <Text numberOfLines={1} style={styles.itemName}>{item.name || item.type || 'Item'}</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, (!baseModelUrl || loading) && styles.btnDisabled]}
            onPress={handleGenerateTryOn}
            disabled={!baseModelUrl || loading}
          >
            <Text style={styles.btnText}>Generate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSecondary, (!mockGeneratedUrl || loading) && styles.btnDisabled]}
            onPress={handleSaveMock}
            disabled={!mockGeneratedUrl || loading}
          >
            <Text style={styles.btnSecondaryText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 4,
  },
  icon: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewCard: {
    height: 420,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  previewEmptyText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSizes.base,
  },
  previewEmptySub: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: fontSizes.sm,
  },
  previewBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyRow: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  emptyRowText: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptyRowHint: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  itemChip: {
    width: 110,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemThumb: {
    width: '100%',
    height: 80,
    borderRadius: radii.sm,
    backgroundColor: '#e6e6e6',
    marginBottom: 6,
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
  },
  remove: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  btnText: {
    color: colors.textOnAccent,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.accentSecondary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
