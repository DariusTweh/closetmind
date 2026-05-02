import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import ViewShot from 'react-native-view-shot';
import AttachPiecesModal from '../components/FitCheck/AttachPiecesModal';
import PostSourceCard from '../components/FitCheck/PostSourceCard';
import PostStepIndicator from '../components/FitCheck/PostStepIndicator';
import VisibilitySelector from '../components/FitCheck/VisibilitySelector';
import WardrobeItemImage from '../components/Closet/WardrobeItemImage';
import OutfitCanvas from '../components/OutfitCanvas/OutfitCanvas';
import { buildOutfitCanvasItems } from '../components/OutfitCanvas/utils';
import {
  FIT_CHECK_CONTEXT_OPTIONS,
  FIT_CHECK_MOOD_OPTIONS,
  FIT_CHECK_VISIBILITY_OPTIONS,
  FIT_CHECK_WEATHER_OPTIONS,
  getFitCheckAttachableItemsFallback,
} from '../lib/fitCheckMock';
import { maybePromptForFitCheckPushPermission } from '../lib/fitCheckNotifications';
import { resolveItemImage } from '../lib/itemImage';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { createFitCheckPost } from '../lib/fitCheckService';
import { supabase } from '../lib/supabase';
import { colors, radii, shadows, spacing, typography } from '../lib/theme';
import { fetchAllSavedOutfits } from '../services/savedOutfitService';
import {
  loadStyleCanvas,
  persistStyleCanvasPreviewReference,
  resolveStyleCanvasPreviewUrl,
  uploadStyleCanvasPreviewImage,
} from '../services/styleCanvasService';
import type {
  FitCheckAttachLook,
  FitCheckItem,
  FitCheckSource,
  FitCheckVisibility,
} from '../types/fitCheck';

const STEPS = ['Source', 'Pieces', 'Details'];
const SOURCE_CARDS: Array<{
  key: FitCheckSource;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'camera',
    icon: 'camera-outline',
    title: 'Camera',
    subtitle: 'Snap a fit right now and post it immediately.',
  },
  {
    key: 'gallery',
    icon: 'images-outline',
    title: 'Gallery',
    subtitle: 'Pick a fit photo from your library.',
  },
  {
    key: 'canvas',
    icon: 'grid-outline',
    title: 'Outfit Canvas',
    subtitle: 'Post your latest canvas-built saved look.',
  },
  {
    key: 'saved_outfit',
    icon: 'bookmark-outline',
    title: 'Saved Outfit',
    subtitle: 'Use your most recent saved fit and attached pieces.',
  },
  {
    key: 'try_on',
    icon: 'sparkles-outline',
    title: 'Try-On',
    subtitle: 'Post your latest completed try-on render.',
  },
];

const STEP_COPY = {
  1: {
    title: 'How are you posting?',
    subtitle: 'Drop today’s real fit.',
  },
  2: {
    title: 'What’s in the fit?',
    subtitle: 'Attach pieces so friends can see the breakdown.',
  },
  3: {
    title: 'Add the details',
    subtitle: 'Give the fit some context.',
  },
} as const;

const LOOK_PREVIEW_STAGE_WIDTH = 345;
const LOOK_PREVIEW_STAGE_HEIGHT = 420;

type ProfileIdentity = {
  username: string;
  avatar_url: string | null;
};

type TryOnPreview = {
  id: string;
  preview_image_url: string;
  title: string;
  subtitle?: string;
  created_at: string;
};

function pickSavedOutfitPreviewUrl(item: any) {
  return (
    String(item?.cutout_display_url || '').trim() ||
    String(item?.cutout_thumbnail_url || '').trim() ||
    String(item?.cutout_url || '').trim() ||
    String(item?.cutout_image_url || '').trim() ||
    String(item?.display_image_url || '').trim() ||
    String(item?.thumbnail_url || '').trim() ||
    String(item?.image_url || '').trim() ||
    String(item?.original_image_url || '').trim() ||
    null
  );
}

function normalizeWardrobeItem(item: any): FitCheckItem {
  return {
    id: String(item?.id || `wardrobe-${Math.random()}`),
    name: String(item?.name || 'Closet Piece'),
    image_url: String(item?.image_url || '').trim() || null,
    image_path: String(item?.image_path || '').trim() || null,
    thumbnail_url: String(item?.thumbnail_url || '').trim() || null,
    display_image_url: String(item?.display_image_url || '').trim() || null,
    original_image_url: String(item?.original_image_url || '').trim() || null,
    cutout_image_url: String(item?.cutout_image_url || '').trim() || null,
    cutout_thumbnail_url: String(item?.cutout_thumbnail_url || '').trim() || null,
    cutout_display_url: String(item?.cutout_display_url || '').trim() || null,
    main_category: String(item?.main_category || '').trim() || null,
    type: String(item?.type || '').trim() || null,
  };
}

