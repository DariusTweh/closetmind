import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import StyleCanvasAddItemsSheet from '../components/style-canvas/StyleCanvasAddItemsSheet';
import StyleCanvasBoardItem from '../components/style-canvas/StyleCanvasBoardItem';
import { apiPost } from '../lib/api';
import { setActiveStyleCanvasSession } from '../lib/styleCanvasSession';
import { colors, shadows, spacing, typography } from '../lib/theme';
import { fetchRecentExternalBrowserItems } from '../services/externalItemsService';
import {
  fetchClosetCanvasItems,
  loadStyleCanvas,
  saveCanvasAsOutfit,
  saveStyleCanvas,
} from '../services/styleCanvasService';
import type { BrowserItem, CanvasItem, WardrobeCanvasSourceItem } from '../types/styleCanvas';
import {
  browserItemsToCanvasItems,
  canvasItemsToBrowserItems,
  buildBrowserItemsFromImageUrls,
  extractTryOnCandidatesFromCanvas,
  moveCanvasItemToLayer,
  reindexCanvasItems,
  wardrobeItemsToCanvasItems,
} from '../utils/styleCanvasAdapters';

type StyleCanvasRouteParams = {
  canvasId?: string;
  initialItems?: CanvasItem[];
  appendItems?: CanvasItem[];
  availableBrowserItems?: BrowserItem[];
  origin?: string;
  initialTitle?: string;
};

const DEFAULT_CANVAS_TITLE = 'Style Canvas';
const EDITORIAL_CANVAS_BACKGROUND = '#f3f5f8';
const LEGACY_WARM_CANVAS_BACKGROUNDS = new Set(['#f7f1e7', '#f7f1e7ff', 'rgb(247,241,231)']);
const DEFAULT_BACKGROUND = EDITORIAL_CANVAS_BACKGROUND;

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

  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [addSource, setAddSource] = useState<'closet' | 'browser' | 'url'>('closet');
  const [closetItems, setClosetItems] = useState<WardrobeCanvasSourceItem[]>([]);
  const [loadingClosetItems, setLoadingClosetItems] = useState(false);
  const [browserItems, setBrowserItems] = useState<BrowserItem[]>(params?.availableBrowserItems || []);
  const [loadingBrowserItems, setLoadingBrowserItems] = useState(false);
  const [selectedClosetIds, setSelectedClosetIds] = useState<Record<string, boolean>>({});
  const [selectedBrowserIds, setSelectedBrowserIds] = useState<Record<string, boolean>>({});
  const [pasteUrl, setPasteUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [stageLayout, setStageLayout] = useState({ width: 0, height: 0 });
  const [canvasContext, setCanvasContext] = useState('');
  const [canvasSeason, setCanvasSeason] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) || null,
    [items, selectedItemId],
  );

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

  const persistCanvas = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!items.length) {
      if (!silent) {
        Alert.alert('No items yet', 'Add at least one piece before saving this style canvas.');
      }
      return null;
    }

    setSavingCanvas(true);
    try {
      const savedCanvas = await saveStyleCanvas({
        canvasId,
        title,
        origin,
        previewImageUrl: selectedItem?.cutout_url || selectedItem?.image_url || items[0]?.cutout_url || items[0]?.image_url || null,
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
  }, [backgroundColor, browserItems.length, canvasContext, canvasId, canvasSeason, items, origin, selectedItem, title]);

  const handleSaveCanvas = useCallback(async () => {
    await persistCanvas({ silent: false });
  }, [persistCanvas]);

  const handleSaveAsOutfit = useCallback(async () => {
    if (!items.length || savingOutfit) {
      if (!items.length) {
        Alert.alert('No items yet', 'Add at least one piece before saving this canvas as an outfit.');
      }
      return;
    }

    setSavingOutfit(true);
    try {
      const savedCanvas = await persistCanvas({ silent: true });
      const savedOutfit = await saveCanvasAsOutfit({
        canvasId: savedCanvas?.id || canvasId || null,
        title: title || DEFAULT_CANVAS_TITLE,
        context: canvasContext || null,
        season: canvasSeason || null,
        items: savedCanvas?.items || items,
      });

      Alert.alert('Saved as outfit', 'This look is now in your saved outfits.', [
        { text: 'Stay Here', style: 'cancel' },
        {
          text: 'Open Outfit',
          onPress: () => navigation.navigate('OutfitDetail', { outfit: savedOutfit }),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Save outfit error', error?.message || 'Could not save this canvas as an outfit.');
    } finally {
      setSavingOutfit(false);
    }
  }, [canvasContext, canvasId, canvasSeason, items, navigation, persistCanvas, savingOutfit, title]);

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

    return 'Use the controls below to change layer order or remove this piece.';
  }, [selectedItem]);

  const dockReserveSpace = selectedItem ? 128 : 84;

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
                <Text style={styles.emptyTitle}>Start building with pieces you actually want to wear.</Text>
                <Text style={styles.emptyCopy}>
                  Pull in browser finds, closet staples, or a fresh product URL and arrange the look visually.
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
                if (origin === 'browser' && browserItems.length) {
                  setAddSource('browser');
                  return;
                }
                setAddSource('closet');
              }}
            >
              <Ionicons name="add" size={18} color={colors.textOnAccent} />
              <Text style={styles.addButtonText}>Add Items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              disabled={savingOutfit || savingCanvas || loadingCanvas}
              style={[
                styles.secondaryPrimaryAction,
                (savingOutfit || savingCanvas || loadingCanvas) && styles.primaryActionDisabled,
              ]}
              onPress={() => {
                void handleSaveAsOutfit();
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
                <TouchableOpacity style={styles.selectionActionButton} onPress={() => moveSelectedLayer('back')}>
                  <Ionicons name="arrow-down-outline" size={14} color={colors.textPrimary} />
                  <Text style={styles.selectionActionButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectionActionButton} onPress={() => moveSelectedLayer('front')}>
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
          ) : (
            <Text style={styles.selectionSupportText} numberOfLines={1}>
              {selectionSupportText}
            </Text>
          )}
        </View>
      </View>

      <StyleCanvasAddItemsSheet
        visible={addSheetVisible}
        source={addSource}
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
