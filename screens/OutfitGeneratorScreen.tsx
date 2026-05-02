import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SaveGeneratedOutfitModal from '../components/OutfitGenerator/SaveGeneratedOutfitModal';
import CreateTravelCollectionModal from '../components/SavedOutfits/CreateTravelCollectionModal';
import UpgradeLimitModal from '../components/subscriptions/UpgradeLimitModal';
import { useUpgradeWall } from '../hooks/useUpgradeWall';
import { apiPostWithRateLimitRetry, isRateLimitedResponse } from '../lib/api';
import { isSubscriptionLimitError } from '../lib/subscriptions/errors';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../lib/subscriptions/modalState';
import { canUseFeature, incrementUsage } from '../lib/subscriptions/usageService';
import { toStyleRequestWardrobeList } from '../lib/styleRequestWardrobe';
import { fetchStyleContextSignals } from '../lib/styleProfile';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import FloatingGeneratorActions from '../components/OutfitGenerator/FloatingGeneratorActions';
import QuickPickChips from '../components/OutfitGenerator/QuickPickChips';
import SeasonSelector from '../components/OutfitGenerator/SeasonSelector';
import StylistBriefHeader from '../components/OutfitGenerator/StylistBriefHeader';
import TemperatureInputCard from '../components/OutfitGenerator/TemperatureInputCard';
import OutfitCanvas from '../components/OutfitCanvas/OutfitCanvas';
import OutfitSummaryCard from '../components/OutfitCanvas/OutfitSummaryCard';
import WhyItWorksPanel from '../components/OutfitCanvas/WhyItWorksPanel';
import {
  buildFateContext,
  type FateContext,
} from '../utils/buildFateContext';
import { saveMixedOutfit } from '../services/savedOutfitService';
import { createTravelCollection, fetchTravelCollections } from '../services/travelCollectionsService';
import { normalizeSavedOutfitLikeItem } from '../utils/styleCanvasAdapters';
import { useOptionalBottomTabBarHeight } from '../lib/useOptionalBottomTabBarHeight';
import type { TravelCollectionDraft } from '../types/travelCollections';
import { buildOutfitCanvasItems, buildOutfitCanvasReasons } from '../components/OutfitCanvas/utils';

const DISPLAY_ORDER = ['outerwear', 'base_top', 'top_layer', 'onepiece', 'bottom', 'shoes', 'accessory'];
const VALID_SEASONS = ['spring', 'summer', 'fall', 'winter', 'all'];
const VIBE_OPTIONS = ['Casual', 'Elevated', 'Clean', 'Streetwear', 'Confident', 'Date Night'];
const FATE_WARDROBE_SELECT_FIELDS =
  'id, name, type, main_category, subcategory, primary_color, secondary_colors, vibe_tags, season, pattern_description, fit_type, silhouette, formality, occasion_tags, layering_role, garment_function, style_role, material_guess, weather_use, fit_notes, cutout_image_url, cutout_thumbnail_url, cutout_display_url';
const FATE_WARDROBE_MEDIA_FALLBACK_SELECT_FIELDS =
  'id, name, type, main_category, subcategory, primary_color, secondary_colors, vibe_tags, season, pattern_description, cutout_image_url, cutout_thumbnail_url, cutout_display_url';
const FATE_WARDROBE_FALLBACK_SELECT_FIELDS =
  'id, name, type, main_category, primary_color, secondary_colors, vibe_tags, season, pattern_description';
const GENERATOR_WARDROBE_SELECT_FIELDS =
  'id, user_id, name, type, main_category, subcategory, image_url, image_path, thumbnail_url, display_image_url, cutout_image_url, cutout_thumbnail_url, cutout_display_url, primary_color, secondary_colors, pattern_description, vibe_tags, season, layering_role, garment_function, style_role, material_guess, weather_use, fit_notes, meta';
const GENERATOR_WARDROBE_MEDIA_FALLBACK_SELECT_FIELDS =
  'id, user_id, name, type, main_category, subcategory, image_url, image_path, cutout_image_url, cutout_thumbnail_url, cutout_display_url, primary_color, secondary_colors, pattern_description, vibe_tags, season, meta';
const GENERATOR_WARDROBE_FALLBACK_SELECT_FIELDS =
  'id, user_id, name, type, main_category, image_url, image_path, primary_color, secondary_colors, pattern_description, vibe_tags, season, meta';

type GeneratorRouteParams = {
  initialMode?: 'regular' | 'travel';
  initialTravelCollectionId?: string;
  initialActivityLabel?: string;
  prefillNonce?: string | number;
};

function animateTransition() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMissingColumnError(error: any, field: string) {
  const normalized = String(error?.message || error?.details || '')
    .trim()
    .toLowerCase();
  const target = field.toLowerCase();
  return (
    normalized.includes(`profiles.${target}`) ||
    normalized.includes(`user_style_profiles.${target}`) ||
    normalized.includes(`wardrobe.${target}`) ||
    normalized.includes(`'${target}' column`) ||
    (normalized.includes('does not exist') && normalized.includes(target))
  );
}

