import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import OutfitCanvas from '../components/OutfitCanvas/OutfitCanvas';
import OutfitPreviewCard from '../components/OutfitCanvas/OutfitPreviewCard';
import OutfitPreviewModal from '../components/OutfitCanvas/OutfitPreviewModal';
import OutfitSummaryCard from '../components/OutfitCanvas/OutfitSummaryCard';
import WhyItWorksPanel from '../components/OutfitCanvas/WhyItWorksPanel';
import type { OutfitCanvasItem } from '../components/OutfitCanvas/types';
import { buildOutfitCanvasItems, buildOutfitCanvasReasons } from '../components/OutfitCanvas/utils';
import WardrobeItemImage from '../components/Closet/WardrobeItemImage';
import UpgradeLimitModal from '../components/subscriptions/UpgradeLimitModal';
import { useUpgradeWall } from '../hooks/useUpgradeWall';
import { apiPost, readApiResponse } from '../lib/api';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { isSubscriptionLimitError } from '../lib/subscriptions/errors';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../lib/subscriptions/modalState';
import { canUseFeature, incrementUsage } from '../lib/subscriptions/usageService';
import { toStyleRequestWardrobeItem, toStyleRequestWardrobeList } from '../lib/styleRequestWardrobe';
import { fetchStyleContextSignals } from '../lib/styleProfile';
import { supabase } from '../lib/supabase';
import { isExternalItemLike } from '../lib/wardrobePayload';
import { saveMixedOutfit } from '../services/savedOutfitService';
import { buildFateContext } from '../utils/buildFateContext';
import { normalizeSavedOutfitLikeItem } from '../utils/styleCanvasAdapters';

