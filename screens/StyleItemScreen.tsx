import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiPost } from '../lib/api';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { toStyleRequestWardrobeItem, toStyleRequestWardrobeList } from '../lib/styleRequestWardrobe';
import { supabase } from '../lib/supabase';
import { isExternalItemLike } from '../lib/wardrobePayload';
import StyledLookCard from '../components/style/StyledLookCard';
import WardrobeItemImage from '../components/Closet/WardrobeItemImage';
import { saveMixedOutfit } from '../services/savedOutfitService';
import { normalizeSavedOutfitLikeItem } from '../utils/styleCanvasAdapters';

const DISPLAY_ORDER = ['outerwear', 'layer', 'onepiece', 'top', 'bottom', 'shoes', 'accessory'];
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
  'image_path',
  'primary_color',
  'secondary_colors',
  'pattern_description',
  'vibe_tags',
  'season',
  'meta',
  'wardrobe_status',
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
const STYLE_WARDROBE_SELECT_FIELDS = [...STYLE_WARDROBE_BASE_FIELDS, ...STYLE_WARDROBE_OPTIONAL_FIELDS].join(', ');
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
  image_url?: string;
  image_path?: string;
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
  outfit: Array<{ id: string; reason?: string }>;
  steps?: Record<string, { id: string; reason?: string }>;
};

type ResolvedLook = {
  id: string;
  title: string;
  summary: string;
  items: WardrobeItem[];
  rawOutfit: Array<{ id: string; reason?: string }>;
};

function normalizeSeason(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return SEASON_OPTIONS.includes(normalized) ? normalized : 'all';
}

function sortItems(items: WardrobeItem[]) {
  return items
    .slice()
    .sort(
      (left, right) =>
        DISPLAY_ORDER.indexOf(left.main_category || '') - DISPLAY_ORDER.indexOf(right.main_category || '')
    );
}

function formatRefineChip(label: string, value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return `${label}: ${normalized}`;
}