function isMissingWardrobeEnhancementError(error: any) {
  return [
    'subcategory',
    'fit_type',
    'silhouette',
    'occasion_tags',
    'formality',
    'layering_role',
    'garment_function',
    'style_role',
    'material_guess',
    'weather_use',
    'fit_notes',
    'cutout_image_url',
    'cutout_thumbnail_url',
    'cutout_display_url',
  ].some((field) => isMissingColumnError(error, field));
}

function getDisplayRole(item: any) {
  const explicitRole = String(item?.outfit_role || '').trim().toLowerCase();
  if (DISPLAY_ORDER.includes(explicitRole)) return explicitRole;

  const category = String(item?.main_category || '').trim().toLowerCase();
  if (category === 'top') return 'base_top';
  return category;
}

function formatSeasonValue(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Any season';
  if (normalized.toLowerCase() === 'all') return 'Any season';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildRefineSummary(season: string, temperature: string) {
  return [formatSeasonValue(season), temperature ? `${temperature}°F` : null]
    .filter(Boolean)
    .join(' • ');
}

function buildSavedContextSummary(prompt: string, selectedVibeChip: string, season: string, temperature: string) {
  const brief = [selectedVibeChip, prompt].filter(Boolean).join(' • ') || 'Generated look';
  const weather = [temperature ? `${temperature}°F` : null, season ? formatSeasonValue(season) : null]
    .filter(Boolean)
    .join(' ');

  return weather ? `${brief} in ${weather}` : brief;
}

function formatGeneratorErrorMessage(message?: string | null) {
  const normalized = String(message || '').trim();
  if (!normalized) {
    return 'Generation failed. Please try again.';
  }

  const lowered = normalized.toLowerCase();
  if (
    lowered.includes('too many requests') ||
    lowered.includes('rate limit') ||
    lowered.includes('rate-limit') ||
    lowered.includes('rate limited') ||
    lowered.includes('rate-limited')
  ) {
    return 'Generation is temporarily rate-limited. Please wait a moment and try again.';
  }

  return normalized;
}

function InputSection({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9f958a"
        style={styles.input}
      />
    </View>
  );
}

function LoadingCard({
  title,
  step,
}: {
  title: string;
  step: string;
}) {
  return (
    <View style={styles.loadingCard}>
      <Text style={styles.loadingEyebrow}>Stylist at work</Text>
      <Text style={styles.loadingTitle}>{title}</Text>
      <Text style={styles.loadingText}>{step}</Text>
    </View>
  );
}

export default function OutfitGeneratorScreen() {
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = ((route as any)?.params || {}) as GeneratorRouteParams;
  const lastAppliedPrefillRef = useRef('');
  const saveNameRequestRef = useRef(0);
  const saveNameDirtyRef = useRef(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedVibeChip, setSelectedVibeChip] = useState('');
  const [season, setSeason] = useState('');
  const [temperature, setTemperature] = useState('');
  const [refineOpen, setRefineOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outfit, setOutfit] = useState<any[]>([]);
  const [lockedItems, setLockedItems] = useState<any[]>([]);
  const [activeReasonItemId, setActiveReasonItemId] = useState<string | null>(null);
  const [mode, setMode] = useState<'form' | 'generated'>('form');
  const [currentStep, setCurrentStep] = useState('');
  const [recentGenerationHistory, setRecentGenerationHistory] = useState<string[][]>([]);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [cachedFateContext, setCachedFateContext] = useState<FateContext | null>(null);
  const [fateVariantIndex, setFateVariantIndex] = useState(0);
  const [recentFateKeys, setRecentFateKeys] = useState<string[]>([]);
  const [savePrefillMode, setSavePrefillMode] = useState<'regular' | 'travel'>('regular');
  const [savePrefillTravelCollectionId, setSavePrefillTravelCollectionId] = useState('');
  const [savePrefillActivityLabel, setSavePrefillActivityLabel] = useState('');
  const [travelCollections, setTravelCollections] = useState<any[]>([]);
  const [travelCollectionsLoading, setTravelCollectionsLoading] = useState(false);
  const [travelCollectionModalVisible, setTravelCollectionModalVisible] = useState(false);
  const [creatingTravelCollection, setCreatingTravelCollection] = useState(false);
  const [saveSheetVisible, setSaveSheetVisible] = useState(false);
  const [saveSheetMode, setSaveSheetMode] = useState<'regular' | 'travel'>('regular');
  const [saveSheetName, setSaveSheetName] = useState('Untitled Fit');
  const [saveSheetNameLoading, setSaveSheetNameLoading] = useState(false);
  const [saveSheetTravelCollectionId, setSaveSheetTravelCollectionId] = useState('');
  const [saveSheetActivityLabel, setSaveSheetActivityLabel] = useState('');
  const [saveSheetDayLabel, setSaveSheetDayLabel] = useState('');
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();

  const finalSeason = VALID_SEASONS.includes(season.toLowerCase())
    ? season.toLowerCase()
    : 'all';

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        Alert.alert('Authentication Required', 'Please log in to generate outfits.');
        return;
      }
      setUserId(data.user.id);
    };
    void getUser();
  }, []);

  useEffect(() => {
    setRecentGenerationHistory([]);
  }, [prompt, selectedVibeChip, season, temperature]);

  const getRecentGeneratedIds = () =>
    Array.from(new Set(recentGenerationHistory.flat().filter(Boolean)));

  const resolveCurrentUserId = useCallback(async () => {
    if (userId) return userId;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error('Please log in to use surprise modes.');
    }
    setUserId(data.user.id);
    return data.user.id;
  }, [userId]);

  const loadTravelCollectionOptions = useCallback(
    async (uidArg?: string | null) => {
      try {
        setTravelCollectionsLoading(true);
        const uid = uidArg || (await resolveCurrentUserId());
        const collections = await fetchTravelCollections(uid);
        setTravelCollections(collections);
      } catch (error: any) {
        console.error('Failed to load travel collections:', error?.message || error);
      } finally {
        setTravelCollectionsLoading(false);
      }
    },
    [resolveCurrentUserId],
  );

  useEffect(() => {
    if (!isFocused) return;
    if (!savePrefillTravelCollectionId && !saveSheetVisible && !travelCollectionModalVisible) return;
    void loadTravelCollectionOptions();
  }, [isFocused, loadTravelCollectionOptions, savePrefillTravelCollectionId, saveSheetVisible, travelCollectionModalVisible]);

  useEffect(() => {
    const nextPrefillKey = String(routeParams?.prefillNonce || '').trim();
    if (!nextPrefillKey || lastAppliedPrefillRef.current === nextPrefillKey) return;

    lastAppliedPrefillRef.current = nextPrefillKey;
    const nextTravelCollectionId = String(routeParams.initialTravelCollectionId || '').trim();

    setSavePrefillMode(routeParams.initialMode === 'travel' || nextTravelCollectionId ? 'travel' : 'regular');
    setSavePrefillTravelCollectionId(nextTravelCollectionId);
    setSavePrefillActivityLabel(typeof routeParams.initialActivityLabel === 'string' ? routeParams.initialActivityLabel : '');
  }, [routeParams]);

  const tripContextCollection = useMemo(
    () => travelCollections.find((collection) => String(collection?.id || '') === savePrefillTravelCollectionId) || null,
    [savePrefillTravelCollectionId, travelCollections],
  );

  const saveSheetSelectedTravelCollection = useMemo(
    () => travelCollections.find((collection) => String(collection?.id || '') === saveSheetTravelCollectionId) || null,
    [saveSheetTravelCollectionId, travelCollections],
  );

  const lockedItemIds = useMemo(
    () => lockedItems.map((item) => String(item?.id || '').trim()).filter(Boolean),
    [lockedItems],
  );

  const generatedCanvasItems = useMemo(
    () => buildOutfitCanvasItems(outfit, { lockedIds: lockedItemIds }),
    [lockedItemIds, outfit],
  );

  const generatedReasonItems = useMemo(
    () => buildOutfitCanvasReasons(generatedCanvasItems),
    [generatedCanvasItems],
  );

  const generatedSummaryText = useMemo(() => {
    const brief = buildSavedContextSummary(prompt, selectedVibeChip, season, temperature);
    return brief || 'A closet-built look balanced around your current brief.';
  }, [prompt, season, selectedVibeChip, temperature]);

  const generatedSummaryChips = useMemo(
    () =>
      [
        selectedVibeChip || null,
        season ? formatSeasonValue(season) : null,
        temperature ? `${temperature}°F` : null,
        generatedCanvasItems.length ? `${generatedCanvasItems.length} pieces` : null,
      ].filter(Boolean) as string[],
    [generatedCanvasItems.length, season, selectedVibeChip, temperature],
  );

  const fetchFateSignals = useCallback(async (uid: string) => {
    return await fetchStyleContextSignals(uid);
  }, []);

  const fetchWardrobeForFate = useCallback(async (uid: string) => {
    let wardrobeResponse: any = await supabase
      .from('wardrobe')
      .select(FATE_WARDROBE_SELECT_FIELDS)
      .eq('user_id', uid)
      .eq('wardrobe_status', 'owned');

    if (wardrobeResponse.error && isMissingWardrobeEnhancementError(wardrobeResponse.error)) {
      wardrobeResponse = await supabase
        .from('wardrobe')
        .select(FATE_WARDROBE_MEDIA_FALLBACK_SELECT_FIELDS)
        .eq('user_id', uid)
        .eq('wardrobe_status', 'owned');
    }

    if (wardrobeResponse.error && isMissingColumnError(wardrobeResponse.error, 'cutout_image_url')) {
      wardrobeResponse = await supabase
        .from('wardrobe')
        .select(FATE_WARDROBE_FALLBACK_SELECT_FIELDS)
        .eq('user_id', uid)
        .eq('wardrobe_status', 'owned');
    }

    if (wardrobeResponse.error) {
      throw wardrobeResponse.error;
    }

    return Array.isArray(wardrobeResponse.data) ? wardrobeResponse.data : [];
  }, []);

  const fetchWardrobeItemsByIds = async (ids: string[]) => {
    if (!userId) return [];
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return [];

    let response: any = await supabase
      .from('wardrobe')
      .select(GENERATOR_WARDROBE_SELECT_FIELDS)
      .eq('user_id', userId)
      .in('id', uniqueIds);

    if (response.error && isMissingWardrobeEnhancementError(response.error)) {
      response = await supabase
        .from('wardrobe')
        .select(GENERATOR_WARDROBE_MEDIA_FALLBACK_SELECT_FIELDS)
        .eq('user_id', userId)
        .in('id', uniqueIds);
    }

    if (response.error && isMissingColumnError(response.error, 'cutout_image_url')) {
      response = await supabase
        .from('wardrobe')
        .select(GENERATOR_WARDROBE_FALLBACK_SELECT_FIELDS)
        .eq('user_id', userId)
        .in('id', uniqueIds);
    }

    if (response.error) {
      console.error('Error fetching wardrobe items:', response.error.message);
      return [];
    }

    return response.data ?? [];
  };

  const toggleLockItem = (item: any) => {
    setLockedItems((prev) =>
      prev.some((entry) => entry.id === item.id)
        ? prev.filter((entry) => entry.id !== item.id)
        : [...prev, item]
    );
  };

  const handleCreateTravelCollection = useCallback(
    async (draft: TravelCollectionDraft) => {
      try {
        setCreatingTravelCollection(true);
        const uid = await resolveCurrentUserId();
        const organizationAccess = await canUseFeature(uid, 'premium_organization');
        if (!organizationAccess.allowed) {
          setUpgradeModal(buildUpgradeModalState('premium_organization', organizationAccess));
          return;
        }
        const created = await createTravelCollection({
          userId: uid,
          draft,
        });
        setTravelCollections((previous) => [created, ...previous]);
        setSaveSheetMode('travel');
        setSaveSheetTravelCollectionId(String(created.id));
        setTravelCollectionModalVisible(false);
      } catch (error: any) {
        if (isSubscriptionLimitError(error)) {
          setUpgradeModal(buildUpgradeModalState(error.featureName, error.accessResult));
          return;
        }
        console.error('Create travel collection failed:', error?.message || error);
        Alert.alert('Create Trip Failed', error?.message || 'Could not create this trip.');
      } finally {
        setCreatingTravelCollection(false);
      }
    },
    [resolveCurrentUserId],
  );

  const generateMultistepOutfit = async (overrides?: {
    prompt?: string;
    selectedVibeChip?: string;
    season?: string;
    temperature?: string;
  }) => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please log in to generate outfits.');
      return;
    }

    const generationAccess = await canUseFeature(userId, 'outfit_generation');
    if (!generationAccess.allowed) {
      setUpgradeModal(buildUpgradeModalState('outfit_generation', generationAccess));
      return;
    }

    const requestPrompt = String(overrides?.prompt ?? prompt ?? '');
    const requestVibe = String(overrides?.selectedVibeChip ?? selectedVibeChip ?? '');
    const requestSeason = String(overrides?.season ?? season ?? '');
    const requestTemperature = String(overrides?.temperature ?? temperature ?? '');

    setLoading(true);
    setCurrentStep('Generating outfit...');

    try {
      const steps = [
        'Ranking your closet...',
        'Balancing color and shape...',
        'Finalizing outfit...',
        'Preparing your fit...',
        'Finalizing outfit...',
      ];

      for (const step of steps) {
        setCurrentStep(step);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const { response: resolvedResponse, data } = await apiPostWithRateLimitRetry('/generate-multistep-outfit', {
        context: requestPrompt,
        vibe: requestVibe,
        season: requestSeason,
        temperature: String(requestTemperature || '').trim() ? Number(requestTemperature) : null,
        recent_item_ids: getRecentGeneratedIds(),
        avoidIds: outfit?.map((item: any) => item.id) || [],
        locked_items: toStyleRequestWardrobeList(lockedItems),
      }, {
        maxAttempts: 3,
        fallbackMs: 1500,
        onRetry: ({ attempt, maxAttempts }) => {
          setCurrentStep(`Server busy, retrying... (${attempt + 1}/${maxAttempts})`);
        },
      });

      if (!resolvedResponse.ok) {
        Alert.alert('Generation Failed', formatGeneratorErrorMessage(data?.error || data?.rawText));
        return;
      }

      if (!data.steps) {
        Alert.alert('Generation Failed', 'Missing outfit step data.');
        return;
      }

      const resolvedSteps = Object.entries(data.steps || {})
        .map(([role, step]: [string, any]) => ({
          ...step,
          outfit_role: step?.outfit_role || role,
        }))
        .filter((step: any) => step && step.id);
      const requestedIds = resolvedSteps.map((step: any) => step.id);
      const wardrobe = await fetchWardrobeItemsByIds(requestedIds);
      const wardrobeById = new Map(wardrobe.map((item: any) => [item.id, item]));
      const matched = resolvedSteps
        .map((step: any) => {
          const match = wardrobeById.get(step.id) as Record<string, any> | undefined;
          return match
            ? {
                ...match,
                reason: step.reason,
                outfit_role: step.outfit_role || null,
              }
            : null;
        })
        .filter(Boolean);

      const sorted = matched.sort(
        (a, b) => DISPLAY_ORDER.indexOf(getDisplayRole(a)) - DISPLAY_ORDER.indexOf(getDisplayRole(b))
      );

      animateTransition();
      setOutfit(sorted);
      setActiveReasonItemId(null);
      setRecentGenerationHistory((prev) => [...prev.slice(-2), sorted.map((item: any) => item.id)]);
      setMode('generated');
      await incrementUsage(userId, 'outfit_generation').catch((error: any) => {
        console.warn('Outfit generation usage increment failed:', error?.message || error);
      });
    } catch (err: any) {
      console.error('Generate outfit failed:', err?.message || err);
      Alert.alert('Generation Failed', err?.message || String(err));
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const generateOutfitName = async () => {
    const resolvedItems = outfit
      .map((item) =>
        String(item?.name || item?.type || item?.main_category || item?.subcategory || '')
          .trim()
      )
      .filter(Boolean);
    const requestPayload = {
      vibe: String(selectedVibeChip || '').trim() || 'Styled',
      context: buildSavedContextSummary(prompt, selectedVibeChip, season, temperature),
      season: season || finalSeason,
      temperature: String(temperature || '').trim() ? Number(temperature) : null,
      items: resolvedItems.length ? resolvedItems : ['closet outfit'],
    };

    const { response, data: json } = await apiPostWithRateLimitRetry('/generate-outfit-name', requestPayload, {
      maxAttempts: 3,
      fallbackMs: 1500,
    });

    if (!response.ok) {
      throw new Error(formatGeneratorErrorMessage(json?.error || json?.rawText));
    }

    return json.name || 'Untitled Fit';
  };

  const closeSaveSheet = useCallback(() => {
    saveNameRequestRef.current += 1;
    saveNameDirtyRef.current = false;
    setSaveSheetVisible(false);
    setSaveSheetNameLoading(false);
  }, []);

  const openSaveSheet = useCallback(async () => {
    if (!outfit.length) return;

    const defaultMode = savePrefillMode === 'travel' || savePrefillTravelCollectionId ? 'travel' : 'regular';
    saveNameDirtyRef.current = false;
    setSaveSheetMode(defaultMode);
    setSaveSheetName('Untitled Fit');
    setSaveSheetTravelCollectionId(savePrefillTravelCollectionId);
    setSaveSheetActivityLabel(savePrefillActivityLabel);
    setSaveSheetDayLabel('');
    setSaveSheetVisible(true);
    setSaveSheetNameLoading(true);

    if (defaultMode === 'travel' || savePrefillTravelCollectionId) {
      void loadTravelCollectionOptions();
    }

    const requestId = saveNameRequestRef.current + 1;
    saveNameRequestRef.current = requestId;

    try {
      const nextName = await generateOutfitName();
      if (saveNameRequestRef.current !== requestId || saveNameDirtyRef.current) return;
      setSaveSheetName(String(nextName || 'Untitled Fit').trim() || 'Untitled Fit');
    } catch (error: any) {
      console.error('Generate outfit name failed:', error?.message || error);
      if (saveNameRequestRef.current !== requestId || saveNameDirtyRef.current) return;
      setSaveSheetName('Untitled Fit');
    } finally {
      if (saveNameRequestRef.current === requestId) {
        setSaveSheetNameLoading(false);
      }
    }
  }, [loadTravelCollectionOptions, outfit.length, prompt, savePrefillActivityLabel, savePrefillMode, savePrefillTravelCollectionId, season, selectedVibeChip, temperature]);

  const saveOutfit = async () => {
    if (!userId || outfit.length === 0) return;
    if (saveSheetMode === 'travel' && !saveSheetTravelCollectionId) {
      Alert.alert('Choose a Trip', 'Select a travel collection before saving this outfit.');
      return;
    }

    const saveAccess = await canUseFeature(userId, 'saved_outfit');
    if (!saveAccess.allowed) {
      setUpgradeModal(buildUpgradeModalState('saved_outfit', saveAccess));
      return;
    }

    if (saveSheetMode === 'travel') {
      const organizationAccess = await canUseFeature(userId, 'premium_organization');
      if (!organizationAccess.allowed) {
        setUpgradeModal(buildUpgradeModalState('premium_organization', organizationAccess));
        return;
      }
    }

    const resolvedName = String(saveSheetName || '').trim() || 'Untitled Fit';

    try {
      await saveMixedOutfit({
        userId,
        name: resolvedName,
        context: buildSavedContextSummary(prompt, selectedVibeChip, season, temperature),
        season: finalSeason,
        items: generatedCanvasItems.map((item) =>
          normalizeSavedOutfitLikeItem({
            ...item,
            source_type: 'wardrobe',
            source_item_id: item.source_item_id || item.id || null,
            reason: item.reason,
            locked: item.locked,
            layout: item.layout,
            outfit_role: item.outfit_role || getDisplayRole(item),
          }),
        ),
        sourceKind: 'generated',
        travelCollectionId: saveSheetMode === 'travel' ? saveSheetTravelCollectionId : null,
        activityLabel: saveSheetMode === 'travel' ? saveSheetActivityLabel : null,
        dayLabel: saveSheetMode === 'travel' ? saveSheetDayLabel : null,
        outfitMode: saveSheetMode,
      });
    } catch (error: any) {
      if (isSubscriptionLimitError(error)) {
        setUpgradeModal(buildUpgradeModalState(error.featureName, error.accessResult));
        return;
      }
      console.error(error?.message || error);
      Alert.alert('Save Failed', error?.message || 'Your outfit could not be saved.');
      return;
    }

    closeSaveSheet();
    Alert.alert(
      'Saved',
      saveSheetMode === 'travel' && saveSheetSelectedTravelCollection
        ? `Outfit saved to "${saveSheetSelectedTravelCollection.name}" as "${resolvedName}".`
        : `Outfit saved as "${resolvedName}".`,
    );
  };

  const handleSaveOutfit = async () => {
    if (saving) return;
    await openSaveSheet();
  };

  const handleConfirmSaveOutfit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveOutfit();
    } finally {
      setSaving(false);
    }
  };

  const handleFateSurpriseMe = useCallback(async () => {
    const nextVariantIndex = fateVariantIndex + 1;
    try {
      setSurpriseLoading(true);
      const uid = await resolveCurrentUserId();
      const [{ profile, preferences }, wardrobeItems] = await Promise.all([
        fetchFateSignals(uid),
        fetchWardrobeForFate(uid),
      ]);

      // Fate stays deterministic here: it builds richer generator inputs from stored signals.
      const nextFateContext = buildFateContext({
        profile,
        preferences,
        wardrobe: wardrobeItems,
        weather: {
          season,
          temperature,
        },
        modeOverrides: {
          variantIndex: nextVariantIndex,
          previous: cachedFateContext,
          avoidKeys: recentFateKeys.slice(-4),
        },
      });

      setSelectedVibeChip(nextFateContext.vibe);
      setPrompt(nextFateContext.context);
      setSeason(nextFateContext.season);
      setTemperature(nextFateContext.temperature);
      setRefineOpen(Boolean(nextFateContext.season || nextFateContext.temperature));
      setCachedFateContext(nextFateContext);
      setFateVariantIndex(nextVariantIndex);
      if (nextFateContext.debug?.selectedKey) {
        setRecentFateKeys((prev) => [...prev.slice(-3), nextFateContext.debug?.selectedKey!]);
      }
      await generateMultistepOutfit({
        prompt: nextFateContext.context,
        selectedVibeChip: nextFateContext.vibe,
        season: nextFateContext.season,
        temperature: nextFateContext.temperature,
      });
    } catch (error: any) {
      console.error('Fate Surprise failed:', error?.message || error);
      const fallbackContext = cachedFateContext || buildFateContext({
        profile: null,
        preferences: null,
        wardrobe: [],
        weather: { season, temperature },
        modeOverrides: {
          variantIndex: nextVariantIndex,
          previous: cachedFateContext,
          avoidKeys: recentFateKeys.slice(-4),
        },
      });
      setSelectedVibeChip(fallbackContext.vibe);
      setPrompt(fallbackContext.context);
      setSeason(fallbackContext.season);
      setTemperature(fallbackContext.temperature);
      setRefineOpen(Boolean(fallbackContext.season || fallbackContext.temperature));
      setCachedFateContext(fallbackContext);
      setFateVariantIndex(nextVariantIndex);
      if (fallbackContext.debug?.selectedKey) {
        setRecentFateKeys((prev) => [...prev.slice(-3), fallbackContext.debug?.selectedKey!]);
      }
      await generateMultistepOutfit({
        prompt: fallbackContext.context,
        selectedVibeChip: fallbackContext.vibe,
        season: fallbackContext.season,
        temperature: fallbackContext.temperature,
      });
    } finally {
      setSurpriseLoading(false);
    }
  }, [
    cachedFateContext,
    fateVariantIndex,
    fetchFateSignals,
    fetchWardrobeForFate,
    generateMultistepOutfit,
    recentFateKeys,
    resolveCurrentUserId,
    season,
    temperature,
  ]);

  const formDockBottom = Math.max(tabBarHeight - 1, 0);
  const formContentBottomPadding = formDockBottom + 118;
  const generatedContentBottomPadding = formDockBottom + 138;
  const isSurpriseBusy = surpriseLoading;
  const saveSheetModal = (
    <SaveGeneratedOutfitModal
      visible={saveSheetVisible}
      name={saveSheetName}
      nameLoading={saveSheetNameLoading}
      saveMode={saveSheetMode}
      travelCollections={travelCollections}
      travelCollectionsLoading={travelCollectionsLoading}
      selectedTravelCollectionId={saveSheetTravelCollectionId}
      activityLabel={saveSheetActivityLabel}
      dayLabel={saveSheetDayLabel}
      generatedOutfit={outfit}
      submitting={saving}
      onClose={() => {
        if (saving) return;
        closeSaveSheet();
      }}
      onConfirm={() => {
        void handleConfirmSaveOutfit();
      }}
      onChangeName={(value) => {
        saveNameDirtyRef.current = true;
        setSaveSheetName(value);
      }}
      onChangeSaveMode={(value) => {
        if (value === 'travel') {
          if (!userId) {
            Alert.alert('Authentication Required', 'Please log in to use premium organization tools.');
            return;
          }
          void canUseFeature(userId, 'premium_organization')
            .then((result) => {
              if (!result.allowed) {
                setUpgradeModal(buildUpgradeModalState('premium_organization', result));
                return;
              }
              setSaveSheetMode(value);
              void loadTravelCollectionOptions();
            })
            .catch((error: any) => {
              console.warn('Premium organization gate failed:', error?.message || error);
            });
          return;
        }
        setSaveSheetMode(value);
      }}
      onChangeTravelCollectionId={setSaveSheetTravelCollectionId}
      onChangeActivityLabel={setSaveSheetActivityLabel}
      onChangeDayLabel={setSaveSheetDayLabel}
      onPressCreateTrip={() => {
        void loadTravelCollectionOptions();
        setTravelCollectionModalVisible(true);
      }}
    />
  );
  const travelCollectionModal = (
    <CreateTravelCollectionModal
      visible={travelCollectionModalVisible}
      submitting={creatingTravelCollection}
      onClose={() => {
        if (creatingTravelCollection) return;
        setTravelCollectionModalVisible(false);
      }}
      onSubmit={(draft) => {
        void handleCreateTravelCollection(draft);
      }}
    />
  );

  const handleOpenManualBuilder = useCallback(() => {
    navigation.navigate('StyleCanvas', {
      origin: 'outfit_generator',
      initialTitle: 'Manual Outfit Build',
      allowedSources: ['closet'],
    });
  }, [navigation]);

  if (mode === 'form') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.flex}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.formScrollContent, { paddingBottom: formContentBottomPadding }]}
          >
            <StylistBriefHeader
              title="Build Your Fit"
              subtitle="Describe the look you want and we’ll pull it from your closet."
            />

            {savePrefillTravelCollectionId ? (
              <View style={styles.tripContextCard}>
                <View style={styles.tripContextIconWrap}>
                  <Ionicons name="airplane-outline" size={16} color={colors.textPrimary} />
                </View>
                <View style={styles.tripContextCopy}>
                  <Text style={styles.tripContextTitle}>
                    {tripContextCollection?.name
                      ? `Saving for ${tripContextCollection.name}`
                      : 'Travel trip selected'}
                  </Text>
                  <Text style={styles.tripContextText}>
                    {savePrefillActivityLabel
                      ? `Save Fit will open with ${savePrefillActivityLabel} prefilled.`
                      : 'Save Fit will open with this trip already selected.'}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.formSection}>
              <InputSection
                label="Describe the look"
                placeholder="Confident dinner look, relaxed weekend fit, clean office outfit..."
                value={prompt}
                onChangeText={setPrompt}
              />

              <QuickPickChips
                label="Style shortcuts"
                options={VIBE_OPTIONS}
                selectedValue={selectedVibeChip}
                onSelect={(value) => setSelectedVibeChip(String(value))}
                horizontal
              />
            </View>

            <View style={styles.formSectionCompact}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setRefineOpen((current) => !current)}
                style={styles.refineToggle}
              >
                <View style={styles.refineCopy}>
                  <Text style={styles.refineLabel}>Refine</Text>
                  <Text style={styles.refineSummary}>{buildRefineSummary(season, temperature)}</Text>
                </View>
                <Ionicons
                  name={refineOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {refineOpen ? (
                <View style={styles.refineContent}>
                  <SeasonSelector value={season} onChange={setSeason} />
                  <View style={styles.refineTemperatureWrap}>
                    <TemperatureInputCard value={temperature} onChange={setTemperature} />
                  </View>
                </View>
              ) : null}
            </View>

            {loading && currentStep ? (
              <LoadingCard
                title="Building your look"
                step={currentStep}
              />
            ) : null}
          </ScrollView>

          <View pointerEvents="box-none" style={[styles.formActionsWrap, { bottom: formDockBottom }]}>
            <View style={styles.formActionsCard}>
              <View style={styles.formActionsStack}>
                <View style={styles.formActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => {
                      void handleFateSurpriseMe();
                    }}
                    disabled={loading || isSurpriseBusy}
                    style={[styles.secondaryCta, styles.secondaryCtaWide, (loading || isSurpriseBusy) && styles.disabledAction]}
                  >
                    <Ionicons name="sparkles-outline" size={15} color={colors.textPrimary} />
                    <Text style={styles.secondaryCtaText}>
                      {surpriseLoading ? 'Surprising...' : 'Surprise Me'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={handleOpenManualBuilder}
                    disabled={loading || isSurpriseBusy}
                    style={[styles.secondaryCta, styles.secondaryCtaWide, (loading || isSurpriseBusy) && styles.disabledAction]}
                  >
                    <Ionicons name="shirt-outline" size={15} color={colors.textPrimary} />
                    <Text style={styles.secondaryCtaText}>Manual Build</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    void generateMultistepOutfit();
                  }}
                  disabled={loading || isSurpriseBusy}
                  style={[styles.primaryCta, (loading || isSurpriseBusy) && styles.disabledAction]}
                >
                  <Text style={styles.primaryCtaText}>
                    {loading ? 'Generating...' : 'Generate Fit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
        {saveSheetModal}
        {travelCollectionModal}
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.flex}>
        <View style={styles.generatedHeaderRow}>
          <TouchableOpacity
            onPress={() => {
              animateTransition();
              setMode('form');
            }}
            style={styles.generatedBackButton}
            activeOpacity={0.82}
          >
            <Ionicons name="chevron-back" size={22} color="rgba(28, 28, 28, 0.72)" />
          </TouchableOpacity>
          <Text style={styles.generatedHeaderTitle} numberOfLines={1}>
            Here’s your styled fit
          </Text>
          <View style={styles.generatedHeaderSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.generatedScrollContent, { paddingBottom: generatedContentBottomPadding }]}
        >
          <OutfitSummaryCard
            eyebrow="Styled for you"
            title={selectedVibeChip || 'Closet-built look'}
            summary={generatedSummaryText}
            chips={generatedSummaryChips}
          />

          {loading && currentStep ? (
            <LoadingCard
              title="Refreshing your look"
              step={currentStep}
            />
          ) : null}

          <View style={styles.resultsSectionHeader}>
            <Text style={styles.resultsSectionTitle}>Styled board</Text>
            <Text style={styles.resultsSectionText}>
              Tap a reason chip to spotlight a piece. Long press any item on the board to lock it before generating again.
            </Text>
          </View>

          {generatedCanvasItems.length ? (
            <>
              <OutfitCanvas
                items={generatedCanvasItems}
                highlightedItemId={activeReasonItemId}
                onPressItem={setActiveReasonItemId}
                onLongPressItem={(itemId) => {
                  const matchedItem = outfit.find((entry) => String(entry?.id || '') === String(itemId || ''));
                  if (!matchedItem) return;
                  toggleLockItem(matchedItem);
                }}
              />

              <WhyItWorksPanel
                summary={generatedSummaryText}
                items={generatedReasonItems}
                activeItemId={activeReasonItemId}
                onChangeActiveItemId={setActiveReasonItemId}
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No look yet</Text>
              <Text style={styles.emptyStateText}>
                Edit the brief and generate a look to see styled outfit recommendations here.
              </Text>
            </View>
          )}
        </ScrollView>

        {(outfit.length > 0 || loading) ? (
          <FloatingGeneratorActions
            onSave={() => {
              void handleSaveOutfit();
            }}
            onGenerateAgain={() => {
              void generateMultistepOutfit();
            }}
            onEditInputs={() => {
              animateTransition();
              setMode('form');
            }}
            loading={loading || saving}
          />
        ) : null}
      </View>
      {saveSheetModal}
      {travelCollectionModal}
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
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  formScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 2,
  },
  formSection: {
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  formSectionCompact: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  tripContextCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tripContextIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  tripContextCopy: {
    flex: 1,
  },
  tripContextTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  tripContextText: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  inputSection: {
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontFamily: typography.fontFamily,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  loadingCard: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  loadingEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  loadingTitle: {
    marginTop: spacing.xs,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  formActionsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  formActionsCard: {
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: 'rgba(250, 250, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  formActionsStack: {
    gap: 10,
  },
  formActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryCta: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
  },
  secondaryCtaWide: {
    flex: 1,
  },
  secondaryCtaText: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  primaryCta: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily,
  },
  disabledAction: {
    opacity: 0.65,
  },
  refineToggle: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refineCopy: {
    flex: 1,
    marginRight: spacing.md,
  },
  refineLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: typography.fontFamily,
  },
  refineSummary: {
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  refineContent: {
    marginTop: spacing.md,
  },
  refineTemperatureWrap: {
    marginTop: spacing.md,
  },
  generatedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
  },
  generatedBackButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
  },
  generatedHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    paddingHorizontal: spacing.sm,
  },
  generatedHeaderSpacer: {
    width: 38,
  },
  generatedScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: spacing.xxl,
    gap: 14,
  },
  resultsSectionHeader: {
    marginTop: 4,
    marginBottom: 4,
  },
  resultsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  resultsSectionText: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  emptyState: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  emptyStateText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});
