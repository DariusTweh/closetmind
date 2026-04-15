// screens/TryOnScreen.tsx
// Basic mock of a Virtual Try-On screen (no backend yet)
// - Can be navigated to from StyleItemScreen, OutfitGeneratorScreen, or SavedOutfitsScreen
// - Accepts optional route params: baseModelUrl, items (array of wardrobe rows), outfit (array of wardrobe rows)
// - Loads a fallback base model from profiles if not passed
// - Shows a large preview area and simple item chips; "Generate" just toggles a mock result

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiPost } from '../lib/api';
import { describeResolvedPrivateMediaSource, resolvePrivateMediaUrl } from '../lib/privateMedia';
import { toStyleRequestWardrobeItem } from '../lib/styleRequestWardrobe';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import TryOnActionBar from '../components/TryOn/TryOnActionBar';
import TryOnHeader from '../components/TryOn/TryOnHeader';
import TryOnPreviewStage from '../components/TryOn/TryOnPreviewStage';
import TryOnSelectedTray from '../components/TryOn/TryOnSelectedTray';

// ---- Types ----
type WardrobeItem = {
  id: string;
  source_type?: 'wardrobe' | 'external' | string | null;
  source_subtype?: string | null;
  external_item_id?: string | null;
  is_saved_to_closet?: boolean | null;
  name?: string;
  type?: string;
  main_category?: string;
  image_url?: string;
  image_path?: string;
  primary_color?: string;
  color?: string;
  subcategory?: string;
  garment_function?: string | null;
  fabric_weight?: string | null;
  style_role?: string | null;
  material_guess?: string | null;
  silhouette?: string | null;
  weather_use?: string[] | null;
  occasion_tags?: string[] | null;
  fit?: string | null;
  fit_notes?: { fit?: string | null } | null;
  tags?: string[];
  vibe_tags?: string[];
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

const TRY_ON_POLL_FALLBACK_MS = 1500;
const TRY_ON_MAX_POLL_ATTEMPTS = 120;

function getTryOnStatusLabel(status?: string | null) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'queued':
      return 'Queued for generation...';
    case 'processing':
      return 'Generating your try-on preview...';
    case 'failed':
      return 'Try-on generation failed.';
    case 'completed':
      return 'Try-on preview ready.';
    default:
      return 'Preparing your try-on...';
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getImageExtensionFromUrl(url?: string | null) {
  const normalized = String(url || '').split('?')[0].trim().toLowerCase();
  const match = normalized.match(/\.(png|jpe?g|webp|heic)$/);
  return match ? `.${match[1]}`.replace('.jpeg', '.jpg') : '.jpg';
}

export default function TryOnScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute() as unknown as { params?: RouteParams };
   const mode = (params as any)?.mode;
  const lockedItem = (params as any)?.lockedItem;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [baseModelUrl, setBaseModelUrl] = useState<string | undefined>(params?.baseModelUrl);
  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [mockGeneratedUrl, setMockGeneratedUrl] = useState<string | null>(null);
  const [tryOnJobId, setTryOnJobId] = useState<string | null>(null);
  const [tryOnJobStatus, setTryOnJobStatus] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [hasSeededQuick, setHasSeededQuick] = useState(false);
  const mountedRef = useRef(true);
  const generateSequenceRef = useRef(0);
  // Seed selection
  useEffect(() => {
    const seed = (params?.items || params?.outfit || []) as WardrobeItem[];
    if (seed?.length) setSelectedItems(seed);
  }, [params]);

useEffect(() => {
  let mounted = true;
  mountedRef.current = true;

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
        setBaseModelUrl(params.baseModelUrl);
        return;
      }

      // Otherwise, fetch from profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('ai_model_path, ai_model_url')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn("⚠️ Profile fetch error:", error);
      }

      const resolvedModelUrl = await resolvePrivateMediaUrl({
        path: profile?.ai_model_path,
        legacyUrl: profile?.ai_model_url,
      });
      const resolvedModelSource = describeResolvedPrivateMediaSource({
        path: profile?.ai_model_path,
        legacyUrl: profile?.ai_model_url,
      });

      if (resolvedModelUrl && mounted) {
        if (resolvedModelSource === 'legacy-storage-url') {
          console.warn("⚠️ Using legacy model URL fallback from profile; ai_model_path is missing or stale.");
        }
        setBaseModelUrl(resolvedModelUrl);
      } else {
        console.warn("⚠️ No ai model image found for user.");
      }
    } catch (e) {
      console.error("🔥 TryOnScreen hydration error:", e);
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => {
    mounted = false;
    mountedRef.current = false;
    generateSequenceRef.current += 1;
  };
}, [params?.baseModelUrl]);
  // Quick "Try On" flow – when coming from ImportBrowserScreen with lockedItem