export default function StyleItemScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const routeItem = params?.item as WardrobeItem | undefined;

  const [lockedItem, setLockedItem] = useState<WardrobeItem | undefined>(routeItem);
  const [draftVibe, setDraftVibe] = useState('');
  const [draftContext, setDraftContext] = useState('');
  const [draftSeason, setDraftSeason] = useState(normalizeSeason(routeItem?.season));
  const [draftTemperature, setDraftTemperature] = useState(DEFAULT_TEMPERATURE);
  const [appliedVibe, setAppliedVibe] = useState('');
  const [appliedContext, setAppliedContext] = useState('');
  const [appliedSeason, setAppliedSeason] = useState(normalizeSeason(routeItem?.season));
  const [appliedTemperature, setAppliedTemperature] = useState(DEFAULT_TEMPERATURE);
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
    setDraftVibe('');
    setDraftContext('');
    setDraftSeason(normalizeSeason(routeItem?.season));
    setDraftTemperature(DEFAULT_TEMPERATURE);
    setAppliedVibe('');
    setAppliedContext('');
    setAppliedSeason(normalizeSeason(routeItem?.season));
    setAppliedTemperature(DEFAULT_TEMPERATURE);
    setLooks([]);
    setRecentLookHistory([]);
    setShowRefine(false);
    setRefreshTick(0);
  }, [routeItem?.id]);

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

      const [items, profile] = await Promise.all([fetchWardrobe(uid), fetchProfile(uid)]);
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
    } catch (error: any) {
      console.error('❌ Style screen hydration failed:', error?.message || error);
      if (mountedRef.current) {
        Alert.alert('Error', 'Could not load your styling data.');
      }
    } finally {
      if (mountedRef.current) setBooting(false);
    }
  }, [fetchProfile, fetchWardrobe, lockedItem, navigation, resolveUser]);

  useEffect(() => {
    mountedRef.current = true;
    hydrate();
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
              console.warn('⚠️ Styled item missing from local wardrobe map:', entry?.id);
              return null;
            }
            return { ...match, reason: entry?.reason };
          })
          .filter(Boolean) as WardrobeItem[]
      );

      return {
        id: look?.id || `look_${index + 1}`,
        title: look?.title || `Styled Look ${index + 1}`,
        summary: look?.summary || 'A wearable combination built around your selected piece.',
        items: resolvedItems,
        rawOutfit: Array.isArray(look?.outfit) ? look.outfit : [],
      };
    },
    []
  );

  const generateLooks = useCallback(async () => {
    if (!userId || !lockedItem?.id) return;

    const requestId = ++requestSeqRef.current;
    const sourceWardrobe =
      lockedItem?.id && !wardrobeRef.current.find((item) => item.id === lockedItem.id)
        ? [lockedItem, ...wardrobeRef.current]
        : wardrobeRef.current;
    const avoidIds = Array.from(
      new Set(
        looksRef.current
          .flatMap((look) => look.items.map((item) => item.id))
          .filter((id) => id && id !== lockedItem.id)
      )
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

      const result = await response.json();
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
            .flatMap((look: LookEntry) => Array.isArray(look?.outfit) ? look.outfit.map((entry) => entry?.id) : [])
            .filter((id: string) => id && !sourceWardrobe.find((item) => item.id === id))
        )
      );
      const fetchedMissingItems = missingIds.length
        ? await fetchWardrobeItemsByIds(userId, missingIds)
        : [];
      const mergedWardrobe = Array.from(
        new Map(
          [...sourceWardrobe, ...fetchedMissingItems]
            .filter(Boolean)
            .map((item) => [item.id, item])
        ).values()
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
      setRecentLookHistory((previous) =>
        [...previous.slice(-6), ...resolvedLooks.map((look) => look.items.map((item) => item.id))].slice(-12)
      );
    } catch (error: any) {
      if (requestId !== requestSeqRef.current || !mountedRef.current) return;
      console.error('❌ Styling fetch failed:', error?.message || error);
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
      generateLooks();
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
    setAppliedVibe(draftVibe.trim());
    setAppliedContext(draftContext.trim());
    setAppliedSeason(normalizeSeason(draftSeason));
    setAppliedTemperature(draftTemperature.trim() || DEFAULT_TEMPERATURE);
  }, [draftContext, draftSeason, draftTemperature, draftVibe, hasPendingRefineChanges, loading]);

  const handleSaveLook = useCallback(
    async (look: ResolvedLook) => {
      if (!userId) return;

      setSavingLookId(look.id);
      try {
        const mixedItems = look.items.map((item) =>
          normalizeSavedOutfitLikeItem({
            ...item,
            source_type: isExternalItemLike(item as any) ? 'external' : 'wardrobe',
            source_item_id:
              isExternalItemLike(item as any)
                ? item.external_item_id || item.id || null
                : item.id || null,
            reason: item.reason,
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
        console.error('❌ Save look failed:', error?.message || error);
        Alert.alert('Error', error?.message || 'Could not save this look.');
      } finally {
        if (mountedRef.current) setSavingLookId(null);
      }
    },
    [appliedContext, appliedSeason, lockedItem, userId]
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
    [baseModelUrl, lockedItem, modelStatus, navigation]
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
        <Text style={styles.headerTitle}>Style This Item</Text>
        <TouchableOpacity
          onPress={() => setRefreshTick((value) => value + 1)}
          style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>{loading ? 'Refreshing...' : 'Refresh Looks'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.anchorCard}>
          {lockedItem?.image_path || lockedItem?.image_url ? (
            <WardrobeItemImage item={lockedItem} style={styles.anchorImage} />
          ) : (
            <View style={styles.anchorImagePlaceholder} />
          )}
          <View style={styles.anchorCopy}>
            <Text style={styles.anchorEyebrow}>Anchor Item</Text>
            <Text style={styles.anchorTitle}>{lockedItem?.name || lockedItem?.type || 'Selected Item'}</Text>
            <Text style={styles.anchorSub}>
              All looks below stay built around this piece.
            </Text>
          </View>
        </View>

        {!baseModelUrl ? (
          <TouchableOpacity
            style={styles.modelBanner}
            onPress={() => navigation.navigate('OnboardingModal')}
          >
            <Text style={styles.modelBannerTitle}>Set up try-on to preview these looks</Text>
            <Text style={styles.modelBannerText}>
              {modelStatus === 'processing'
                ? 'Your model is still generating. Open setup to check progress.'
                : 'Generate your model once and each look card can jump straight into try-on.'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.refineToggle}
          onPress={() => setShowRefine((value) => !value)}
        >
          <View style={styles.refineToggleCopy}>
            <Text style={styles.refineToggleEyebrow}>Styling Controls</Text>
            <Text style={styles.refineToggleTitle}>Refine the brief</Text>
            <Text style={styles.refineToggleSub}>
              {activeRefineSummary.length
                ? activeRefineSummary.join('  ·  ')
                : 'No active refine inputs yet'}
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

            <Text style={styles.refineHint}>
              Draft changes stay local until you apply them.
            </Text>

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
              Showing {looks.length} look{looks.length === 1 ? '' : 's'}. Your current closet does not support
              three strong variations for this anchor yet.
            </Text>
          </View>
        ) : null}

        {!loading && looks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No styled looks yet</Text>
            <Text style={styles.emptyStateText}>
              Refresh the set or loosen the refine inputs if this item has very few matching pieces.
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setRefreshTick((value) => value + 1)}
            >
              <Text style={styles.emptyStateButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {looks.map((look) => (
          <StyledLookCard
            key={look.id}
            look={look}
            lockedItemId={lockedItem?.id}
            onTryOn={() => handleTryOnLook(look)}
            onSave={() => handleSaveLook(look)}
            saving={savingLookId === look.id}
          />
        ))}

        <View style={{ height: 28 }} />
      </ScrollView>
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
    paddingBottom: 32,
  },
  anchorCard: {
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#1c1c1c',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  anchorImage: {
    width: 92,
    height: 122,
    borderRadius: 14,
    backgroundColor: '#eef0f2',
  },
  anchorImagePlaceholder: {
    width: 92,
    height: 122,
    borderRadius: 14,
    backgroundColor: '#eef0f2',
  },
  anchorCopy: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  anchorEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.72)',
  },
  anchorTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  anchorSub: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  modelBanner: {
    backgroundColor: '#1c1c1c',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  modelBannerTitle: {
    color: '#fafaff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  modelBannerText: {
    color: '#daddd8',
    fontSize: 12.5,
    lineHeight: 18,
  },
  refineToggle: {
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  refineToggleCopy: {
    flex: 1,
  },
  refineToggleEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.72)',
    marginBottom: 2,
  },
  refineToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  refineToggleSub: {
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(28, 28, 28, 0.72)',
    marginTop: 2,
  },
  refineToggleAction: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#daddd8',
  },
  refineToggleActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(28, 28, 28, 0.72)',
  },
  refinePanel: {
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    padding: 14,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(28, 28, 28, 0.72)',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#daddd8',
    backgroundColor: '#fafaff',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1c1c1c',
  },
  inputTall: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  seasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  seasonChip: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#eef0f2',
    borderWidth: 1,
    borderColor: '#daddd8',
  },
  seasonChipActive: {
    backgroundColor: '#1c1c1c',
    borderColor: '#1c1c1c',
  },
  seasonChipText: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 12,
    fontWeight: '600',
  },
  seasonChipTextActive: {
    color: '#fafaff',
  },
  refineHint: {
    marginTop: 10,
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 11.5,
  },
  applyButton: {
    marginTop: 12,
    backgroundColor: '#1c1c1c',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.55,
  },
  applyButtonText: {
    color: '#fafaff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  centerStateText: {
    fontSize: 14,
    color: 'rgba(28, 28, 28, 0.72)',
  },
  limitedBanner: {
    backgroundColor: '#eef0f2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#daddd8',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  limitedBannerEyebrow: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  limitedBannerText: {
    color: 'rgba(28, 28, 28, 0.72)',
    fontSize: 12.5,
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: '#fafaff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#daddd8',
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1c1c1c',
    marginBottom: 6,
  },
  emptyStateText: {
    textAlign: 'center',
    color: 'rgba(28, 28, 28, 0.72)',
    lineHeight: 19,
    marginBottom: 14,
  },
  emptyStateButton: {
    backgroundColor: '#1c1c1c',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: '#fafaff',
    fontWeight: '700',
  },
});