function normalizeSavedOutfitLook(
  outfit: any,
  options?: {
    canvasPreviewUrl?: string | null;
    canvasItemsOverride?: any[] | null;
  },
): FitCheckAttachLook | null {
  const rawItems = Array.isArray(outfit?.resolvedItems)
    ? outfit.resolvedItems
    : Array.isArray(outfit?.items)
      ? outfit.items
      : [];
  const items = rawItems
    .map((item: any, index: number) => ({
      id:
        String(item?.source_item_id || '').trim() ||
        String(item?.id || '').trim() ||
        `${String(outfit?.id || 'saved-fit')}-${index}`,
      name:
        String(item?.title || '').trim() ||
        String(item?.name || '').trim() ||
        'Saved piece',
      image_url:
        String(item?.cutout_url || '').trim() ||
        String(item?.cutout_image_url || '').trim() ||
        String(item?.image_url || '').trim() ||
        null,
      image_path: String(item?.image_path || '').trim() || null,
      thumbnail_url: String(item?.thumbnail_url || '').trim() || null,
      display_image_url: String(item?.display_image_url || '').trim() || null,
      original_image_url: String(item?.original_image_url || '').trim() || null,
      cutout_image_url: String(item?.cutout_image_url || '').trim() || null,
      cutout_thumbnail_url: String(item?.cutout_thumbnail_url || '').trim() || null,
      cutout_display_url: String(item?.cutout_display_url || '').trim() || null,
      main_category:
        String(item?.category || '').trim() ||
        String(item?.main_category || '').trim() ||
        null,
      type: String(item?.type || '').trim() || null,
    }))
    .filter((item: FitCheckItem) => item.name);

  if (!items.length) return null;

  const canvasItems = Array.isArray(options?.canvasItemsOverride) && options?.canvasItemsOverride?.length
    ? options.canvasItemsOverride
    : buildOutfitCanvasItems(rawItems);
  const resolvedPreviewUrl =
    String(options?.canvasPreviewUrl || '').trim() ||
    items.map((item) => pickSavedOutfitPreviewUrl(item)).find(Boolean) ||
    null;

  const subtitle = [
    String(outfit?.context || '').trim() || null,
    String(outfit?.season || '').trim() || null,
    String(outfit?.activity_label || '').trim() || null,
    String(outfit?.day_label || '').trim() || null,
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(' • ');

  return {
    id: String(outfit?.id || `saved-look-${Math.random().toString(36).slice(2)}`),
    title: String(outfit?.name || '').trim() || 'Saved Fit',
    subtitle: subtitle || undefined,
    preview_image_url: resolvedPreviewUrl,
    preview_asset_status: resolvedPreviewUrl ? 'ready' : undefined,
    items,
    source_kind: String(outfit?.source_kind || '').trim() || null,
    canvas_id: String(outfit?.canvas_id || '').trim() || null,
    canvas_items: canvasItems,
  };
}

function isMissingTryOnColumn(message: string | null | undefined, columnName: string) {
  const normalized = String(message || '').trim().toLowerCase();
  const target = String(columnName || '').trim().toLowerCase();
  return Boolean(normalized && target && normalized.includes('tryon_jobs') && normalized.includes(target));
}

function formatSourceRelativeTime(value?: string | null) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return undefined;
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const deltaMs = Date.now() - parsed.getTime();
  if (deltaMs < 60_000) return 'Just now';
  if (deltaMs < 3_600_000) return `${Math.max(1, Math.floor(deltaMs / 60_000))}m ago`;
  if (deltaMs < 86_400_000) return `${Math.max(1, Math.floor(deltaMs / 3_600_000))}h ago`;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function SelectedPieceCard({
  item,
  onRemove,
}: {
  item: FitCheckItem;
  onRemove: () => void;
}) {
  return (
    <View style={styles.selectedPieceCard}>
      <WardrobeItemImage item={item} style={styles.selectedPieceImage} imagePreference="thumbnail" />
      <Text style={styles.selectedPieceName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.selectedPieceMeta} numberOfLines={1}>
        {item.main_category || item.type || 'piece'}
      </Text>
      <TouchableOpacity activeOpacity={0.88} onPress={onRemove} style={styles.removePieceButton}>
        <Ionicons name="close" size={14} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

export default function PostFitCheckScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<FitCheckSource | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [attachedItems, setAttachedItems] = useState<FitCheckItem[]>([]);
  const [piecesModalVisible, setPiecesModalVisible] = useState(false);
  const [closetItems, setClosetItems] = useState<FitCheckItem[]>(() => getFitCheckAttachableItemsFallback());
  const [savedLooks, setSavedLooks] = useState<FitCheckAttachLook[]>([]);
  const [loadingSavedLooks, setLoadingSavedLooks] = useState(false);
  const [tryOnPreviews, setTryOnPreviews] = useState<TryOnPreview[]>([]);
  const [loadingTryOnPreviews, setLoadingTryOnPreviews] = useState(false);
  const [occasion, setOccasion] = useState(FIT_CHECK_CONTEXT_OPTIONS[0]);
  const [weatherValue, setWeatherValue] = useState(FIT_CHECK_WEATHER_OPTIONS[0]);
  const [moodValue, setMoodValue] = useState(FIT_CHECK_MOOD_OPTIONS[0]);
  const [visibilityValue, setVisibilityValue] = useState<FitCheckVisibility>(FIT_CHECK_VISIBILITY_OPTIONS[0]);
  const [caption, setCaption] = useState('Simple fit for class today');
  const [posting, setPosting] = useState(false);
  const [selectedSourceTitle, setSelectedSourceTitle] = useState<string | null>(null);
  const [selectedSourceLook, setSelectedSourceLook] = useState<FitCheckAttachLook | null>(null);
  const [lookPickerVisible, setLookPickerVisible] = useState(false);
  const [lookPickerSource, setLookPickerSource] = useState<'canvas' | 'saved_outfit' | null>(null);
  const [lookPreviewCaptureTarget, setLookPreviewCaptureTarget] = useState<FitCheckAttachLook | null>(null);
  const [preparingLookAssetId, setPreparingLookAssetId] = useState<string | null>(null);
  const [loadedLookPreviewItemIds, setLoadedLookPreviewItemIds] = useState<string[]>([]);
  const [profileIdentity, setProfileIdentity] = useState<ProfileIdentity>({
    username: 'you',
    avatar_url: null,
  });
  const lookPreviewCaptureRef = useRef<any>(null);
  const loadedLookPreviewItemIdsRef = useRef<string[]>([]);

  const stepCopy = STEP_COPY[step as 1 | 2 | 3];
  const previewUri = selectedImageUri;
  const selectedIds = useMemo(() => attachedItems.map((item) => item.id), [attachedItems]);
  const continueDisabled = step === 1 && (!selectedSource || !selectedImageUri);
  const canvasLooks = useMemo(
    () => savedLooks.filter((look) => look.canvas_id || look.source_kind === 'canvas'),
    [savedLooks],
  );
  const lookPickerChoices = useMemo(
    () => (lookPickerSource === 'canvas' ? canvasLooks : savedLooks),
    [canvasLooks, lookPickerSource, savedLooks],
  );
  const lookPreviewCaptureItems = useMemo(
    () => (Array.isArray(lookPreviewCaptureTarget?.canvas_items) ? lookPreviewCaptureTarget.canvas_items || [] : []),
    [lookPreviewCaptureTarget],
  );

  useEffect(() => {
    loadedLookPreviewItemIdsRef.current = loadedLookPreviewItemIds;
  }, [loadedLookPreviewItemIds]);

  useEffect(() => {
    let mounted = true;

    const loadPostComposerData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, avatar_path')
          .eq('id', user.id)
          .maybeSingle();

        if (mounted && profile) {
          const resolvedAvatar =
            (await resolvePrivateMediaUrl({
              path: String(profile.avatar_path || '').trim() || null,
              legacyUrl: String(profile.avatar_url || '').trim() || null,
              bucket: 'onboarding',
            }).catch(() => null)) ||
            String(profile.avatar_url || '').trim() ||
            null;
          setProfileIdentity({
            username: String(profile.username || '').trim() || 'you',
            avatar_url: resolvedAvatar,
          });
        }

        const { data: wardrobe } = await supabase
          .from('wardrobe')
          .select(
            'id, name, main_category, type, image_url, image_path, cutout_image_url, cutout_thumbnail_url, cutout_display_url, thumbnail_url, display_image_url, original_image_url, wardrobe_status',
          )
          .eq('user_id', user.id)
          .or('wardrobe_status.eq.owned,wardrobe_status.is.null')
          .order('created_at', { ascending: false })
          .limit(24);

        if (mounted && wardrobe?.length) {
          setClosetItems(
            wardrobe
              .filter((item: any) => String(item?.wardrobe_status || '').trim().toLowerCase() !== 'scanned_candidate')
              .map(normalizeWardrobeItem),
          );
        }

        setLoadingSavedLooks(true);
        const savedOutfits = await fetchAllSavedOutfits(user.id).catch(() => []);
        if (mounted && savedOutfits?.length) {
          const canvasIds = Array.from(
            new Set(
              savedOutfits
                .map((outfit: any) => String(outfit?.canvas_id || '').trim())
                .filter(Boolean),
            ),
          );
          const canvasPreviewMap = new Map<string, string>();
          const canvasItemsMap = new Map<string, any[]>();

          if (canvasIds.length) {
            let canvasPreviewResponse: any = await supabase
              .from('style_canvases')
              .select('id, preview_image_url, metadata')
              .in('id', canvasIds);

            if (
              canvasPreviewResponse.error &&
              String(canvasPreviewResponse.error.message || '').toLowerCase().includes('preview_image_url')
            ) {
              canvasPreviewResponse = await supabase
                .from('style_canvases')
                .select('id, metadata')
                .in('id', canvasIds);
            }

            if (!canvasPreviewResponse.error) {
              const resolvedPreviewPairs = await Promise.all(
                ((canvasPreviewResponse.data || []) as any[]).map(async (row) => {
                  const resolvedPreviewUrl = await resolveStyleCanvasPreviewUrl(row).catch(
                    () => String(row?.preview_image_url || '').trim() || null,
                  );
                  return [String(row?.id || '').trim(), resolvedPreviewUrl] as const;
                }),
              );

              resolvedPreviewPairs.forEach(([id, previewUrl]) => {
                if (id && previewUrl) {
                  canvasPreviewMap.set(id, previewUrl);
                }
              });
            }

            const loadedCanvasEntries = await Promise.all(
              canvasIds.map(async (canvasId) => {
                try {
                  const loadedCanvas = await loadStyleCanvas(canvasId);
                  return [canvasId, buildOutfitCanvasItems(loadedCanvas.items || [])] as const;
                } catch (error) {
                  console.warn('Could not load style canvas items for Fit Check source selection:', canvasId, error);
                  return [canvasId, null] as const;
                }
              }),
            );

            loadedCanvasEntries.forEach(([canvasId, canvasItems]) => {
              if (canvasId && Array.isArray(canvasItems) && canvasItems.length) {
                canvasItemsMap.set(canvasId, canvasItems);
              }
            });
          }

          setSavedLooks(
            savedOutfits
              .map((outfit: any) =>
                normalizeSavedOutfitLook(outfit, {
                  canvasPreviewUrl: canvasPreviewMap.get(String(outfit?.canvas_id || '').trim()) || null,
                  canvasItemsOverride: canvasItemsMap.get(String(outfit?.canvas_id || '').trim()) || null,
                }),
              )
              .filter(Boolean)
              .slice(0, 24) as FitCheckAttachLook[],
          );
        }

        setLoadingTryOnPreviews(true);
        let tryOnResponse: any = await supabase
          .from('tryon_jobs')
          .select('id, status, image_path, image_url, created_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(12);

        if (tryOnResponse.error && isMissingTryOnColumn(tryOnResponse.error.message, 'image_url')) {
          tryOnResponse = await supabase
            .from('tryon_jobs')
            .select('id, status, image_path, created_at')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(12);
        }

        if (!tryOnResponse.error && mounted) {
          const previews = (
            await Promise.all(
              ((tryOnResponse.data || []) as any[]).map(async (row) => {
                const previewImageUrl = await resolvePrivateMediaUrl({
                  path: String(row?.image_path || '').trim() || null,
                  legacyUrl: String(row?.image_url || '').trim() || null,
                }).catch(() => String(row?.image_url || '').trim() || null);

                if (!previewImageUrl) return null;
                return {
                  id: String(row?.id || '').trim(),
                  preview_image_url: previewImageUrl,
                  title: 'Try-On Preview',
                  subtitle: formatSourceRelativeTime(row?.created_at),
                  created_at: String(row?.created_at || '').trim(),
                } as TryOnPreview;
              }),
            )
          ).filter(Boolean) as TryOnPreview[];

          setTryOnPreviews(previews);
        }
      } catch (error) {
        console.error('PostFitCheckScreen loadPostComposerData error:', error);
      } finally {
        if (mounted) {
          setLoadingSavedLooks(false);
          setLoadingTryOnPreviews(false);
        }
      }
    };

    void loadPostComposerData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((current) => Math.max(1, current - 1));
      return;
    }
    navigation.goBack();
  }, [navigation, step]);

  const applySelectedSource = useCallback(
    ({
      source,
      imageUri,
      title,
      items = [],
      look = null,
    }: {
      source: FitCheckSource;
      imageUri: string;
      title?: string | null;
      items?: FitCheckItem[];
      look?: FitCheckAttachLook | null;
    }) => {
      setSelectedSource(source);
      setSelectedImageUri(imageUri);
      setSelectedSourceTitle(String(title || '').trim() || null);
      setAttachedItems(items);
      setSelectedSourceLook(look);
    },
    [],
  );

  const resetSelectedSource = useCallback((source: FitCheckSource) => {
    setSelectedSource(source);
    setSelectedImageUri('');
    setSelectedSourceTitle(null);
    setAttachedItems([]);
    setSelectedSourceLook(null);
  }, []);

  const handlePickGallery = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Photo access required', 'Allow photo library access to post a fit from your gallery.');
      resetSelectedSource('gallery');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.length) {
      resetSelectedSource('gallery');
      return;
    }

    const imageUri = String(result.assets[0]?.uri || '').trim();
    if (!imageUri) {
      resetSelectedSource('gallery');
      return;
    }

    applySelectedSource({
      source: 'gallery',
      imageUri,
      title: 'Gallery Photo',
    });
  }, [applySelectedSource, resetSelectedSource]);

  const handlePickCamera = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Camera access required', 'Allow camera access to post a Fit Check directly.');
      resetSelectedSource('camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.length) {
      resetSelectedSource('camera');
      return;
    }

    const imageUri = String(result.assets[0]?.uri || '').trim();
    if (!imageUri) {
      resetSelectedSource('camera');
      return;
    }

    applySelectedSource({
      source: 'camera',
      imageUri,
      title: 'Camera Capture',
    });
  }, [applySelectedSource, resetSelectedSource]);

  const handleSelectSource = useCallback(
    async (source: FitCheckSource) => {
      if (source === 'gallery') {
        await handlePickGallery();
        return;
      }

      if (source === 'camera') {
        await handlePickCamera();
        return;
      }

      if (source === 'saved_outfit') {
        if (loadingSavedLooks) {
          Alert.alert('Loading saved fits', 'Your saved outfits are still loading.');
          resetSelectedSource(source);
          return;
        }

        if (!savedLooks.length) {
          Alert.alert('No saved fits yet', 'Save an outfit first, then you can post it to Fit Check.');
          resetSelectedSource(source);
          return;
        }
        setLookPickerSource('saved_outfit');
        setLookPickerVisible(true);
        return;
      }

      if (source === 'canvas') {
        if (loadingSavedLooks) {
          Alert.alert('Loading canvas looks', 'Your saved canvas looks are still loading.');
          resetSelectedSource(source);
          return;
        }

        if (!canvasLooks.length) {
          Alert.alert('No canvas looks yet', 'Save a canvas-built outfit first, then post it here.');
          resetSelectedSource(source);
          return;
        }
        setLookPickerSource('canvas');
        setLookPickerVisible(true);
        return;
      }

      if (source === 'try_on') {
        if (loadingTryOnPreviews) {
          Alert.alert('Loading try-ons', 'Your completed try-on previews are still loading.');
          resetSelectedSource(source);
          return;
        }

        const preview = tryOnPreviews[0];
        if (!preview?.preview_image_url) {
          Alert.alert('No try-on preview yet', 'Generate a try-on first, then you can post it to Fit Check.');
          resetSelectedSource(source);
          return;
        }

        applySelectedSource({
          source,
          imageUri: preview.preview_image_url,
          title: preview.title,
        });
      }
    },
    [
      applySelectedSource,
      canvasLooks,
      handlePickCamera,
      handlePickGallery,
      loadingSavedLooks,
      loadingTryOnPreviews,
      resetSelectedSource,
      savedLooks,
      tryOnPreviews,
    ],
  );

  const handleChooseSavedLookSource = useCallback(
    async (look: FitCheckAttachLook) => {
      const source = lookPickerSource === 'canvas' ? 'canvas' : 'saved_outfit';
      const hasCanvasItems = Array.isArray(look.canvas_items) && look.canvas_items.length > 0;

      const wait = (durationMs: number) =>
        new Promise((resolve) => {
          setTimeout(resolve, durationMs);
        });

      const captureLookPreviewAsset = async (targetLook: FitCheckAttachLook) => {
        const preparedCanvasItems = await Promise.all(
          (targetLook.canvas_items || []).map(async (item: any) => {
            const fallbackUri =
              String(item?.cutout_url || '').trim() ||
              String(item?.cutout_image_url || '').trim() ||
              String(item?.cutout_display_url || '').trim() ||
              String(item?.cutout_thumbnail_url || '').trim() ||
              String(item?.display_image_url || '').trim() ||
              String(item?.thumbnail_url || '').trim() ||
              String(item?.image_url || '').trim() ||
              null;

            const resolvedImage = await resolveItemImage(item, {
              bucket: 'clothes',
              preferBackendSigner: true,
              preference: 'display',
            }).catch(() => ({
              uri: fallbackUri,
              isCutout: Boolean(
                item?.cutout_url ||
                  item?.cutout_image_url ||
                  item?.cutout_display_url ||
                  item?.cutout_thumbnail_url,
              ),
            }));

            const resolvedUri = String(resolvedImage?.uri || '').trim() || fallbackUri || null;
            const isCutout = Boolean(resolvedImage?.isCutout);

            return {
              ...item,
              image_path: null,
              image_url: resolvedUri || item?.image_url || null,
              thumbnail_url: isCutout ? item?.thumbnail_url || null : resolvedUri || item?.thumbnail_url || item?.image_url || null,
              display_image_url: isCutout ? item?.display_image_url || null : resolvedUri || item?.display_image_url || item?.image_url || null,
              original_image_url: isCutout ? item?.original_image_url || null : resolvedUri || item?.original_image_url || item?.image_url || null,
              cutout_url: isCutout ? resolvedUri || item?.cutout_url || item?.cutout_image_url || null : item?.cutout_url || item?.cutout_image_url || null,
              cutout_image_url: isCutout ? resolvedUri || item?.cutout_image_url || item?.cutout_url || null : item?.cutout_image_url || null,
              cutout_thumbnail_url: isCutout ? resolvedUri || item?.cutout_thumbnail_url || item?.cutout_image_url || item?.cutout_url || null : item?.cutout_thumbnail_url || null,
              cutout_display_url: isCutout ? resolvedUri || item?.cutout_display_url || item?.cutout_image_url || item?.cutout_url || null : item?.cutout_display_url || null,
            };
          }),
        );

        const expectedLoadCount = preparedCanvasItems.filter((item: any) =>
          Boolean(
            item?.cutout_url ||
              item?.cutout_image_url ||
              item?.cutout_display_url ||
              item?.cutout_thumbnail_url ||
              item?.display_image_url ||
              item?.thumbnail_url ||
              item?.image_url ||
              item?.image_path,
          ),
        ).length;

        loadedLookPreviewItemIdsRef.current = [];
        setLoadedLookPreviewItemIds([]);
        setLookPreviewCaptureTarget({
          ...targetLook,
          canvas_items: preparedCanvasItems,
        });

        const mountDeadline = Date.now() + 2200;
        while (!lookPreviewCaptureRef.current?.capture && Date.now() < mountDeadline) {
          await wait(40);
        }

        const loadDeadline = Date.now() + 3600;
        while (
          expectedLoadCount > 0 &&
          loadedLookPreviewItemIdsRef.current.length < expectedLoadCount &&
          Date.now() < loadDeadline
        ) {
          await wait(80);
        }

        await wait(180);

        const previewUri = await lookPreviewCaptureRef.current?.capture?.({
          format: 'jpg',
          quality: 0.94,
          result: 'tmpfile',
        });

        const uploadedPreview = await uploadStyleCanvasPreviewImage({
          uri: String(previewUri || '').trim(),
          canvasId: targetLook.canvas_id || targetLook.id,
        });

        if (targetLook.canvas_id && uploadedPreview.path) {
          await persistStyleCanvasPreviewReference({
            canvasId: targetLook.canvas_id,
            previewImageUrl: uploadedPreview.url,
            previewImagePath: uploadedPreview.path,
          }).catch((error) => {
            console.warn('Could not persist refreshed canvas preview:', error);
          });
        }

        const refreshedLook: FitCheckAttachLook = {
          ...targetLook,
          preview_image_url: uploadedPreview.url || targetLook.preview_image_url || null,
          preview_asset_status: 'generated',
        };

        setSavedLooks((current) =>
          current.map((entry) => (entry.id === refreshedLook.id ? refreshedLook : entry)),
        );

        return refreshedLook;
      };

      try {
        setPreparingLookAssetId(look.id);
        let resolvedLook = look;

        if (hasCanvasItems) {
          resolvedLook = await captureLookPreviewAsset(look);
        }

        const previewImageUrl = String(resolvedLook.preview_image_url || '').trim();
        if (!previewImageUrl) {
          Alert.alert(
            'Preview still unavailable',
            'This saved look still does not have a usable board preview. Open and save it again from Style Canvas first.',
          );
          resetSelectedSource(source);
          return;
        }

        setLookPickerVisible(false);
        setLookPickerSource(null);
        applySelectedSource({
          source,
          imageUri: previewImageUrl,
          title: resolvedLook.title,
          items: resolvedLook.items,
          look: resolvedLook,
        });
      } catch (error: any) {
        Alert.alert(
          'Could not prepare look',
          String(error?.message || '').trim() || 'This saved look could not be prepared for Fit Check yet.',
        );
        resetSelectedSource(source);
      } finally {
        setPreparingLookAssetId(null);
        setLookPreviewCaptureTarget(null);
        loadedLookPreviewItemIdsRef.current = [];
        setLoadedLookPreviewItemIds([]);
      }
    },
    [applySelectedSource, lookPickerSource, resetSelectedSource],
  );

  const handleToggleItem = useCallback((item: FitCheckItem) => {
    setAttachedItems((current) =>
      current.some((entry) => entry.id === item.id)
        ? current.filter((entry) => entry.id !== item.id)
        : [...current, item],
    );
  }, []);

  const handleAttachSavedLook = useCallback((look: FitCheckAttachLook) => {
    setAttachedItems((current) => {
      const lookIds = new Set(look.items.map((item) => item.id));
      const fullySelected =
        look.items.length > 0 && look.items.every((item) => current.some((entry) => entry.id === item.id));

      if (fullySelected) {
        return current.filter((item) => !lookIds.has(item.id));
      }

      const nextById = new Map(current.map((item) => [item.id, item]));
      look.items.forEach((item) => {
        nextById.set(item.id, item);
      });
      return Array.from(nextById.values());
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (step === 1) {
      if (!selectedSource || !selectedImageUri) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }
  }, [selectedImageUri, selectedSource, step]);

  const handlePost = useCallback(async () => {
    if (!selectedSource || posting) return;
    if (!previewUri) {
      Alert.alert('Select a real fit image', 'Choose a source with a real preview before posting.');
      return;
    }

    try {
      setPosting(true);
      const createdPost = await createFitCheckPost({
        source: selectedSource,
        imageUri: previewUri,
        caption,
        context: occasion,
        weatherLabel: weatherValue,
        mood: moodValue,
        visibility: visibilityValue,
        items: attachedItems,
      });

      void maybePromptForFitCheckPushPermission();

      navigation.replace('MainTabs', {
        screen: 'FitCheck',
        params: {
          postedToday: true,
          newPost: createdPost,
          postActionNonce: Date.now(),
        },
      });
    } catch (error: any) {
      const message =
        String(error?.message || error?.error_description || error?.details || error || '').trim() ||
        'Try again in a moment.';
      console.error('Fit Check post failed:', error);
      Alert.alert('Could not post fit', message);
    } finally {
      setPosting(false);
    }
  }, [
    attachedItems,
    caption,
    moodValue,
    navigation,
    occasion,
    posting,
    previewUri,
    selectedImageUri,
    selectedSource,
    visibilityValue,
    weatherValue,
  ]);

  const renderPreviewCard = () => {
    const sourceLabel =
      selectedSourceTitle ||
      (selectedSource ? SOURCE_CARDS.find((entry) => entry.key === selectedSource)?.title : 'Preview');
    const previewTitle =
      selectedSource === 'saved_outfit'
        ? 'Saved fit ready to post'
        : selectedSource === 'try_on'
          ? 'Try-on ready to post'
          : selectedSource === 'canvas'
            ? 'Canvas look ready to post'
            : selectedSource === 'camera'
              ? 'Camera fit preview'
              : 'Fit preview';

    if (selectedSourceLook?.canvas_items?.length && !previewUri) {
      return (
        <View style={[styles.previewCard, styles.previewCanvasCard]}>
          <View style={styles.previewCanvasStage}>
            <OutfitCanvas
              items={selectedSourceLook.canvas_items as any[]}
              imagePreference="display"
              style={styles.previewCanvas}
              boardStyle={styles.previewCanvasBoard}
              emptyLabel="Canvas preview unavailable."
            />
          </View>
          <View style={styles.previewCanvasFooter}>
            <Text style={styles.previewCanvasKicker}>{sourceLabel}</Text>
            <Text style={styles.previewCanvasTitle}>{previewTitle}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.previewCard}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons name="image-outline" size={34} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.previewShade} />
        <View style={styles.previewOverlay}>
          <Text style={styles.previewKicker}>{sourceLabel}</Text>
          <Text style={styles.previewTitle}>{previewTitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AttachPiecesModal
        visible={piecesModalVisible}
        items={closetItems}
        selectedIds={selectedIds}
        savedLooks={savedLooks}
        loadingSavedLooks={loadingSavedLooks}
        onToggle={handleToggleItem}
        onAttachLook={handleAttachSavedLook}
        onClose={() => setPiecesModalVisible(false)}
        onDone={() => setPiecesModalVisible(false)}
      />

      <View pointerEvents="none" style={styles.hiddenLookPreviewCaptureWrap}>
        <ViewShot
          ref={lookPreviewCaptureRef}
          options={{ format: 'jpg', quality: 0.94 }}
          style={styles.hiddenLookPreviewCaptureShot}
        >
          <View style={styles.hiddenLookPreviewStage}>
            <OutfitCanvas
              items={lookPreviewCaptureItems as any[]}
              imagePreference="display"
              style={styles.hiddenLookPreviewCanvas}
              boardStyle={styles.hiddenLookPreviewCanvasBoard}
              emptyLabel="Preparing saved look preview."
              onItemImageLoadEnd={(itemId) => {
                const normalizedId = String(itemId || '').trim();
                if (!normalizedId) return;
                setLoadedLookPreviewItemIds((current) =>
                  current.includes(normalizedId) ? current : [...current, normalizedId],
                );
              }}
            />
          </View>
        </ViewShot>
      </View>

      <Modal visible={lookPickerVisible} transparent animationType="fade" onRequestClose={() => setLookPickerVisible(false)}>
        <View style={styles.sourcePickerOverlay}>
          <View style={styles.sourcePickerSheet}>
            <View style={styles.sourcePickerHeader}>
              <View style={styles.sourcePickerCopy}>
                <Text style={styles.sectionEyebrow}>
                  {lookPickerSource === 'canvas' ? 'Choose canvas look' : 'Choose saved outfit'}
                </Text>
                <Text style={styles.sourcePickerTitle}>
                  {lookPickerSource === 'canvas' ? 'Pick a canvas to post' : 'Pick a saved fit to post'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  setLookPickerVisible(false);
                  setLookPickerSource(null);
                }}
                style={styles.sourcePickerClose}
              >
                <Ionicons name="close-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sourcePickerList}>
              {lookPickerChoices.map((look) => (
                <TouchableOpacity
                  key={look.id}
                  activeOpacity={0.92}
                  disabled={Boolean(preparingLookAssetId)}
                  onPress={() => {
                    void handleChooseSavedLookSource(look);
                  }}
                  style={styles.sourcePickerCard}
                >
                  <View style={styles.sourcePickerPreview}>
                    {look.canvas_items?.length ? (
                      <OutfitCanvas
                        items={look.canvas_items as any[]}
                        compact
                        style={styles.sourcePickerCanvas}
                        boardStyle={styles.sourcePickerCanvasBoard}
                        emptyLabel="Canvas preview unavailable."
                      />
                    ) : look.preview_image_url ? (
                      <Image source={{ uri: look.preview_image_url }} style={styles.sourcePickerImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.sourcePickerImagePlaceholder}>
                        <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                      </View>
                    )}
                    {preparingLookAssetId === look.id ? (
                      <View style={styles.sourcePickerPreparingOverlay}>
                        <ActivityIndicator size="small" color={colors.textPrimary} />
                        <Text style={styles.sourcePickerPreparingText}>Preparing board preview...</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.sourcePickerMeta}>
                    <Text style={styles.sourcePickerCardTitle} numberOfLines={1}>
                      {look.title}
                    </Text>
                    {look.subtitle ? (
                      <Text style={styles.sourcePickerCardSubtitle} numberOfLines={2}>
                        {look.subtitle}
                      </Text>
                    ) : null}
                    <Text style={styles.sourcePickerCardCount}>
                      {look.items.length} {look.items.length === 1 ? 'piece' : 'pieces'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity hitSlop={10} onPress={handleBack} style={styles.closeButton}>
            <Ionicons
              name={step > 1 ? 'chevron-back' : 'close-outline'}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.kicker}>FIT CHECK</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <Text style={styles.headerTitle}>{stepCopy.title}</Text>
        <Text style={styles.headerSubtitle}>{stepCopy.subtitle}</Text>
        <PostStepIndicator steps={STEPS} currentStep={step} />

        {step === 1 ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Choose source</Text>
              <View style={styles.sourceList}>
                {SOURCE_CARDS.map((source) => (
                  <PostSourceCard
                    key={source.key}
                    icon={source.icon}
                    title={source.title}
                    subtitle={source.subtitle}
                    selected={source.key === selectedSource}
                    onPress={() => void handleSelectSource(source.key)}
                  />
                ))}
              </View>
            </View>

            {selectedSource ? (
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Preview</Text>
                {renderPreviewCard()}
              </View>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Selected preview</Text>
              {renderPreviewCard()}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Attached pieces</Text>
              {attachedItems.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedPiecesRow}
                >
                  {attachedItems.map((item) => (
                    <SelectedPieceCard
                      key={item.id}
                      item={item}
                      onRemove={() => handleToggleItem(item)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyPiecesCard}>
                  <Text style={styles.emptyPiecesTitle}>No pieces attached yet</Text>
                  <Text style={styles.emptyPiecesCopy}>
                    Add pieces from your closet or keep moving and skip this for now.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inlineActions}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setPiecesModalVisible(true)}
                style={styles.secondaryButton}
              >
                <Ionicons name="shirt-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.secondaryButtonText}>Attach from Closet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setStep(3)}
                style={styles.ghostButton}
              >
                <Text style={styles.ghostButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Preview</Text>
              {renderPreviewCard()}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Occasion</Text>
              <VisibilitySelector
                options={FIT_CHECK_CONTEXT_OPTIONS}
                selected={occasion}
                onSelect={(value) => setOccasion(String(value))}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Weather</Text>
              <VisibilitySelector
                options={FIT_CHECK_WEATHER_OPTIONS}
                selected={weatherValue}
                onSelect={(value) => setWeatherValue(String(value))}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Mood</Text>
              <VisibilitySelector
                options={FIT_CHECK_MOOD_OPTIONS}
                selected={moodValue}
                onSelect={(value) => setMoodValue(String(value))}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Caption</Text>
              <View style={styles.captionCard}>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Simple fit for class today"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={styles.captionInput}
                  maxLength={140}
                />
                <Text style={styles.counter}>{caption.trim().length}/140</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Visibility</Text>
              <VisibilitySelector
                options={FIT_CHECK_VISIBILITY_OPTIONS}
                selected={visibilityValue}
                onSelect={(value) => setVisibilityValue(value as FitCheckVisibility)}
              />
              <Text style={styles.visibilityHint}>
                {visibilityValue === 'Friends'
                  ? 'Only your friends can see this.'
                  : visibilityValue === 'Followers'
                    ? 'Followers can see this once you post.'
                    : 'This post is visible to everyone.'}
              </Text>
            </View>
          </>
        ) : null}

        <TouchableOpacity
          activeOpacity={continueDisabled || posting ? 1 : 0.92}
          disabled={continueDisabled || posting}
          onPress={step === 3 ? handlePost : handleContinue}
          style={[styles.primaryButton, (continueDisabled || posting) && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>
            {step === 1
              ? 'Continue'
              : step === 2
                ? 'Continue'
                : posting
                  ? 'Posting...'
                  : 'Post Fit Check'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 22,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: 'rgba(30,30,30,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  kicker: {
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 5,
    color: '#8D8D8D',
    fontWeight: '800',
    fontFamily: typography.fontFamily,
  },
  topBarSpacer: {
    width: 56,
  },
  headerTitle: {
    fontSize: 48,
    lineHeight: 52,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 20,
    lineHeight: 28,
    color: '#666666',
    fontFamily: typography.fontFamily,
    textAlign: 'center',
  },
  section: {
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  sourceList: {
    gap: 12,
  },
  previewCard: {
    height: 360,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  previewCanvasCard: {
    height: 468,
    backgroundColor: '#f3f5f8',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewCanvasStage: {
    flex: 1,
    padding: 14,
    paddingBottom: 0,
  },
  previewCanvasShot: {
    flex: 1,
  },
  previewCanvasCaptureSurface: {
    flex: 1,
  },
  previewCanvas: {
    flex: 1,
  },
  previewCanvasBoard: {
    minHeight: 0,
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#f3f5f8',
  },
  previewCanvasLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,250,255,0.16)',
  },
  previewCanvasFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(24,24,24,0.24)',
  },
  previewCanvasKicker: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#F5F2E8',
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  previewCanvasTitle: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(24,24,24,0.28)',
  },
  previewOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  previewKicker: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#F5F2E8',
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  previewTitle: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  sourcePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,20,20,0.34)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  hiddenLookPreviewCaptureWrap: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: LOOK_PREVIEW_STAGE_WIDTH,
    height: LOOK_PREVIEW_STAGE_HEIGHT,
    opacity: 0,
  },
  hiddenLookPreviewCaptureShot: {
    width: LOOK_PREVIEW_STAGE_WIDTH,
    height: LOOK_PREVIEW_STAGE_HEIGHT,
  },
  hiddenLookPreviewStage: {
    width: LOOK_PREVIEW_STAGE_WIDTH,
    height: LOOK_PREVIEW_STAGE_HEIGHT,
    backgroundColor: '#f3f5f8',
  },
  hiddenLookPreviewCanvas: {
    flex: 1,
  },
  hiddenLookPreviewCanvasBoard: {
    minHeight: 0,
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#f3f5f8',
  },
  sourcePickerSheet: {
    maxHeight: '76%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 20,
    ...shadows.card,
  },
  sourcePickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sourcePickerCopy: {
    flex: 1,
    gap: 6,
  },
  sourcePickerTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  sourcePickerClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourcePickerList: {
    gap: 12,
    paddingTop: 18,
    paddingBottom: 4,
  },
  sourcePickerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
  },
  sourcePickerPreview: {
    height: 190,
    backgroundColor: colors.surfaceContainer,
  },
  sourcePickerPreparingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(250,250,255,0.74)',
  },
  sourcePickerCanvas: {
    flex: 1,
  },
  sourcePickerCanvasBoard: {
    minHeight: 190,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  sourcePickerImage: {
    width: '100%',
    height: '100%',
  },
  sourcePickerImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourcePickerMeta: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  sourcePickerCardTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  sourcePickerCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  sourcePickerCardCount: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  sourcePickerPreparingText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  selectedPiecesRow: {
    paddingRight: 20,
    gap: 12,
  },
  selectedPieceCard: {
    width: 128,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 12,
    gap: 8,
    ...shadows.card,
  },
  selectedPieceImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  selectedPiecePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPieceName: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  selectedPieceMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    textTransform: 'capitalize',
  },
  removePieceButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(250,250,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPiecesCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 20,
    gap: 8,
    ...shadows.card,
  },
  emptyPiecesTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  emptyPiecesCopy: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  inlineActions: {
    gap: 12,
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    ...shadows.card,
  },
  secondaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  ghostButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  captionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  captionInput: {
    minHeight: 120,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    textAlignVertical: 'top',
  },
  counter: {
    marginTop: 12,
    alignSelf: 'flex-end',
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  visibilityHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  primaryButton: {
    marginTop: 8,
    minHeight: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