useEffect(() => {
  if (mode !== 'quick' || !lockedItem) return;
  if (!userId) return;
  if (hasSeededQuick) return; // ✅ don't run twice

  let cancelled = false;

  const runQuick = async () => {
    try {
      setQuickLoading(true);

      const resp = await apiPost('/style-single-item', {
        context: 'basic everyday outfit for quick try-on',
        vibe: 'casual',
        season: (lockedItem as any).season || 'all',
        temperature: 70,
        locked_item: toStyleRequestWardrobeItem(lockedItem as any),
      });

      const data = await resp.json();
      if (!resp.ok || !data?.outfit) {
        throw new Error(data?.error || 'Failed to build outfit.');
      }

      const outfitIds: string[] = data.outfit.map((o: any) => o.id);
      const supportingIds = Array.from(new Set(
        outfitIds.filter((id) => id !== lockedItem.id)
      ));
      const supporting = await loadWardrobeItemsByIds(supportingIds);
      const wardrobeById: Record<string, WardrobeItem> = {};
      supporting.forEach((item) => {
        wardrobeById[item.id] = item;
      });

      const orderedSupporting = supportingIds
        .filter((id) => id !== lockedItem.id)
        .map((id) => wardrobeById[id])
        .filter(Boolean);

      if (cancelled) return;

      const allItems: WardrobeItem[] = [
        lockedItem as WardrobeItem,
        ...orderedSupporting,
      ];
      setSelectedItems(allItems);

      setHasSeededQuick(true); // ✅ mark as done
    } catch (err: any) {
      console.error('Quick try-on seed error:', err);
    } finally {
      if (!cancelled) setQuickLoading(false);
    }
  };

  runQuick();

  return () => {
    cancelled = true;
  };
}, [mode, lockedItem, userId, hasSeededQuick]);



  const hasAnythingToShow = useMemo(() => !!(mockGeneratedUrl || baseModelUrl), [mockGeneratedUrl, baseModelUrl]);
  const isBusy = loading || quickLoading;
  const busyStatusLabel = tryOnJobStatus
    ? getTryOnStatusLabel(tryOnJobStatus)
    : quickLoading
      ? 'Styling your quick try-on...'
      : 'Preparing your try-on...';

  const pollTryOnJob = async (jobId: string, requestId: number, initialDelayMs?: number | null) => {
    let nextDelayMs = Math.max(1000, Number(initialDelayMs) || TRY_ON_POLL_FALLBACK_MS);

    for (let attempt = 0; attempt < TRY_ON_MAX_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await delay(nextDelayMs);
      }

      if (!mountedRef.current || requestId !== generateSequenceRef.current) {
        return;
      }

      const statusResponse = await apiPost('/tryon/status', { job_id: jobId });
      const statusPayload = await statusResponse.json().catch(() => null);

      if (!statusResponse.ok) {
        throw new Error(statusPayload?.error || 'Failed to check try-on status.');
      }

      if (!mountedRef.current || requestId !== generateSequenceRef.current) {
        return;
      }

      const nextStatus = String(statusPayload?.status || 'queued').trim().toLowerCase();
      setTryOnJobId(statusPayload?.job_id || jobId);
      setTryOnJobStatus(nextStatus);

      if (nextStatus === 'completed') {
        const resolvedTryOnUrl =
          statusPayload?.tryon_url ||
          (await resolvePrivateMediaUrl({
            path: statusPayload?.image_path,
            legacyUrl: statusPayload?.image_url,
          }));

        setMockGeneratedUrl(resolvedTryOnUrl || null);
        setTryOnJobId(null);
        return;
      }

      if (nextStatus === 'failed') {
        throw new Error(statusPayload?.error || 'Try-on generation failed.');
      }

      nextDelayMs = Math.max(1000, Number(statusPayload?.poll_after_ms) || TRY_ON_POLL_FALLBACK_MS);
    }

    throw new Error('Try-on is taking longer than expected. Please check again in a moment.');
  };

  const generateTryOnWithItems = async (items: WardrobeItem[]) => {
    const requestId = generateSequenceRef.current + 1;
    generateSequenceRef.current = requestId;
    const uniqueItems = Array.from(
      new Map(
        items
          .filter((item) => isRealWardrobeItem(item) || item?.image_path || item?.image_url)
          .map((item) => [item.image_path || item.image_url || item.id, item])
      ).values()
    );

    if (!uniqueItems.length) {
      Alert.alert("Select items", "Pick at least one item to try on.");
      return;
    }
    if (uniqueItems.length > 4) {
      Alert.alert('Too many items', 'Pick up to 4 clothing items per try-on.');
      return;
    }

    setLoading(true);
    setMockGeneratedUrl(null);
    setTryOnJobId(null);
    setTryOnJobStatus(null);

    try {
      const clothingItemIds = uniqueItems
        .filter((item) => isRealWardrobeItem(item))
        .map((item) => item.id);
      const externalItems = uniqueItems
        .filter((item) => !isRealWardrobeItem(item))
        .map(buildExternalTryOnItem);
      const response = await apiPost('/tryon/generate', {
        async: true,
        clothing_item_ids: clothingItemIds,
        ...(externalItems.length ? { external_items: externalItems } : {}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate try-on image.");
      }

      if (data?.job_id) {
        setTryOnJobId(data.job_id);
        setTryOnJobStatus(String(data.status || 'queued').toLowerCase());
        await pollTryOnJob(data.job_id, requestId, data.poll_after_ms);
        return;
      }

      const resolvedTryOnUrl =
        data.tryon_url ||
        (await resolvePrivateMediaUrl({
          path: data.image_path,
          legacyUrl: data.image_url,
        }));

      setMockGeneratedUrl(resolvedTryOnUrl);
    } catch (err: any) {
      if (requestId === generateSequenceRef.current && mountedRef.current) {
        setTryOnJobStatus('failed');
        setTryOnJobId(null);
      }
      Alert.alert("Error", err.message || "Unknown error");
    } finally {
      if (requestId === generateSequenceRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleGenerateTryOn = async () => {
    await generateTryOnWithItems(selectedItems);
  };

  const loadWardrobeItemsByIds = async (ids: string[]) => {
    if (!ids.length || !userId) return [];

    const { data, error } = await supabase
      .from('wardrobe')
      .select('id, name, type, main_category, image_url, image_path, primary_color')
      .eq('user_id', userId)
      .in('id', ids);

    if (error) throw error;
    return (data || []) as WardrobeItem[];
  };



  const handleRemoveItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

const WARDROBE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRealWardrobeId = (value: string | null | undefined) => {
  const id = String(value || '').trim();
  return !!id && !id.startsWith('ext_') && WARDROBE_UUID_PATTERN.test(id);
};

const isRealWardrobeItem = (item: WardrobeItem | null | undefined) => {
  if (!item) return false;
  if (item.source_type === 'external') return false;
  if (item.is_saved_to_closet === false) return false;
  if (item.external_item_id && item.source_type !== 'wardrobe') return false;
  return isRealWardrobeId(item.id);
};

const buildExternalTryOnItem = (item: WardrobeItem) => ({
  id: item.id || null,
  source_type: 'external',
  source_subtype: item.source_subtype || 'browser_import',
  external_item_id: item.external_item_id || item.id || null,
  is_saved_to_closet: false,
  name: item.name || null,
  type: item.type || null,
  main_category: item.main_category || null,
  image_url: item.image_url || null,
  image_path: item.image_path || null,
  color: item.primary_color || item.color || null,
  subcategory: item.subcategory || item.type || null,
  tags: Array.from(new Set([...(item.tags || []), ...(item.vibe_tags || [])].filter(Boolean))),
  is_external: true,
});

const handleSaveMock = async () => {
  if (!mockGeneratedUrl) {
    Alert.alert('Nothing to save', "Generate a try-on preview first.");
    return;
  }

  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to save try-on results to your phone.');
      return;
    }

    const extension = getImageExtensionFromUrl(mockGeneratedUrl);
    const destination = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}tryon-${Date.now()}${extension}`;
    const download = await FileSystem.downloadAsync(mockGeneratedUrl, destination);

    await MediaLibrary.saveToLibraryAsync(download.uri);
    await FileSystem.deleteAsync(download.uri, { idempotent: true });

    Alert.alert('Saved', 'Your try-on image has been added to Photos.');
  } catch (err: any) {
    Alert.alert('Save error', err.message || 'Could not save this try-on image to your phone.');
  }
};


  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TryOnHeader onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 132 + Math.max(insets.bottom, 10) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TryOnPreviewStage
          isBusy={isBusy}
          hasAnythingToShow={hasAnythingToShow}
          previewUrl={mockGeneratedUrl}
          baseModelUrl={baseModelUrl}
          busyStatusLabel={busyStatusLabel}
          tryOnJobId={tryOnJobId}
        />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Selected Pieces</Text>
            <Text style={styles.sectionTitle}>
              {selectedItems.length
                ? `${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} ready`
                : 'Choose the pieces to style'}
            </Text>
          </View>
        </View>

        <TryOnSelectedTray
          items={selectedItems}
          onRemove={handleRemoveItem}
        />
      </ScrollView>

      <TryOnActionBar
        onGenerate={handleGenerateTryOn}
        onSave={handleSaveMock}
        generateDisabled={!baseModelUrl || isBusy}
        saveDisabled={!mockGeneratedUrl || isBusy}
      />
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
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: 10,
  },
  sectionEyebrow: {
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.15,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
});