const DISPLAY_ORDER = ['outerwear', 'base_top', 'top_layer', 'onepiece', 'bottom', 'shoes', 'accessory'];
const DEFAULT_TEMPERATURE = '72';
const SEASON_OPTIONS = ['all', 'spring', 'summer', 'fall', 'winter'];
const WARDROBE_LOOKUP_LIMIT = 200;
const STYLE_WARDROBE_BASE_FIELDS = [
  'id',
  'user_id',
  'name',
  'type',
  'main_category',
  'image_url',
  'primary_color',
  'secondary_colors',
  'pattern_description',
  'vibe_tags',
  'season',
  'meta',
  'wardrobe_status',
];
const STYLE_WARDROBE_MEDIA_FIELDS = [
  'image_path',
  'thumbnail_url',
  'display_image_url',
  'cutout_image_url',
  'cutout_thumbnail_url',
  'cutout_display_url',
];
const STYLE_WARDROBE_OPTIONAL_FIELDS = [
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
const STYLE_WARDROBE_SELECT_FIELDS = [
  ...STYLE_WARDROBE_BASE_FIELDS,
  ...STYLE_WARDROBE_MEDIA_FIELDS,
  ...STYLE_WARDROBE_OPTIONAL_FIELDS,
].join(', ');
const STYLE_WARDROBE_MEDIA_FALLBACK_SELECT_FIELDS = [
  ...STYLE_WARDROBE_BASE_FIELDS,
  ...STYLE_WARDROBE_MEDIA_FIELDS,
].join(', ');
const STYLE_WARDROBE_FALLBACK_SELECT_FIELDS = STYLE_WARDROBE_BASE_FIELDS.join(', ');

type WardrobeItem = {
  id: string;
  user_id?: string;
  wardrobe_status?: string | null;
  source_type?: 'wardrobe' | 'external' | string | null;
  source_subtype?: string | null;
  external_item_id?: string | null;
  is_saved_to_closet?: boolean | null;
  name?: string;
  type?: string;
  main_category?: string;
  outfit_role?: string | null;
  image_url?: string;
  image_path?: string;
  thumbnail_url?: string | null;
  display_image_url?: string | null;
  cutout_url?: string | null;
  cutout_image_url?: string | null;
  cutout_thumbnail_url?: string | null;
  cutout_display_url?: string | null;
  primary_color?: string;
  secondary_colors?: string[];
  pattern_description?: string;
  vibe_tags?: string[];
  season?: string;
  subcategory?: string | null;
  garment_function?: string | null;
  fabric_weight?: string | null;
  style_role?: string | null;
  material_guess?: string | null;
  silhouette?: string | null;
  weather_use?: string[] | null;
  occasion_tags?: string[] | null;
  fit?: string | null;
  fit_notes?: { fit?: string | null } | null;
  meta?: any;
  reason?: string;
};

type LookEntry = {
  id: string;
  title: string;
  summary: string;
  outfit: Array<{ id: string; reason?: string; outfit_role?: string | null }>;
  steps?: Record<string, { id: string; reason?: string }>;
};

type ResolvedLook = {
  id: string;
  title: string;
  summary: string;
  items: WardrobeItem[];
  canvasItems: OutfitCanvasItem[];
  rawOutfit: Array<{ id: string; reason?: string; outfit_role?: string | null }>;
};

function normalizeSeason(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return SEASON_OPTIONS.includes(normalized) ? normalized : 'all';
}

function sortItems(items: WardrobeItem[]) {
  const resolveRole = (item: WardrobeItem) => {
    const explicitRole = String(item?.outfit_role || '').trim().toLowerCase();
    if (DISPLAY_ORDER.includes(explicitRole)) return explicitRole;
    const category = String(item?.main_category || '').trim().toLowerCase();
    if (category === 'top') return 'base_top';
    return category;
  };

  return items
    .slice()
    .sort(
      (left, right) =>
        DISPLAY_ORDER.indexOf(resolveRole(left)) - DISPLAY_ORDER.indexOf(resolveRole(right)),
    );
}

function formatRefineChip(label: string, value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return `${label}: ${normalized}`;
}

function formatSeasonLabel(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized || normalized === 'all') return null;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function StyleItemScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const routeItem = params?.item as WardrobeItem | undefined;
  const initialRouteVibe = String(params?.initialVibe || '').trim();
  const initialRouteContext = String(params?.initialContext || '').trim();
  const initialRouteSeason = normalizeSeason(params?.initialSeason || routeItem?.season);
  const initialRouteTemperature = String(params?.initialTemperature || DEFAULT_TEMPERATURE).trim() || DEFAULT_TEMPERATURE;

  const [lockedItem, setLockedItem] = useState<WardrobeItem | undefined>(routeItem);
  const [draftVibe, setDraftVibe] = useState(initialRouteVibe);
  const [draftContext, setDraftContext] = useState(initialRouteContext);
  const [draftSeason, setDraftSeason] = useState(initialRouteSeason);
  const [draftTemperature, setDraftTemperature] = useState(initialRouteTemperature);
  const [appliedVibe, setAppliedVibe] = useState(initialRouteVibe);
  const [appliedContext, setAppliedContext] = useState(initialRouteContext);
  const [appliedSeason, setAppliedSeason] = useState(initialRouteSeason);
  const [appliedTemperature, setAppliedTemperature] = useState(initialRouteTemperature);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [showRefine, setShowRefine] = useState(false);
  const [looks, setLooks] = useState<ResolvedLook[]>([]);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [baseModelUrl, setBaseModelUrl] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<string | null>(null);
  const [savingLookId, setSavingLookId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [recentLookHistory, setRecentLookHistory] = useState<string[][]>([]);
  const [selectedLookId, setSelectedLookId] = useState<string | null>(null);
  const [previewLookId, setPreviewLookId] = useState<string | null>(null);
  const [activeReasonItemId, setActiveReasonItemId] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();

  const looksRef = useRef<ResolvedLook[]>([]);
  const recentHistoryRef = useRef<string[][]>([]);
  const wardrobeRef = useRef<WardrobeItem[]>([]);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    looksRef.current = looks;
  }, [looks]);

  useEffect(() => {
    recentHistoryRef.current = recentLookHistory;
  }, [recentLookHistory]);

  useEffect(() => {
    wardrobeRef.current = wardrobe;
  }, [wardrobe]);

  useEffect(() => {
    setLockedItem(routeItem);
    setDraftVibe(initialRouteVibe);
    setDraftContext(initialRouteContext);
    setDraftSeason(initialRouteSeason);
    setDraftTemperature(initialRouteTemperature);
    setAppliedVibe(initialRouteVibe);
    setAppliedContext(initialRouteContext);
    setAppliedSeason(initialRouteSeason);
    setAppliedTemperature(initialRouteTemperature);
    setLooks([]);
    setRecentLookHistory([]);
    setShowRefine(false);
    setRefreshTick(0);
    setSelectedLookId(null);
    setPreviewLookId(null);
    setActiveReasonItemId(null);
  }, [initialRouteContext, initialRouteSeason, initialRouteTemperature, initialRouteVibe, routeItem?.id]);

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    setUserId(data.user.id);
    return data.user.id as string;
  }, []);

  const fetchWardrobe = useCallback(async (uid: string) => {
    let response: any = await supabase
      .from('wardrobe')
      .select(STYLE_WARDROBE_SELECT_FIELDS)
      .eq('user_id', uid)
      .range(0, WARDROBE_LOOKUP_LIMIT - 1)
      .order('created_at', { ascending: false });

    if (response.error) {
      response = await supabase
        .from('wardrobe')
        .select(STYLE_WARDROBE_MEDIA_FALLBACK_SELECT_FIELDS)
        .eq('user_id', uid)
        .range(0, WARDROBE_LOOKUP_LIMIT - 1)
        .order('created_at', { ascending: false });
    }

    if (response.error) {
      response = await supabase
        .from('wardrobe')
        .select(STYLE_WARDROBE_FALLBACK_SELECT_FIELDS)
        .eq('user_id', uid)
        .range(0, WARDROBE_LOOKUP_LIMIT - 1)
        .order('created_at', { ascending: false });
    }

    if (response.error) throw response.error;
    return ((response.data || []) as WardrobeItem[]).filter((item) => item?.wardrobe_status !== 'scanned_candidate');
  }, []);

  const fetchWardrobeItemsByIds = useCallback(async (uid: string, ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return [] as WardrobeItem[];

    let response: any = await supabase
      .from('wardrobe')
      .select(STYLE_WARDROBE_SELECT_FIELDS)
      .eq('user_id', uid)
      .in('id', uniqueIds);

    if (response.error) {
      response = await supabase
        .from('wardrobe')
        .select(STYLE_WARDROBE_MEDIA_FALLBACK_SELECT_FIELDS)
        .eq('user_id', uid)
        .in('id', uniqueIds);
    }

    if (response.error) {
      response = await supabase
        .from('wardrobe')
        .select(STYLE_WARDROBE_FALLBACK_SELECT_FIELDS)
        .eq('user_id', uid)
        .in('id', uniqueIds);
    }

    if (response.error) throw response.error;
    return ((response.data || []) as WardrobeItem[]).filter((item) => item?.wardrobe_status !== 'scanned_candidate');
  }, []);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('ai_model_path, ai_model_url, model_status')
      .eq('id', uid)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }, []);

  const hydrate = useCallback(async () => {
    setBooting(true);
    try {
      const uid = await resolveUser();
      if (!uid) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const [items, profile, styleSignals] = await Promise.all([
        fetchWardrobe(uid),
        fetchProfile(uid),
        fetchStyleContextSignals(uid).catch(() => ({ profile: null, preferences: null })),
      ]);
      const nextWardrobe =
        lockedItem?.id && !items.find((item) => item.id === lockedItem.id) ? [lockedItem, ...items] : items;

      if (!mountedRef.current) return;

      const resolvedBaseModelUrl = await resolvePrivateMediaUrl({
        path: profile?.ai_model_path,
        legacyUrl: profile?.ai_model_url,
      });

      setWardrobe(nextWardrobe);
      setBaseModelUrl(resolvedBaseModelUrl);
      setModelStatus(profile?.model_status || null);

      if (!initialRouteVibe || !initialRouteContext || !initialRouteSeason || !initialRouteTemperature) {
        const seededContext = buildFateContext({
          profile: styleSignals.profile,
          preferences: styleSignals.preferences,
          wardrobe: nextWardrobe,
          weather: {
            season: initialRouteSeason,
            temperature: initialRouteTemperature,
          },
        });

        const nextVibe = initialRouteVibe || seededContext.vibe || '';
        const nextContext = initialRouteContext || seededContext.context || '';
        const nextSeason = normalizeSeason(initialRouteSeason || seededContext.season);
        const nextTemperature = String(initialRouteTemperature || seededContext.temperature || DEFAULT_TEMPERATURE).trim() || DEFAULT_TEMPERATURE;

        setDraftVibe(nextVibe);
        setDraftContext(nextContext);
        setDraftSeason(nextSeason);
        setDraftTemperature(nextTemperature);
        setAppliedVibe(nextVibe);
        setAppliedContext(nextContext);
        setAppliedSeason(nextSeason);
        setAppliedTemperature(nextTemperature);
      }
    } catch (error: any) {
      console.error('Style screen hydration failed:', error?.message || error);
      if (mountedRef.current) {
        Alert.alert('Error', 'Could not load your styling data.');
      }
    } finally {
      if (mountedRef.current) setBooting(false);
    }
  }, [fetchProfile, fetchWardrobe, lockedItem, navigation, resolveUser]);

  useEffect(() => {
    mountedRef.current = true;
    void hydrate();
    return () => {
      mountedRef.current = false;
    };
  }, [hydrate]);

  const resolveLook = useCallback(
    (look: LookEntry, index: number, sourceWardrobe: WardrobeItem[]) => {
      const resolvedItems = sortItems(
        (Array.isArray(look?.outfit) ? look.outfit : [])
          .map((entry) => {
            const match = sourceWardrobe.find((item) => item.id === entry?.id);
            if (!match) {
              console.warn('Styled item missing from local wardrobe map:', entry?.id);
              return null;
            }
            return { ...match, reason: entry?.reason, outfit_role: entry?.outfit_role || null };
          })
          .filter(Boolean) as WardrobeItem[],
      );

      const canvasItems = buildOutfitCanvasItems(resolvedItems, {
        lockedIds: lockedItem?.id ? [lockedItem.id] : [],
      });

      return {
        id: look?.id || `look_${index + 1}`,
        title: look?.title || `Styled Look ${index + 1}`,
        summary: look?.summary || 'A wearable combination built around your selected piece.',
        items: resolvedItems,
        canvasItems,
        rawOutfit: Array.isArray(look?.outfit) ? look.outfit : [],
      };
    },
    [lockedItem?.id],
  );

  const generateLooks = useCallback(async () => {
    if (!userId || !lockedItem?.id) return;

    const styleAccess = await canUseFeature(userId, 'style_this_item');
    if (!styleAccess.allowed) {
      setUpgradeModal(buildUpgradeModalState('style_this_item', styleAccess));
      return;
    }

    const requestId = ++requestSeqRef.current;
    const sourceWardrobe =
      lockedItem?.id && !wardrobeRef.current.find((item) => item.id === lockedItem.id)
        ? [lockedItem, ...wardrobeRef.current]
        : wardrobeRef.current;
    const avoidIds = Array.from(
      new Set(
        looksRef.current
          .flatMap((look) => look.items.map((item) => item.id))
          .filter((id) => id && id !== lockedItem.id),
      ),
    );
    const recentIds = Array.from(new Set(recentHistoryRef.current.flat().filter(Boolean)));

    setLoading(true);

    try {
      const response = await apiPost('/style-single-item', {
        context: appliedContext,
        vibe: appliedVibe,
        season: appliedSeason,
        temperature: Number.isFinite(Number(appliedTemperature)) ? Number(appliedTemperature) : appliedTemperature,
        locked_item: toStyleRequestWardrobeItem(lockedItem),
        wardrobe: toStyleRequestWardrobeList(sourceWardrobe),
        recent_item_ids: recentIds,
        avoidIds,
        count: 3,
      });

      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to style this item.');
      }

      const rawLooks =
        Array.isArray(result?.looks) && result.looks.length
          ? result.looks
          : [{ id: 'look_1', title: 'Styled Look', summary: '', outfit: result?.outfit || [], steps: result?.steps }];

      const missingIds: string[] = Array.from(
        new Set(
          rawLooks
            .flatMap((look: LookEntry) => (Array.isArray(look?.outfit) ? look.outfit.map((entry) => entry?.id) : []))
            .filter((id: string) => id && !sourceWardrobe.find((item) => item.id === id)),
        ),
      );
      const fetchedMissingItems = missingIds.length
        ? await fetchWardrobeItemsByIds(userId, missingIds)
        : [];
      const mergedWardrobe = Array.from(
        new Map([...sourceWardrobe, ...fetchedMissingItems].filter(Boolean).map((item) => [item.id, item])).values(),
      );

      const resolvedLooks = rawLooks
        .map((look: LookEntry, index: number) => resolveLook(look, index, mergedWardrobe))
        .filter((look: ResolvedLook) => look.items.length > 0);

      if (requestId !== requestSeqRef.current || !mountedRef.current) return;
      if (!resolvedLooks.length) {
        throw new Error('No wearable looks were returned.');
      }

      if (fetchedMissingItems.length) {
        setWardrobe(mergedWardrobe);
      }
      setLooks(resolvedLooks);
      setSelectedLookId(null);
      setPreviewLookId(null);
      setActiveReasonItemId(null);
      setRecentLookHistory((previous) =>
        [...previous.slice(-6), ...resolvedLooks.map((look) => look.items.map((item) => item.id))].slice(-12),
      );
      await incrementUsage(userId, 'style_this_item').catch((error: any) => {
        console.warn('Style This Item usage increment failed:', error?.message || error);
      });
    } catch (error: any) {
      if (requestId !== requestSeqRef.current || !mountedRef.current) return;
      console.error('Styling fetch failed:', error?.message || error);
      Alert.alert('Styling error', error?.message || 'Could not style this item.');
    } finally {
      if (requestId === requestSeqRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [appliedContext, appliedSeason, appliedTemperature, appliedVibe, fetchWardrobeItemsByIds, lockedItem, resolveLook, userId]);

  useEffect(() => {
    if (booting || !userId || !lockedItem?.id) return;
    const timeout = setTimeout(() => {
      void generateLooks();
    }, 350);

    return () => clearTimeout(timeout);
  }, [booting, userId, lockedItem?.id, appliedVibe, appliedContext, appliedSeason, appliedTemperature, refreshTick, generateLooks]);

  const hasPendingRefineChanges =
    draftVibe.trim() !== appliedVibe ||
    draftContext.trim() !== appliedContext ||
    normalizeSeason(draftSeason) !== appliedSeason ||
    (draftTemperature.trim() || DEFAULT_TEMPERATURE) !== appliedTemperature;

  const activeRefineSummary = [
    formatRefineChip('Vibe', appliedVibe),
    formatRefineChip('Context', appliedContext),
    formatRefineChip('Season', appliedSeason !== 'all' ? appliedSeason : ''),
    formatRefineChip('Temp', appliedTemperature ? `${appliedTemperature}F` : ''),
  ].filter(Boolean) as string[];

  const applyRefineChanges = useCallback(() => {
    if (loading || !hasPendingRefineChanges) return;
    setRecentLookHistory([]);
    setSelectedLookId(null);
    setPreviewLookId(null);
    setActiveReasonItemId(null);
    setAppliedVibe(draftVibe.trim());
    setAppliedContext(draftContext.trim());
    setAppliedSeason(normalizeSeason(draftSeason));
    setAppliedTemperature(draftTemperature.trim() || DEFAULT_TEMPERATURE);
  }, [draftContext, draftSeason, draftTemperature, draftVibe, hasPendingRefineChanges, loading]);

  const handleSaveLook = useCallback(
    async (look: ResolvedLook) => {
      if (!userId) return;

      const saveAccess = await canUseFeature(userId, 'saved_outfit');
      if (!saveAccess.allowed) {
        setUpgradeModal(buildUpgradeModalState('saved_outfit', saveAccess));
        return;
      }

      setSavingLookId(look.id);
      try {
        const mixedItems = look.canvasItems.map((item) =>
          normalizeSavedOutfitLikeItem({
            ...item,
            source_type:
              item.source_type || (isExternalItemLike(item as any) ? 'external' : 'wardrobe'),
            source_item_id:
              item.source_item_id ||
              (item.source_type === 'external'
                ? item.external_item_id || item.id || null
                : item.id || null),
            reason: item.reason,
            locked: item.locked,
            layout: item.layout,
            outfit_role: item.outfit_role || item.main_category || item.category || item.type || null,
          }),
        );

        await saveMixedOutfit({
          userId,
          name: `Styled: ${look.title || lockedItem?.name || 'Look'}`,
          context: appliedContext || null,
          season: appliedSeason !== 'all' ? appliedSeason : null,
          items: mixedItems,
          lockedItemId: isExternalItemLike(lockedItem as any) ? null : lockedItem?.id || null,
          sourceKind: 'styled',
        });

        Alert.alert('Saved', 'This look is now in your saved outfits.');
      } catch (error: any) {
        if (isSubscriptionLimitError(error)) {
          setUpgradeModal(buildUpgradeModalState(error.featureName, error.accessResult));
          return;
        }
        console.error('Save look failed:', error?.message || error);
        Alert.alert('Error', error?.message || 'Could not save this look.');
      } finally {
        if (mountedRef.current) setSavingLookId(null);
      }
    },
    [appliedContext, appliedSeason, lockedItem, userId],
  );

  const handleTryOnLook = useCallback(
    (look: ResolvedLook) => {
      if (!baseModelUrl) {
        const message =
          modelStatus === 'processing'
            ? 'Your try-on model is still being prepared. Open setup to check its progress.'
            : 'Generate your try-on model once, then you can preview any styled look.';

        Alert.alert('Set up try-on', message, [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open setup',
            onPress: () => navigation.navigate('OnboardingModal'),
          },
        ]);
        return;
      }

      navigation.navigate('TryOn', {
        items: look.items,
        outfit: look.items,
        baseModelUrl,
        lockedItem,
      });
    },
    [baseModelUrl, lockedItem, modelStatus, navigation],
  );

  const selectedLook = useMemo(
    () => looks.find((look) => look.id === selectedLookId) || null,
    [looks, selectedLookId],
  );
  const previewLook = useMemo(
    () => looks.find((look) => look.id === previewLookId) || null,
    [looks, previewLookId],
  );
  const selectedReasonItems = useMemo(
    () => buildOutfitCanvasReasons(selectedLook?.canvasItems || []),
    [selectedLook?.canvasItems],
  );
  const selectedLookChips = useMemo(
    () =>
      [
        appliedVibe || null,
        formatSeasonLabel(appliedSeason),
        appliedTemperature ? `${appliedTemperature}°F` : null,
        selectedLook?.canvasItems?.length ? `${selectedLook.canvasItems.length} pieces` : null,
      ].filter(Boolean) as string[],
    [appliedSeason, appliedTemperature, appliedVibe, selectedLook?.canvasItems?.length],
  );

  if (booting) {
    return (
      <SafeAreaView style={styles.screenWrapper}>
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#1c1c1c" />
          <Text style={styles.centerStateText}>Loading your styling workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {selectedLook ? selectedLook.title : 'Style This Item'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (selectedLook) {
              setSelectedLookId(null);
              setActiveReasonItemId(null);
              return;
            }
            setRefreshTick((value) => value + 1);
          }}
          style={[styles.refreshButton, loading && !selectedLook && styles.refreshButtonDisabled]}
          disabled={loading && !selectedLook}
        >
          <Text style={styles.refreshButtonText}>
            {selectedLook ? 'Back to Looks' : loading ? 'Refreshing...' : 'Refresh Looks'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {!selectedLook ? (
          <View style={styles.anchorCard}>
            {lockedItem?.cutout_url || lockedItem?.cutout_image_url || lockedItem?.image_path || lockedItem?.image_url ? (
              <WardrobeItemImage item={lockedItem} style={styles.anchorImage} />
            ) : (
              <View style={styles.anchorImagePlaceholder} />
            )}
            <View style={styles.anchorCopy}>
              <Text style={styles.anchorEyebrow}>Anchor Item</Text>
              <Text style={styles.anchorTitle}>{lockedItem?.name || lockedItem?.type || 'Selected Item'}</Text>
              <Text style={styles.anchorSub}>All looks below stay built around this piece.</Text>
            </View>
          </View>
        ) : null}

        {!baseModelUrl ? (
          <TouchableOpacity style={styles.modelBanner} onPress={() => navigation.navigate('OnboardingModal')}>
            <Text style={styles.modelBannerTitle}>Set up try-on to preview these looks</Text>
            <Text style={styles.modelBannerText}>
              {modelStatus === 'processing'
                ? 'Your model is still generating. Open setup to check progress.'
                : 'Generate your model once and each look can jump straight into try-on.'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.refineToggle} onPress={() => setShowRefine((value) => !value)}>
          <View style={styles.refineToggleCopy}>
            <Text style={styles.refineToggleEyebrow}>Styling Controls</Text>
            <Text style={styles.refineToggleTitle}>Refine the brief</Text>
            <Text style={styles.refineToggleSub}>
              {activeRefineSummary.length ? activeRefineSummary.join('  ·  ') : 'No active refine inputs yet'}
            </Text>
          </View>
          <View style={styles.refineToggleAction}>
            <Text style={styles.refineToggleActionText}>{showRefine ? 'Close' : 'Open'}</Text>
          </View>
        </TouchableOpacity>

        {showRefine ? (
          <View style={styles.refinePanel}>
            <Text style={styles.fieldLabel}>Vibe</Text>
            <TextInput
              value={draftVibe}
              onChangeText={setDraftVibe}
              placeholder="casual, elevated, streetwear..."
              placeholderTextColor="rgba(28, 28, 28, 0.52)"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Context</Text>
            <TextInput
              value={draftContext}
              onChangeText={setDraftContext}
              placeholder="coffee meeting, weekend errands, dinner..."
              placeholderTextColor="rgba(28, 28, 28, 0.52)"
              style={[styles.input, styles.inputTall]}
              multiline
            />

            <Text style={styles.fieldLabel}>Season</Text>
            <View style={styles.seasonRow}>
              {SEASON_OPTIONS.map((option) => {
                const active = draftSeason === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setDraftSeason(option)}
                    style={[styles.seasonChip, active && styles.seasonChipActive]}
                  >
                    <Text style={[styles.seasonChipText, active && styles.seasonChipTextActive]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Temperature</Text>
            <TextInput
              value={draftTemperature}
              onChangeText={setDraftTemperature}
              placeholder="72"
              placeholderTextColor="rgba(28, 28, 28, 0.52)"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.refineHint}>Draft changes stay local until you apply them.</Text>

            <TouchableOpacity
              style={[styles.applyButton, (!hasPendingRefineChanges || loading) && styles.applyButtonDisabled]}
              onPress={applyRefineChanges}
              disabled={!hasPendingRefineChanges || loading}
            >
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#1c1c1c" />
            <Text style={styles.centerStateText}>Styling up to three distinct looks...</Text>
          </View>
        ) : null}

        {!loading && looks.length > 0 && looks.length < 3 ? (
          <View style={styles.limitedBanner}>
            <Text style={styles.limitedBannerEyebrow}>Styling Note</Text>
            <Text style={styles.limitedBannerText}>
              Showing {looks.length} look{looks.length === 1 ? '' : 's'}. Your current closet does not support three
              strong variations for this anchor yet.
            </Text>
          </View>
        ) : null}

        {!loading && looks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No styled looks yet</Text>
            <Text style={styles.emptyStateText}>
              Refresh the set or loosen the refine inputs if this item has very few matching pieces.
            </Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={() => setRefreshTick((value) => value + 1)}>
              <Text style={styles.emptyStateButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !selectedLook && looks.length > 0 ? (
          <View style={styles.gallerySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Look options</Text>
              <Text style={styles.sectionText}>Tap a board to open it. Long press for a quick preview.</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRail}>
              {looks.map((look) => (
                <OutfitPreviewCard
                  key={look.id}
                  title={look.title}
                  summary={look.summary}
                  items={look.canvasItems}
                  selected={selectedLookId === look.id}
                  onPress={() => {
                    setSelectedLookId(look.id);
                    setActiveReasonItemId(null);
                  }}
                  onLongPress={() => setPreviewLookId(look.id)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!loading && selectedLook ? (
          <View style={styles.fullViewStack}>
            <OutfitSummaryCard
              eyebrow="Look option"
              title={selectedLook.title}
              summary={selectedLook.summary || 'A wearable combination built around your selected piece.'}
              chips={selectedLookChips}
            />

            <OutfitCanvas
              items={selectedLook.canvasItems}
              highlightedItemId={activeReasonItemId}
              onPressItem={setActiveReasonItemId}
            />

            <WhyItWorksPanel
              summary={selectedLook.summary || 'Built around your locked anchor item.'}
              items={selectedReasonItems}
              activeItemId={activeReasonItemId}
              onChangeActiveItemId={setActiveReasonItemId}
            />

            <View style={styles.fullActionsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.secondaryAction, savingLookId === selectedLook.id && styles.disabledButton]}
                onPress={() => handleTryOnLook(selectedLook)}
              >
                <Text style={styles.secondaryActionText}>Try On</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.primaryAction, savingLookId === selectedLook.id && styles.disabledButton]}
                onPress={() => {
                  void handleSaveLook(selectedLook);
                }}
                disabled={savingLookId === selectedLook.id}
              >
                <Text style={styles.primaryActionText}>
                  {savingLookId === selectedLook.id ? 'Saving...' : 'Save Fit'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => {
                setSelectedLookId(null);
                setActiveReasonItemId(null);
              }}
              style={styles.backToLooksButton}
            >
              <Text style={styles.backToLooksText}>Back to Looks</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <OutfitPreviewModal
        visible={Boolean(previewLook)}
        title={previewLook?.title || 'Styled Look'}
        summary={previewLook?.summary || null}
        items={previewLook?.canvasItems || []}
        saving={savingLookId === previewLook?.id}
        onClose={() => setPreviewLookId(null)}
        onOpenFullView={() => {
          if (!previewLook) return;
          setSelectedLookId(previewLook.id);
          setPreviewLookId(null);
          setActiveReasonItemId(null);
        }}
        onSave={() => {
          if (!previewLook) return;
          void handleSaveLook(previewLook);
        }}
      />
      <UpgradeLimitModal
        visible={upgradeModal.visible}
        featureName={upgradeModal.featureName}
        used={upgradeModal.used}
        limit={upgradeModal.limit}
        remaining={upgradeModal.remaining}
        tier={upgradeModal.tier}
        recommendedUpgrade={upgradeModal.recommendedUpgrade}
        isPaywallAvailable={isPaywallAvailable}
        onClose={() => setUpgradeModal(HIDDEN_UPGRADE_MODAL_STATE)}
        onUpgrade={() => {
          void openUpgrade();
        }}
        onBuyTryOnPack={() => {
          void openTryOnPack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#fafaff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaff',
    borderWidth: 1,
    borderColor: '#daddd8',
  },
  headerIcon: {
    fontSize: 22,
    color: '#1c1c1c',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  refreshButton: {
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  refreshButtonDisabled: {
    opacity: 0.65,
  },
  refreshButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.72)',
  },
  scrollArea: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  anchorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  anchorImage: {
    width: 106,
    height: 106,
  },
  anchorImagePlaceholder: {
    width: 106,
    height: 106,
    borderRadius: 20,
    backgroundColor: '#eef0f2',
  },
  anchorCopy: {
    flex: 1,
    marginLeft: 14,
  },
  anchorEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
  },
  anchorTitle: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  anchorSub: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  modelBanner: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#f2efe9',
    padding: 16,
  },
  modelBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  modelBannerText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  refineToggle: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refineToggleCopy: {
    flex: 1,
    marginRight: 12,
  },
  refineToggleEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
  },
  refineToggleTitle: {
    marginTop: 5,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  refineToggleSub: {
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(28, 28, 28, 0.68)',
  },
  refineToggleAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fafaff',
  },
  refineToggleActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.72)',
  },
  refinePanel: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  fieldLabel: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1c1c1c',
  },
  inputTall: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
  },
  seasonChipActive: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  seasonChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.72)',
  },
  seasonChipTextActive: {
    color: '#ffffff',
  },
  refineHint: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(28, 28, 28, 0.62)',
  },
  applyButton: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1c',
  },
  applyButtonDisabled: {
    opacity: 0.45,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  centerStateText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  limitedBanner: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#f6f6fb',
    padding: 15,
  },
  limitedBannerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.52)',
  },
  limitedBannerText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  emptyState: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyStateTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  emptyStateText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  emptyStateButton: {
    marginTop: 14,
    minHeight: 44,
    minWidth: 130,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 16,
  },
  emptyStateButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  gallerySection: {
    marginTop: 18,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  sectionText: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(28, 28, 28, 0.68)',
  },
  previewRail: {
    paddingRight: 8,
  },
  fullViewStack: {
    marginTop: 18,
    gap: 14,
  },
  fullActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.78)',
  },
  primaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#1c1c1c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  backToLooksButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  backToLooksText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.64)',
  },
  bottomSpace: {
    height: 28,
  },
});
