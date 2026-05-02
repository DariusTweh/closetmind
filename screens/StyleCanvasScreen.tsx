import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import ViewShot from 'react-native-view-shot';
import SaveGeneratedOutfitModal from '../components/OutfitGenerator/SaveGeneratedOutfitModal';
import CreateTravelCollectionModal from '../components/SavedOutfits/CreateTravelCollectionModal';
import UpgradeLimitModal from '../components/subscriptions/UpgradeLimitModal';
import StyleCanvasAddItemsSheet from '../components/style-canvas/StyleCanvasAddItemsSheet';
import StyleCanvasBoardItem from '../components/style-canvas/StyleCanvasBoardItem';
import { useUpgradeWall } from '../hooks/useUpgradeWall';
import { apiPost } from '../lib/api';
import { isSubscriptionLimitError } from '../lib/subscriptions/errors';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../lib/subscriptions/modalState';
import { canUseFeature } from '../lib/subscriptions/usageService';
import { setActiveStyleCanvasSession } from '../lib/styleCanvasSession';
import { supabase } from '../lib/supabase';
import { colors, shadows, spacing, typography } from '../lib/theme';
import { fetchRecentExternalBrowserItems } from '../services/externalItemsService';
import {
  fetchClosetCanvasItems,
  loadStyleCanvas,
  saveCanvasAsOutfit,
  saveStyleCanvas,
  uploadStyleCanvasPreviewImage,
} from '../services/styleCanvasService';
import { createTravelCollection, fetchTravelCollections } from '../services/travelCollectionsService';
import type { BrowserItem, CanvasItem, WardrobeCanvasSourceItem } from '../types/styleCanvas';
import type { TravelCollectionDraft } from '../types/travelCollections';
import {
  browserItemsToCanvasItems,
  canvasItemsToBrowserItems,
  buildBrowserItemsFromImageUrls,
  extractTryOnCandidatesFromCanvas,
  moveCanvasItemToLayer,
  reindexCanvasItems,
  wardrobeItemsToCanvasItems,
} from '../utils/styleCanvasAdapters';

type AddSource = 'closet' | 'browser' | 'url';

type StyleCanvasRouteParams = {
  canvasId?: string;
  initialItems?: CanvasItem[];
  appendItems?: CanvasItem[];
  availableBrowserItems?: BrowserItem[];
  allowedSources?: AddSource[];
  origin?: string;
  initialTitle?: string;
};

const DEFAULT_CANVAS_TITLE = 'Style Canvas';
const EDITORIAL_CANVAS_BACKGROUND = '#f3f5f8';
const LEGACY_WARM_CANVAS_BACKGROUNDS = new Set(['#f7f1e7', '#f7f1e7ff', 'rgb(247,241,231)']);
const DEFAULT_BACKGROUND = EDITORIAL_CANVAS_BACKGROUND;
const CANVAS_PREVIEW_STAGE_WIDTH = 345;
const CANVAS_PREVIEW_STAGE_HEIGHT = 420;
const DEFAULT_ADD_SOURCES: AddSource[] = ['closet', 'browser', 'url'];

function mergeBrowserItemLists(current: BrowserItem[], incoming: BrowserItem[]) {
  const merged = new Map<string, BrowserItem>();

  [...(current || []), ...(incoming || [])].forEach((item) => {
    if (!item?.id) return;
    const key = `${item.product_url || item.image_url || item.id}::${item.image_url || item.id}`;
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  });

  return Array.from(merged.values());
}

function normalizeMaybeUrl(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+\.[\w.-]+/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function parseApiJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

function normalizeCanvasBackground(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || LEGACY_WARM_CANVAS_BACKGROUNDS.has(normalized)) {
    return EDITORIAL_CANVAS_BACKGROUND;
  }
  return String(value).trim();
}

export default function StyleCanvasScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<any>() as { params?: StyleCanvasRouteParams };
  const routeCanvasId = params?.canvasId;
  const routeAppendItems = params?.appendItems || [];
  const allowedSources = useMemo<AddSource[]>(() => {
    const rawSources = Array.isArray(params?.allowedSources) ? params?.allowedSources : DEFAULT_ADD_SOURCES;
    const normalized = rawSources.filter((source): source is AddSource => DEFAULT_ADD_SOURCES.includes(source));
    return normalized.length ? normalized : ['closet'];
  }, [params?.allowedSources]);
  const isClosetOnlyCanvas = allowedSources.length === 1 && allowedSources[0] === 'closet';

  const [canvasId, setCanvasId] = useState<string | null>(routeCanvasId || null);
  const [title, setTitle] = useState(params?.initialTitle || DEFAULT_CANVAS_TITLE);
  const [origin, setOrigin] = useState(params?.origin || 'manual');
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);
  const [items, setItems] = useState<CanvasItem[]>(() => reindexCanvasItems(params?.initialItems || []));
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loadingCanvas, setLoadingCanvas] = useState(Boolean(routeCanvasId));
  const [savingCanvas, setSavingCanvas] = useState(false);
  const [closingCanvas, setClosingCanvas] = useState(false);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [preparingTryOn, setPreparingTryOn] = useState(false);
  const [travelCollections, setTravelCollections] = useState<any[]>([]);
  const [travelCollectionsLoading, setTravelCollectionsLoading] = useState(false);
  const [travelCollectionModalVisible, setTravelCollectionModalVisible] = useState(false);
  const [creatingTravelCollection, setCreatingTravelCollection] = useState(false);
  const [saveSheetVisible, setSaveSheetVisible] = useState(false);
  const [saveSheetMode, setSaveSheetMode] = useState<'regular' | 'travel'>('regular');
  const [saveSheetName, setSaveSheetName] = useState('Canvas Look');
  const [saveSheetTravelCollectionId, setSaveSheetTravelCollectionId] = useState('');
  const [saveSheetActivityLabel, setSaveSheetActivityLabel] = useState('');
  const [saveSheetDayLabel, setSaveSheetDayLabel] = useState('');
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);

  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [addSource, setAddSource] = useState<AddSource>(allowedSources[0] || 'closet');
  const [closetItems, setClosetItems] = useState<WardrobeCanvasSourceItem[]>([]);
  const [loadingClosetItems, setLoadingClosetItems] = useState(false);
  const [browserItems, setBrowserItems] = useState<BrowserItem[]>(params?.availableBrowserItems || []);
  const [loadingBrowserItems, setLoadingBrowserItems] = useState(false);
  const [selectedClosetIds, setSelectedClosetIds] = useState<Record<string, boolean>>({});
  const [selectedBrowserIds, setSelectedBrowserIds] = useState<Record<string, boolean>>({});
  const [pasteUrl, setPasteUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [stageLayout, setStageLayout] = useState({ width: 0, height: 0 });
  const [loadedPreviewItemIds, setLoadedPreviewItemIds] = useState<string[]>([]);
  const [canvasContext, setCanvasContext] = useState('');
  const [canvasSeason, setCanvasSeason] = useState<string | null>(null);
  const previewCaptureRef = useRef<any>(null);
  const loadedPreviewItemIdsRef = useRef<string[]>([]);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) || null,
    [items, selectedItemId],
  );
  const previewLoadTargetCount = useMemo(
    () => (items || []).filter((item) => Boolean(item?.image_url || item?.cutout_url)).length,
    [items],
  );
  const previewLoadResetKey = useMemo(
    () =>
      (items || [])
        .map((item) => `${item.id}:${item.cutout_url || item.image_url || ''}`)
        .join('|'),
    [items],
  );
  const selectedTravelCollection = useMemo(
    () =>
      travelCollections.find((collection) => String(collection?.id || '') === String(saveSheetTravelCollectionId || '')) ||
      null,
    [saveSheetTravelCollectionId, travelCollections],
  );
  const orderedItems = useMemo(() => reindexCanvasItems(items), [items]);
  const selectedLayerIndex = useMemo(
    () => orderedItems.findIndex((item) => item.id === selectedItemId),
    [orderedItems, selectedItemId],
  );
  const canMoveSelectedBack = selectedLayerIndex > 0;
  const canMoveSelectedFront = selectedLayerIndex !== -1 && selectedLayerIndex < orderedItems.length - 1;

  const selectedBrowserCount = useMemo(
    () => Object.keys(selectedBrowserIds).filter((key) => selectedBrowserIds[key]).length,
    [selectedBrowserIds],
  );
  const selectedClosetCount = useMemo(
    () => Object.keys(selectedClosetIds).filter((key) => selectedClosetIds[key]).length,
    [selectedClosetIds],
  );

  useEffect(() => {
    if (!(params?.availableBrowserItems || []).length) return;
    setBrowserItems((current) => mergeBrowserItemLists(current, params?.availableBrowserItems || []));
  }, [params?.availableBrowserItems]);

  useEffect(() => {
    if (!allowedSources.includes(addSource)) {
      setAddSource(allowedSources[0] || 'closet');
    }
  }, [addSource, allowedSources]);

  useEffect(() => {
    setLoadedPreviewItemIds([]);
  }, [previewLoadResetKey]);

  useEffect(() => {
    loadedPreviewItemIdsRef.current = loadedPreviewItemIds;
  }, [loadedPreviewItemIds]);

  useEffect(() => {
    let mounted = true;
    if (!routeCanvasId) return undefined;

    const hydrateCanvas = async () => {
      setLoadingCanvas(true);
      try {
        const loadedCanvas = await loadStyleCanvas(routeCanvasId);
        if (!mounted) return;
        const loadedItems = reindexCanvasItems(loadedCanvas.items || []);
        const appendItems = (routeAppendItems || []).map((item, index) => ({
          ...item,
          zIndex: loadedItems.length + index + 1,
        }));
        const mergedItems = appendItems.length ? reindexCanvasItems([...loadedItems, ...appendItems]) : loadedItems;
        setCanvasId(loadedCanvas.id);
        setTitle(loadedCanvas.title || DEFAULT_CANVAS_TITLE);
        setOrigin(loadedCanvas.origin || 'manual');
        setBackgroundColor(normalizeCanvasBackground(loadedCanvas.background_color || DEFAULT_BACKGROUND));
        setCanvasContext(String(loadedCanvas.metadata?.context || '').trim());
        setCanvasSeason(loadedCanvas.metadata?.season || null);
        setItems(mergedItems);
        setSelectedItemId(null);
        setBrowserItems((current) => mergeBrowserItemLists(current, canvasItemsToBrowserItems(mergedItems)));
        await setActiveStyleCanvasSession({
          canvasId: loadedCanvas.id,
          title: loadedCanvas.title || DEFAULT_CANVAS_TITLE,
          origin: loadedCanvas.origin || 'manual',
        });
      } catch (error: any) {
        Alert.alert('Canvas error', error?.message || 'Could not load this style canvas.');
      } finally {
        if (mounted) setLoadingCanvas(false);
      }
    };

    void hydrateCanvas();

    return () => {
      mounted = false;
    };
  }, [routeCanvasId]);

  const appendCanvasItems = useCallback((nextItems: CanvasItem[]) => {
    if (!nextItems.length) return;

    setItems((current) => {
      const merged = reindexCanvasItems([...current, ...nextItems]);
      return merged;
    });
    setSelectedItemId(nextItems[nextItems.length - 1].id);
  }, []);

  const loadClosetPickerItems = useCallback(async () => {
    if (loadingClosetItems || closetItems.length) return;

    setLoadingClosetItems(true);
    try {
      const results = await fetchClosetCanvasItems();
      setClosetItems(results);
    } catch (error: any) {
      Alert.alert('Closet error', error?.message || 'Could not load closet items for the canvas.');
    } finally {
      setLoadingClosetItems(false);
    }
  }, [closetItems.length, loadingClosetItems]);

  const loadBrowserPickerItems = useCallback(async () => {
    if (loadingBrowserItems) return;

    setLoadingBrowserItems(true);
    try {
      const results = await fetchRecentExternalBrowserItems();
      setBrowserItems((current) => mergeBrowserItemLists(current, results));
    } catch (error: any) {
      Alert.alert('Browser items', error?.message || 'Could not load saved browser items for this canvas.');
    } finally {
      setLoadingBrowserItems(false);
    }
  }, [loadingBrowserItems]);

  useEffect(() => {
    if (addSheetVisible && addSource === 'closet') {
      void loadClosetPickerItems();
    }
    if (addSheetVisible && addSource === 'browser') {
      void loadBrowserPickerItems();
    }
  }, [addSheetVisible, addSource, loadBrowserPickerItems, loadClosetPickerItems]);

  const handleTransformEnd = useCallback((itemId: string, patch: Partial<CanvasItem>) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }, []);

  const loadTravelCollectionOptions = useCallback(async () => {
    try {
      setTravelCollectionsLoading(true);
      const collections = await fetchTravelCollections();
      setTravelCollections(collections);
    } catch (error: any) {
      console.error('Failed to load travel collections:', error?.message || error);
      Alert.alert('Trip Load Failed', error?.message || 'Could not load your travel collections.');
    } finally {
      setTravelCollectionsLoading(false);
    }
  }, []);

  const handleCreateTravelCollection = useCallback(async (draft: TravelCollectionDraft) => {
    try {
      setCreatingTravelCollection(true);
      const { data } = await supabase.auth.getUser();
      const uid = String(data?.user?.id || '').trim();
      const organizationAccess = await canUseFeature(uid, 'premium_organization');
      if (!organizationAccess.allowed) {
        setUpgradeModal(buildUpgradeModalState('premium_organization', organizationAccess));
        return;
      }
      const created = await createTravelCollection({ draft });
      setTravelCollections((current) => [created, ...current]);
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
  }, []);

  const handlePreviewItemLoadEnd = useCallback((itemId: string) => {
    const normalizedId = String(itemId || '').trim();
    if (!normalizedId) return;
    setLoadedPreviewItemIds((current) =>
      current.includes(normalizedId) ? current : [...current, normalizedId],
    );
  }, []);

  const captureCanvasPreviewAsset = useCallback(async () => {
    if (!items.length) {
      return {
        previewImageUrl: null,
        previewImagePath: null,
      };
    }

    setSelectedItemId(null);

    const deadline = Date.now() + 3500;
    while (
      previewLoadTargetCount > 0 &&
      loadedPreviewItemIdsRef.current.length < previewLoadTargetCount &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    await new Promise((resolve) => setTimeout(resolve, 160));

    const previewUri = await previewCaptureRef.current?.capture?.({
      format: 'jpg',
      quality: 0.94,
      result: 'tmpfile',
    });

    const uploadedPreview = await uploadStyleCanvasPreviewImage({
      uri: String(previewUri || '').trim(),
      canvasId,
    });

    return {
      previewImageUrl: uploadedPreview.url,
      previewImagePath: uploadedPreview.path,
    };
  }, [canvasId, items.length, previewLoadTargetCount]);

  const persistCanvas = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!items.length) {
      if (!silent) {
        Alert.alert('No items yet', 'Add at least one piece before saving this style canvas.');
      }
      return null;
    }

    setSavingCanvas(true);
    try {
      const previewAsset = await captureCanvasPreviewAsset();
      const savedCanvas = await saveStyleCanvas({
        canvasId,
        title,
        origin,
        previewImageUrl: previewAsset.previewImageUrl,
        previewImagePath: previewAsset.previewImagePath,
        backgroundColor,
        metadata: {
          item_count: items.length,
          browser_item_count: browserItems.length,
          context: canvasContext || null,
          season: canvasSeason || null,
        },
        items,
      });

      setCanvasId(savedCanvas.id);
      setItems(reindexCanvasItems(savedCanvas.items));
      setTitle(savedCanvas.title || title || DEFAULT_CANVAS_TITLE);
      setOrigin(savedCanvas.origin || origin || 'manual');
      setBrowserItems((current) => mergeBrowserItemLists(current, canvasItemsToBrowserItems(savedCanvas.items)));
      await setActiveStyleCanvasSession({
        canvasId: savedCanvas.id,
        title: savedCanvas.title || title || DEFAULT_CANVAS_TITLE,
        origin: savedCanvas.origin || origin || 'manual',
      });
      if (!silent) {
        Alert.alert('Saved', 'Your style canvas is ready to come back to.');
      }
      return savedCanvas;
    } catch (error: any) {
      if (!silent) {
        Alert.alert('Save error', error?.message || 'Could not save this style canvas.');
      }
      throw error;
    } finally {
      setSavingCanvas(false);
    }
  }, [
    backgroundColor,
    browserItems.length,
    canvasContext,
    canvasId,
    canvasSeason,
    captureCanvasPreviewAsset,
    items,
    origin,
    title,
  ]);

  const handleSaveCanvas = useCallback(async () => {
    await persistCanvas({ silent: false });
  }, [persistCanvas]);

  const closeSaveSheet = useCallback(() => {
    if (savingOutfit) return;
    setSaveSheetVisible(false);
  }, [savingOutfit]);

  const handleOpenSaveAsOutfit = useCallback(() => {
    if (!items.length || savingOutfit) {
      if (!items.length) {
        Alert.alert('No items yet', 'Add at least one piece before saving this canvas as an outfit.');
      }
      return;
    }

    setSaveSheetMode('regular');
    setSaveSheetName(String(title || DEFAULT_CANVAS_TITLE).trim() || 'Canvas Look');
    setSaveSheetTravelCollectionId('');
    setSaveSheetActivityLabel('');
    setSaveSheetDayLabel('');
    setSaveSheetVisible(true);
  }, [items.length, savingOutfit, title]);

  const handleConfirmSaveAsOutfit = useCallback(async () => {
    if (!items.length || savingOutfit) {
      if (!items.length) {
        Alert.alert('No items yet', 'Add at least one piece before saving this canvas as an outfit.');
      }
      return;
    }

    if (saveSheetMode === 'travel' && !saveSheetTravelCollectionId) {
      Alert.alert('Choose a Trip', 'Select a travel collection before saving this outfit.');
      return;
    }

    setSavingOutfit(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = String(data?.user?.id || '').trim();
      if (!uid) {
        Alert.alert('Authentication Required', 'Please log in to save this outfit.');
        return;
      }

      const saveAccess = await canUseFeature(uid, 'saved_outfit');
      if (!saveAccess.allowed) {
        setUpgradeModal(buildUpgradeModalState('saved_outfit', saveAccess));
        return;
      }

      if (saveSheetMode === 'travel') {
        const organizationAccess = await canUseFeature(uid, 'premium_organization');
        if (!organizationAccess.allowed) {
          setUpgradeModal(buildUpgradeModalState('premium_organization', organizationAccess));
          return;
        }
      }

      const savedCanvas = await persistCanvas({ silent: true });
      const resolvedName = String(saveSheetName || '').trim() || String(title || DEFAULT_CANVAS_TITLE).trim() || 'Canvas Look';
      const savedOutfit = await saveCanvasAsOutfit({
        canvasId: savedCanvas?.id || canvasId || null,
        title: resolvedName,
        context: canvasContext || null,
        season: canvasSeason || null,
        items: savedCanvas?.items || items,
        travelCollectionId: saveSheetMode === 'travel' ? saveSheetTravelCollectionId : null,
        activityLabel: saveSheetMode === 'travel' ? saveSheetActivityLabel : null,
        dayLabel: saveSheetMode === 'travel' ? saveSheetDayLabel : null,
        outfitMode: saveSheetMode,
      });

      closeSaveSheet();
      Alert.alert(
        'Saved as outfit',
        saveSheetMode === 'travel' && selectedTravelCollection
          ? `This look was saved to "${selectedTravelCollection.name}".`
          : 'This look is now in your saved outfits.',
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'Open Outfit',
            onPress: () => navigation.navigate('OutfitDetail', { outfit: savedOutfit }),
          },
        ],
      );
    } catch (error: any) {
      if (isSubscriptionLimitError(error)) {
        setUpgradeModal(buildUpgradeModalState(error.featureName, error.accessResult));
        return;
      }
      Alert.alert('Save outfit error', error?.message || 'Could not save this canvas as an outfit.');
    } finally {
      setSavingOutfit(false);
    }
  }, [
    canvasContext,
    canvasId,
    canvasSeason,
    closeSaveSheet,
    items,
    navigation,
    persistCanvas,
    saveSheetActivityLabel,
    saveSheetDayLabel,
    saveSheetMode,
    saveSheetName,
    saveSheetTravelCollectionId,
    savingOutfit,
    selectedTravelCollection,
    title,
  ]);

  const handleTryOnLook = useCallback(async () => {
    if (!items.length || preparingTryOn) {
      if (!items.length) {
        Alert.alert('No items yet', 'Add at least one piece before starting try-on.');
      }
      return;
    }

    const tryOnPayload = extractTryOnCandidatesFromCanvas(items);
    if (!tryOnPayload.items.length) {
      Alert.alert('Nothing to try on', 'No compatible pieces are ready for try-on yet.');
      return;
    }

    const continueToTryOn = () => {
      navigation.navigate('TryOn', {
        items: tryOnPayload.items,
        outfit: tryOnPayload.items,
      });
    };

    setPreparingTryOn(true);
    try {
      if (tryOnPayload.ignoredCount > 0) {
        Alert.alert(
          'Review try-on',
          `${tryOnPayload.items.length} item${tryOnPayload.items.length === 1 ? '' : 's'} will be used for try-on. ${tryOnPayload.ignoredCount} item${tryOnPayload.ignoredCount === 1 ? '' : 's'} will be skipped.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: continueToTryOn,
            },
          ],
        );
      } else {
        continueToTryOn();
      }
    } finally {
      setPreparingTryOn(false);
    }
  }, [items, navigation, preparingTryOn]);

  const handleCloseCanvas = useCallback(async () => {
    if (savingCanvas || closingCanvas) return;
    if (!items.length) {
      navigation.goBack();
      return;
    }

    setClosingCanvas(true);
    try {
      await persistCanvas({ silent: true });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Save error', error?.message || 'Could not save and close this style canvas.');
    } finally {
      setClosingCanvas(false);
    }
  }, [closingCanvas, items.length, navigation, persistCanvas, savingCanvas]);

  const saveSheetModal = (
    <SaveGeneratedOutfitModal
      visible={saveSheetVisible}
      eyebrowText="Save canvas outfit"
      titleText="Save Outfit"
      subtitleText={
        items.length
          ? `${items.length} canvas ${items.length === 1 ? 'piece' : 'pieces'} ready to save.`
          : 'Save this look to your archive or a trip.'
      }
      confirmLabel="Save Outfit"
      name={saveSheetName}
      saveMode={saveSheetMode}
      travelCollections={travelCollections}
      travelCollectionsLoading={travelCollectionsLoading}
      selectedTravelCollectionId={saveSheetTravelCollectionId}
      activityLabel={saveSheetActivityLabel}
      dayLabel={saveSheetDayLabel}
      generatedOutfit={items}
      submitting={savingOutfit}
      onClose={closeSaveSheet}
      onConfirm={() => {
        void handleConfirmSaveAsOutfit();
      }}
      onChangeName={setSaveSheetName}
      onChangeSaveMode={(value) => {
        if (value === 'travel') {
          void supabase.auth.getUser()
            .then(async ({ data }) => {
              const uid = String(data?.user?.id || '').trim();
              const result = await canUseFeature(uid, 'premium_organization');
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

  const handleAddSelectedItems = useCallback(() => {
    if (addSource === 'closet') {
      const selected = closetItems.filter((item) => selectedClosetIds[item.id]);
      if (!selected.length) return;

      appendCanvasItems(
        wardrobeItemsToCanvasItems(selected, {
          startingZIndex: items.length + 1,
        }),
      );
      setSelectedClosetIds({});
      setAddSheetVisible(false);
      return;
    }

    const selected = browserItems.filter((item) => selectedBrowserIds[item.id]);
    if (!selected.length) return;

    appendCanvasItems(
      browserItemsToCanvasItems(selected, {
        startingZIndex: items.length + 1,
      }),
    );
    setSelectedBrowserIds({});
    setAddSheetVisible(false);
  }, [
    addSource,
    appendCanvasItems,
    browserItems,
    closetItems,
    items.length,
    selectedBrowserIds,
    selectedClosetIds,
  ]);

  const handleImportUrl = useCallback(async () => {
    const normalizedUrl = normalizeMaybeUrl(pasteUrl);
    if (!normalizedUrl) {
      Alert.alert('Missing URL', 'Paste a product page URL to add it to the canvas.');
      return;
    }

    setImportingUrl(true);
    try {
      const response = await apiPost('/import/scan', { url: normalizedUrl });
      const payload = await parseApiJsonSafe(response);
      if (!response.ok || !payload?.product) {
        throw new Error(payload?.error || 'No product could be detected from that link.');
      }

      const product = payload.product;
      const heroImage =
        (Array.isArray(product.images) && product.images[0]) ||
        (Array.isArray(product.image) && product.image[0]) ||
        product.image ||
        null;

      if (!heroImage) {
        throw new Error('That product did not return a usable image.');
      }

      const [browserItem] = buildBrowserItemsFromImageUrls([heroImage], {
        title: product.title || product.name || 'Imported Product',
        brand: product.brand ?? null,
        retailer: product.retailer || product.retailerName || null,
        product_url: product.product_url || product.url || normalizedUrl,
        price: product.price ?? null,
        category: product.category || product.type || null,
        color: product.color || null,
        currency: product.currency || null,
      });

      if (!browserItem) {
        throw new Error('That product could not be prepared for the canvas.');
      }

      setBrowserItems((current) => {
        const existing = current.find((item) => item.product_url === browserItem.product_url && item.image_url === browserItem.image_url);
        return existing ? current : [browserItem, ...current];
      });

      appendCanvasItems(
        browserItemsToCanvasItems([browserItem], {
          startingZIndex: items.length + 1,
        }),
      );

      setPasteUrl('');
      setAddSheetVisible(false);
    } catch (error: any) {
      Alert.alert('Paste URL error', error?.message || 'Could not add that product URL to the canvas.');
    } finally {
      setImportingUrl(false);
    }
  }, [appendCanvasItems, items.length, pasteUrl]);

  const toggleSelectedItemLock = useCallback(() => {
    if (!selectedItemId) return;
    setItems((current) =>
      current.map((item) =>
        item.id === selectedItemId
          ? {
              ...item,
              locked: !item.locked,
            }
          : item,
      ),
    );
  }, [selectedItemId]);

  const removeSelectedItem = useCallback(() => {
    if (!selectedItemId) return;

    setItems((current) => {
      const nextItems = current.filter((item) => item.id !== selectedItemId);
      return reindexCanvasItems(nextItems);
    });
    setSelectedItemId(null);
  }, [selectedItemId]);

  const clearAllItems = useCallback(() => {
    if (!items.length || savingCanvas || closingCanvas) return;

    Alert.alert(
      'Clear canvas?',
      'This removes every piece from the board, but does not delete the underlying closet or browser items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const previousItems = items;
            setItems([]);
            setSelectedItemId(null);

            if (!canvasId) {
              return;
            }

            setSavingCanvas(true);
            try {
              const savedCanvas = await saveStyleCanvas({
                canvasId,
                title,
                origin,
                previewImageUrl: null,
                previewImagePath: null,
                backgroundColor,
                metadata: {
                  item_count: 0,
                  browser_item_count: browserItems.length,
                  context: canvasContext || null,
                  season: canvasSeason || null,
                },
                items: [],
              });

              setCanvasId(savedCanvas.id);
              setItems(reindexCanvasItems(savedCanvas.items || []));
              setTitle(savedCanvas.title || title || DEFAULT_CANVAS_TITLE);
              setOrigin(savedCanvas.origin || origin || 'manual');
              setBackgroundColor(normalizeCanvasBackground(savedCanvas.background_color || DEFAULT_BACKGROUND));
              setCanvasContext(String(savedCanvas.metadata?.context || '').trim());
              setCanvasSeason(savedCanvas.metadata?.season || null);
              await setActiveStyleCanvasSession({
                canvasId: savedCanvas.id,
                title: savedCanvas.title || title || DEFAULT_CANVAS_TITLE,
                origin: savedCanvas.origin || origin || 'manual',
              });
            } catch (error: any) {
              setItems(previousItems);
              Alert.alert('Clear all error', error?.message || 'Could not clear this canvas.');
            } finally {
              setSavingCanvas(false);
            }
          },
        },
      ],
    );
  }, [
    backgroundColor,
    browserItems.length,
    canvasContext,
    canvasId,
    canvasSeason,
    closingCanvas,
    items,
    origin,
    savingCanvas,
    title,
  ]);

  const moveSelectedLayer = useCallback(
    (direction: 'front' | 'back') => {
      if (!selectedItemId) return;
      setItems((current) => moveCanvasItemToLayer(current, selectedItemId, direction));
    },
    [selectedItemId],
  );

  const selectionSupportText = useMemo(() => {
    if (!selectedItem) {
      return 'Tap a piece to reveal layer, lock, and remove controls.';
    }

    if (selectedItem.locked) {
      return 'Locked pieces stay in place until you unlock them.';
    }

    if (!canMoveSelectedBack && !canMoveSelectedFront) {
      return 'This is the only piece on the board.';
    }

    if (!canMoveSelectedBack) {
      return 'This piece is already at the back of the stack.';
    }

    if (!canMoveSelectedFront) {
      return 'This piece is already at the front of the stack.';
    }

    return 'Use the controls below to change layer order or remove this piece.';
  }, [canMoveSelectedBack, canMoveSelectedFront, selectedItem]);

  const dockReserveSpace = selectedItem ? 168 : items.length ? 118 : 84;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={[styles.headerShell, { paddingTop: Math.max(insets.top + spacing.xs, spacing.lg) }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.iconButton}
            disabled={savingCanvas || closingCanvas}
            onPress={() => {
              void handleCloseCanvas();
            }}
          >
            {closingCanvas ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            disabled={savingCanvas}
            style={[styles.saveButton, savingCanvas && styles.saveButtonDisabled]}
            onPress={() => {
              void handleSaveCanvas();
            }}
          >
            {savingCanvas ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={15} color={colors.textOnAccent} />
                <Text style={styles.saveButtonText}>Save Canvas</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>Style Canvas</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={DEFAULT_CANVAS_TITLE}
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
              numberOfLines={1}
            />
          </View>
        </View>
      </View>

      <View style={[styles.stageShell, { paddingBottom: dockReserveSpace + Math.max(insets.bottom, spacing.sm) }]}>
        <View style={styles.stageCard}>
          <View
            style={[styles.stage, { backgroundColor }]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setStageLayout({ width, height });
            }}
          >
            <View style={styles.stageGlowLarge} />
            <View style={styles.stageGlowSmall} />
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedItemId(null)} />

            {loadingCanvas ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.textPrimary} />
                <Text style={styles.loadingText}>Loading your saved canvas...</Text>
              </View>
            ) : !items.length ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="color-wand-outline" size={26} color={colors.textPrimary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isClosetOnlyCanvas
                    ? 'Start building with pieces already in your closet.'
                    : 'Start building with pieces you actually want to wear.'}
                </Text>
                <Text style={styles.emptyCopy}>
                  {isClosetOnlyCanvas
                    ? 'Pull in your closet staples and arrange the look visually before saving or trying it on.'
                    : 'Pull in browser finds, closet staples, or a fresh product URL and arrange the look visually.'}
                </Text>
              </View>
            ) : null}

            {items.map((item) => (
              <StyleCanvasBoardItem
                key={item.id}
                item={item}
                selected={item.id === selectedItemId}
                stageWidth={stageLayout.width}
                stageHeight={stageLayout.height}
                onSelect={setSelectedItemId}
                onTransformEnd={handleTransformEnd}
              />
            ))}
          </View>
        </View>
      </View>

      <View pointerEvents="none" style={styles.hiddenPreviewCaptureWrap}>
        <ViewShot
          ref={previewCaptureRef}
          options={{ format: 'jpg', quality: 0.94 }}
          style={styles.hiddenPreviewCaptureShot}
        >
          <View style={[styles.hiddenPreviewStage, { backgroundColor }]}>
            <View style={styles.stageGlowLarge} />
            <View style={styles.stageGlowSmall} />
            {items.map((item) => (
              <StyleCanvasBoardItem
                key={`preview-${item.id}`}
                item={item}
                selected={false}
                interactive={false}
                showLockedBadge={false}
                stageWidth={CANVAS_PREVIEW_STAGE_WIDTH}
                stageHeight={CANVAS_PREVIEW_STAGE_HEIGHT}
                onImageLoadEnd={handlePreviewItemLoadEnd}
              />
            ))}
          </View>
        </ViewShot>
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.controlDockWrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs }]}
      >
        <View style={styles.controlDock}>
          <View style={styles.primaryActionGrid}>
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.92}
              onPress={() => {
                setAddSheetVisible(true);
                if (allowedSources.includes('browser') && origin === 'browser' && browserItems.length) {
                  setAddSource('browser');
                  return;
                }
                setAddSource(allowedSources.includes('closet') ? 'closet' : allowedSources[0] || 'closet');
              }}
            >
              <Ionicons name="add" size={18} color={colors.textOnAccent} />
              <Text style={styles.addButtonText}>{isClosetOnlyCanvas ? 'Add Closet Pieces' : 'Add Items'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              disabled={savingOutfit || savingCanvas || loadingCanvas}
              style={[
                styles.secondaryPrimaryAction,
                (savingOutfit || savingCanvas || loadingCanvas) && styles.primaryActionDisabled,
              ]}
              onPress={() => {
                handleOpenSaveAsOutfit();
              }}
            >
              {savingOutfit ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <Ionicons name="bookmark-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.secondaryPrimaryActionText}>Save as Outfit</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              disabled={preparingTryOn || loadingCanvas}
              style={[styles.primaryActionButton, (preparingTryOn || loadingCanvas) && styles.primaryActionDisabled]}
              onPress={() => {
                void handleTryOnLook();
              }}
            >
              {preparingTryOn ? (
                <ActivityIndicator size="small" color={colors.textOnAccent} />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color={colors.textOnAccent} />
                  <Text style={styles.primaryActionText}>Try On</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {items.length ? (
            <View style={styles.utilityRow}>
              <TouchableOpacity
                activeOpacity={0.86}
                disabled={savingCanvas || closingCanvas || loadingCanvas}
                style={[styles.clearAllButton, (savingCanvas || closingCanvas || loadingCanvas) && styles.primaryActionDisabled]}
                onPress={clearAllItems}
              >
                <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {selectedItem ? (
            <View style={styles.selectionToolbar}>
              <View style={styles.selectionHeader}>
                <View style={styles.selectionTextWrap}>
                  <Text style={styles.selectionEyebrow}>Selected Piece</Text>
                  <Text style={styles.selectionCompactTitle} numberOfLines={1}>
                    {selectedItem.title || selectedItem.category || 'Canvas piece'}
                  </Text>
                </View>
              </View>
              <View style={styles.selectionActionRow}>
                <TouchableOpacity
                  style={[styles.selectionActionButton, !canMoveSelectedBack && styles.selectionActionButtonDisabled]}
                  disabled={!canMoveSelectedBack}
                  onPress={() => moveSelectedLayer('back')}
                >
                  <Ionicons name="arrow-down-outline" size={14} color={colors.textPrimary} />
                  <Text style={styles.selectionActionButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectionActionButton, !canMoveSelectedFront && styles.selectionActionButtonDisabled]}
                  disabled={!canMoveSelectedFront}
                  onPress={() => moveSelectedLayer('front')}
                >
                  <Ionicons name="arrow-up-outline" size={14} color={colors.textPrimary} />
                  <Text style={styles.selectionActionButtonText}>Front</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectionActionButton} onPress={toggleSelectedItemLock}>
                  <Ionicons
                    name={selectedItem.locked ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={14}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.selectionActionButtonText}>{selectedItem.locked ? 'Unlock' : 'Lock'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectionActionButton, styles.selectionActionButtonRemove]}
                  onPress={removeSelectedItem}
                >
                  <Ionicons name="close-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.selectionActionButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : items.length ? (
            <Text style={styles.selectionSupportText} numberOfLines={1}>
              {selectionSupportText}
            </Text>
          ) : null}
        </View>
      </View>

      <StyleCanvasAddItemsSheet
        visible={addSheetVisible}
        source={addSource}
        availableSources={allowedSources}
        onChangeSource={setAddSource}
        onClose={() => setAddSheetVisible(false)}
        closetItems={closetItems}
        browserItems={browserItems}
        selectedClosetIds={selectedClosetIds}
        selectedBrowserIds={selectedBrowserIds}
        onToggleClosetItem={(itemId) =>
          setSelectedClosetIds((current) => ({
            ...current,
            [itemId]: !current[itemId],
          }))
        }
        onToggleBrowserItem={(itemId) =>
          setSelectedBrowserIds((current) => ({
            ...current,
            [itemId]: !current[itemId],
          }))
        }
        onAddSelected={handleAddSelectedItems}
        canAddSelected={addSource === 'closet' ? selectedClosetCount > 0 : selectedBrowserCount > 0}
        isLoadingSourceItems={addSource === 'closet' ? loadingClosetItems : loadingBrowserItems}
        pasteUrl={pasteUrl}
        onChangePasteUrl={setPasteUrl}
        onSubmitPasteUrl={() => {
          void handleImportUrl();
        }}
        isSubmittingUrl={importingUrl}
        isAddingSelected={false}
      />
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerShell: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: typography.fontFamily,
  },
  titleInput: {
    marginTop: 2,
    marginLeft: -1,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    paddingVertical: 0,
    fontFamily: 'Georgia',
  },
  saveButton: {
    minWidth: 104,
    minHeight: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.textOnAccent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: typography.fontFamily,
  },
  stageShell: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
  },
  stageCard: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.card,
  },
  hiddenPreviewCaptureWrap: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  hiddenPreviewCaptureShot: {
    width: CANVAS_PREVIEW_STAGE_WIDTH,
    height: CANVAS_PREVIEW_STAGE_HEIGHT,
  },
  hiddenPreviewStage: {
    width: CANVAS_PREVIEW_STAGE_WIDTH,
    height: CANVAS_PREVIEW_STAGE_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  stage: {
    flex: 1,
    minHeight: 420,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  stageGlowLarge: {
    position: 'absolute',
    top: 24,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  stageGlowSmall: {
    position: 'absolute',
    bottom: 42,
    left: -24,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(238, 240, 242, 0.72)',
  },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 42,
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,250,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    marginTop: 12,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  emptyCopy: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  controlDockWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
  controlDock: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(218, 221, 216, 0.92)',
    backgroundColor: 'rgba(250, 250, 255, 0.98)',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
    ...shadows.card,
  },
  primaryActionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    marginLeft: 8,
    color: colors.textOnAccent,
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  primaryActionButton: {
    flex: 0.92,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  primaryActionText: {
    color: colors.textOnAccent,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryPrimaryAction: {
    flex: 1.08,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  secondaryPrimaryActionText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  primaryActionDisabled: {
    opacity: 0.58,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  clearAllButton: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearAllButtonText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  selectionEyebrow: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: typography.fontFamily,
  },
  selectionToolbar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(218, 221, 216, 0.68)',
    paddingTop: 10,
    gap: 10,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  selectionCompactTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  selectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionActionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionActionButtonRemove: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  selectionActionButtonDisabled: {
    opacity: 0.45,
  },
  selectionActionButtonText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  selectionSupportText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 15,
    fontFamily: typography.fontFamily,
  },
});
