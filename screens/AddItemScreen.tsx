import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation, useRoute } from '@react-navigation/native';
import AddCaptureDock from '../components/AddItem/AddCaptureDock';
import AddCaptureStage from '../components/AddItem/AddCaptureStage';
import AddCaptureTopBar from '../components/AddItem/AddCaptureTopBar';
import AddItemDetailsSheet from '../components/AddItem/AddItemDetailsSheet';
import UpgradeLimitModal from '../components/subscriptions/UpgradeLimitModal';
import { useUpgradeWall } from '../hooks/useUpgradeWall';
import { apiPostWithRateLimitRetry } from '../lib/api';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../lib/subscriptions/modalState';
import { canUseFeature } from '../lib/subscriptions/usageService';
import {
  extractNormalizedTags,
  type TaggedFashionItem,
  type TaggingImportContext,
  type TaggingResponse,
} from '../lib/tagging';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import { buildWardrobeInsertPayload } from '../lib/wardrobePayload';
import { isSubtypeInCategory } from '../lib/wardrobeTaxonomy';
import {
  insertWardrobeItemWithCompatibility,
  prepareWardrobeItemDerivatives,
  uploadWardrobeImageBytes,
} from '../lib/wardrobeStorage';

type ImportMeta = {
  method: 'camera' | 'photos' | 'pick' | 'autoscan' | 'manual';
  source_url?: string | null;
  product_url?: string | null;
  source_domain?: string | null;
  retailer?: string | null;
  retailer_name?: string | null;
  brand?: string | null;
  price?: number | null;
  retail_price?: number | null;
  currency?: string | null;
  source_image_url?: string | null;
  original_image_url?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  external_product_id?: string | null;
  source_title?: string | null;
};

type RouteParams = {
  importedImages?: { uri: string }[];
  importMeta?: ImportMeta;
};

type SelectedImage = {
  uri: string;
};

type RemoveBackgroundResponse = {
  success?: boolean;
  cutout_url?: string | null;
  cutout_storage_url?: string | null;
  provider?: string | null;
  error?: string | null;
};

function buildTagImportContext(
  meta: ImportMeta | null,
  sourceImageUrl?: string | null,
): TaggingImportContext {
  return {
    source_url: meta?.source_url ?? meta?.product_url ?? null,
    product_url: meta?.product_url ?? meta?.source_url ?? null,
    source_domain: meta?.source_domain ?? null,
    retailer: meta?.retailer ?? meta?.retailer_name ?? null,
    retailer_name: meta?.retailer_name ?? null,
    brand: meta?.brand ?? null,
    price: meta?.price ?? meta?.retail_price ?? null,
    retail_price: meta?.retail_price ?? meta?.price ?? null,
    currency: meta?.currency ?? null,
    source_image_url: sourceImageUrl ?? meta?.source_image_url ?? null,
    original_image_url: meta?.original_image_url ?? sourceImageUrl ?? meta?.source_image_url ?? null,
    source_type: meta?.source_type ?? null,
    source_id: meta?.source_id ?? null,
    external_product_id: meta?.external_product_id ?? null,
    source_title: meta?.source_title ?? null,
  };
}

const CACHE_DIR = Paths.cache.uri + 'imports';

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function guessExtFromUrl(url: string) {
  return (url.split('?')[0].match(/\.([a-z0-9]{3,4})$/i)?.[1] || 'jpg').toLowerCase();
}

function safeNameFromUrl(url: string) {
  return `${Date.now()}_${Math.floor(Math.random() * 1e6)}_${url
    .replace(/^https?:\/\//, '')
    .replace(/[^\w.-]+/g, '_')}.${guessExtFromUrl(url)}`;
}

async function ensureLocalUri(uri: string) {
  if (!/^https?:\/\//i.test(uri)) return uri;

  await ensureCacheDir();
  const destination = `${CACHE_DIR}/${safeNameFromUrl(uri)}`;
  const info = await FileSystem.getInfoAsync(destination);
  if (info.exists) return destination;

  const { uri: localUri } = await FileSystem.downloadAsync(uri, destination);
  return localUri;
}

async function optimizeWardrobeUploadImage(uri: string) {
  const normalizedUri = await ensureLocalUri(uri);
  const manipulated = await ImageManipulator.manipulateAsync(
    normalizedUri,
    [{ resize: { width: 900 } }],
    {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return manipulated.uri || normalizedUri;
}

async function uploadImage(
  uri: string,
  userId: string,
): Promise<{ imagePath: string; imageUrl: string | null; accessUrl: string | null; storageUrl?: string | null }> {
  const optimizedUri = await optimizeWardrobeUploadImage(uri);
  const file = new File(optimizedUri);
  const info = await file.info();

  if (!info.exists) {
    throw new Error(`File does not exist at ${file.uri}`);
  }

  const bytes = await file.bytes();
  if (!bytes?.length) {
    throw new Error('File read produced 0 bytes');
  }

  return uploadWardrobeImageBytes({
    bytes,
    contentType: 'image/jpeg',
    extension: 'jpg',
    userId,
  });
}

export default function AddItemScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [mainCategory, setMainCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [color, setColor] = useState('');
  const [vibes, setVibes] = useState('');
  const [season, setSeason] = useState('');
  const [importMeta, setImportMeta] = useState<ImportMeta | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Saving item');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();

  const selectedImage = useMemo(
    () => (selectedImageIndex != null && images[selectedImageIndex] ? images[selectedImageIndex] : null),
    [images, selectedImageIndex],
  );
  const hasSelectedImage = Boolean(selectedImage);
  const hasCameraPermission = Boolean(cameraPermission?.granted);
  const canAskCameraPermission = cameraPermission?.canAskAgain !== false;

  const applyImportedImages = useCallback((nextImages: SelectedImage[], meta?: ImportMeta | null) => {
    if (!nextImages.length) return;

    const previousCount = images.length;
    setImages((prev) => [...prev, ...nextImages]);
    setSelectedImageIndex(previousCount + nextImages.length - 1);
    setDetailsVisible(false);
    if (meta) {
      setImportMeta(meta);
    }
  }, [images.length]);

  useEffect(() => {
    const params = (route.params || {}) as RouteParams;
    if (params.importedImages?.length) {
      applyImportedImages(
        params.importedImages.map((image) => ({ uri: image.uri })),
        params.importMeta ?? { method: 'pick' },
      );
    } else if (params.importMeta) {
      setImportMeta(params.importMeta);
    }
  }, [applyImportedImages, route.params]);

  const resetComposer = useCallback(() => {
    setImages([]);
    setSelectedImageIndex(null);
    setImportMeta(null);
    setName('');
    setMainCategory('');
    setSubcategory('');
    setColor('');
    setVibes('');
    setSeason('');
    setManualOverride(false);
    setDetailsVisible(false);
  }, []);

  const navigateToVerdict = useCallback((item: any) => {
    if (!item) return;
    navigation.navigate('ItemVerdict', {
      itemId: item.id,
      item,
      source: 'add',
      autoSaved: item?.wardrobe_status === 'owned',
    });
  }, [navigation]);

  const showDirectSaveAlert = useCallback((item: any, message = 'Item added to your closet.') => {
    Alert.alert('Saved', message, [
      {
        text: 'Done',
        style: 'cancel',
        onPress: resetComposer,
      },
      {
        text: 'Get Verdict',
        onPress: () => {
          resetComposer();
          navigateToVerdict(item);
        },
      },
    ]);
  }, [navigateToVerdict, resetComposer]);

  const showBatchSaveAlert = useCallback((savedCount: number, totalCount: number) => {
    const title = savedCount === totalCount ? 'Saved' : 'Partially Saved';
    const message = savedCount === totalCount
      ? `${savedCount} ${savedCount === 1 ? 'item was' : 'items were'} added to your closet.`
      : `${savedCount} of ${totalCount} items were added to your closet.`;

    Alert.alert(title, message, [
      {
        text: 'Done',
        onPress: resetComposer,
      },
    ]);
  }, [resetComposer]);

  const replaceSelectedImage = useCallback((nextImage: SelectedImage, meta?: ImportMeta | null) => {
    if (selectedImageIndex == null || !images.length) {
      setImages([nextImage]);
      setSelectedImageIndex(0);
    } else {
      const nextImages = [...images];
      nextImages[selectedImageIndex] = nextImage;
      setImages(nextImages);
    }

    setDetailsVisible(false);
    if (meta) {
      setImportMeta(meta);
    }
  }, [images, selectedImageIndex]);

  const captureFromSystemCamera = useCallback(async ({ replaceCurrent = false }: { replaceCurrent?: boolean } = {}) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to capture a clothing item.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
    });

    if (result.canceled || !result.assets?.length) return;

    const nextImage = { uri: result.assets[0].uri };
    const nextMeta: ImportMeta = { method: 'camera' };

    if (replaceCurrent) {
      replaceSelectedImage(nextImage, nextMeta);
      return;
    }

    applyImportedImages([nextImage], nextMeta);
  }, [applyImportedImages, replaceSelectedImage]);

  const captureFromStage = useCallback(async () => {
    if (hasSelectedImage) {
      await captureFromSystemCamera({ replaceCurrent: true });
      return;
    }

    if (!hasCameraPermission) {
      const status = await requestCameraPermission();
      if (!status.granted) {
        Alert.alert('Camera permission required', 'Enable camera access to capture an item directly.');
      }
      return;
    }

    if (!cameraRef.current || !cameraReady) {
      await captureFromSystemCamera();
      return;
    }

    try {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.92,
      });
      if (!result?.uri) return;
      applyImportedImages([{ uri: result.uri }], { method: 'camera' });
    } catch (error: any) {
      Alert.alert('Capture failed', error?.message || 'Try again in a moment.');
    }
  }, [
    applyImportedImages,
    cameraReady,
    captureFromSystemCamera,
    hasCameraPermission,
    hasSelectedImage,
    requestCameraPermission,
  ]);

  const pickImages = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Photo access required', 'Allow photo library access to import a clothing item.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      selectionLimit: 10,
    });

    if (result.canceled || !result.assets?.length) return;

    applyImportedImages(
      result.assets.map((asset) => ({ uri: asset.uri })),
      { method: 'photos' },
    );
  }, [applyImportedImages]);

  const removeSelectedImage = useCallback(() => {
    if (selectedImageIndex == null) return;

    const nextImages = images.filter((_, index) => index !== selectedImageIndex);
    setImages(nextImages);
    setSelectedImageIndex(nextImages.length ? Math.min(selectedImageIndex, nextImages.length - 1) : null);
    setDetailsVisible(false);

    if (!nextImages.length) {
      setImportMeta(null);
    }
  }, [images, selectedImageIndex]);

  const importSingleImage = useCallback(async ({
    image,
    userId,
    openVerdict = false,
  }: {
    image: SelectedImage;
    userId: string;
    openVerdict?: boolean;
  }) => {
    const uploadedImage = await uploadImage(image.uri, userId);
    const imageUrl = uploadedImage.accessUrl;
    const originalImageUrl = uploadedImage.storageUrl || uploadedImage.imageUrl || uploadedImage.accessUrl || null;
    const sourceImageForThis = /^https?:\/\//i.test(image.uri)
      ? image.uri
      : (importMeta?.source_image_url ?? null);

    if (!imageUrl) {
      throw new Error('Unable to resolve uploaded image for tagging.');
    }

    let cutoutImageUrl: string | null = null;
    let bgRemoved = false;
    setLoadingLabel('Removing background...');
    try {
      const { response: cutoutResponse, data: cutoutPayload } = await apiPostWithRateLimitRetry<RemoveBackgroundResponse>('/images/remove-background', {
        image_url: imageUrl,
      }, {
        maxAttempts: 3,
        fallbackMs: 2000,
        onRetry: () => {
          setLoadingLabel('Background service busy, retrying...');
        },
      });
      const cutoutError =
        cutoutPayload && typeof cutoutPayload === 'object' && 'error' in cutoutPayload
          ? String(cutoutPayload.error || '').trim()
          : '';

      if (cutoutResponse.ok && !cutoutError) {
        const payload = cutoutPayload as RemoveBackgroundResponse;
        cutoutImageUrl = payload.cutout_storage_url || payload.cutout_url || null;
        bgRemoved = Boolean(payload.success && cutoutImageUrl);
      } else {
        console.warn('Background removal failed; continuing with original image.', {
          status: cutoutResponse.status,
          error: cutoutError || 'Unknown WaveSpeed error',
        });
      }
    } catch (error: any) {
      console.warn('Background removal request failed; continuing with original image.', {
        error: error?.message || error,
      });
    }

    let tags: TaggedFashionItem | undefined;
    if (!manualOverride) {
      setLoadingLabel('Analyzing item...');
      const { response: tagResponse, data: taggingPayload } = await apiPostWithRateLimitRetry<TaggingResponse>('/tag', {
        image_url: imageUrl,
        import_context: buildTagImportContext(importMeta, sourceImageForThis ?? imageUrl),
      }, {
        maxAttempts: 3,
        fallbackMs: 2000,
        onRetry: () => {
          setLoadingLabel('Analysis service busy, retrying...');
        },
      });
      tags = extractNormalizedTags(taggingPayload);
      if (!tagResponse.ok || taggingPayload?.error) {
        throw new Error(
          tagResponse.status === 429
            ? 'Closet import is temporarily busy. Please try again in a moment.'
            : taggingPayload?.error || 'AI tagging failed',
        );
      }
    }

    const importMethod = importMeta?.method || (manualOverride ? 'manual' : 'photos');
    const insertPayload = buildWardrobeInsertPayload({
      userId,
      uploadedImage: {
        ...uploadedImage,
        imageUrl: originalImageUrl,
        cutoutImageUrl,
        bgRemoved,
      },
      normalizedTags: tags,
      importMeta: {
        ...importMeta,
        source_image_url: sourceImageForThis ?? importMeta?.source_image_url ?? originalImageUrl,
        original_image_url:
          sourceImageForThis ??
          importMeta?.original_image_url ??
          importMeta?.source_image_url ??
          originalImageUrl,
      },
      manualOverride,
      manualFields: {
        name,
        main_category: mainCategory,
        subcategory,
        color,
        vibes,
        season,
      },
      wardrobeStatus: openVerdict ? 'scanned_candidate' : 'owned',
      importMethod,
      sourceType: importMethod === 'camera' ? 'wardrobe_capture' : 'manual_upload',
      sourceTitleFallback: importMeta?.source_title ?? null,
    });

    setLoadingLabel(openVerdict ? 'Preparing verdict' : 'Saving item...');
    const { data: insertedItem, error: insertError } = await insertWardrobeItemWithCompatibility(insertPayload);
    if (insertError) {
      throw new Error(insertError.message);
    }

    return await prepareWardrobeItemDerivatives(insertedItem);
  }, [
    color,
    importMeta,
    manualOverride,
    mainCategory,
    name,
    season,
    subcategory,
    vibes,
  ]);

  const handleImportSelected = useCallback(async ({
    openVerdict = false,
  }: {
    openVerdict?: boolean;
  } = {}) => {
    const targetImages = openVerdict
      ? (selectedImage ? [selectedImage] : [])
      : images;

    if (!targetImages.length) {
      Alert.alert('Select an image first.');
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Error', 'You must be logged in to add clothing.');
      return;
    }

    const closetAccess = await canUseFeature(user.id, 'closet_item');
    const numericRemaining =
      closetAccess.remaining === 'unlimited'
        ? Number.POSITIVE_INFINITY
        : Number.isFinite(Number(closetAccess.remaining))
          ? Number(closetAccess.remaining)
          : 0;

    if (!closetAccess.allowed || numericRemaining < targetImages.length) {
      setUpgradeModal(buildUpgradeModalState('closet_item', closetAccess));
      return;
    }

    setIsLoading(true);
    setLoadingLabel(
      openVerdict
        ? 'Preparing verdict'
        : targetImages.length > 1
          ? 'Saving items'
          : 'Saving item',
    );
    setUploadProgress({ current: 1, total: targetImages.length });

    try {
      const insertedItems: any[] = [];
      const failures: string[] = [];

      for (let index = 0; index < targetImages.length; index += 1) {
        setUploadProgress({ current: index + 1, total: targetImages.length });
        try {
          const insertedItem = await importSingleImage({
            image: targetImages[index],
            userId: user.id,
            openVerdict,
          });
          insertedItems.push(insertedItem);
        } catch (error: any) {
          failures.push(error?.message || 'Unknown import error');
          if (openVerdict) {
            throw error;
          }
        }
      }

      if (openVerdict) {
        if (!insertedItems[0]) {
          throw new Error('Unable to prepare verdict for this item.');
        }
        navigateToVerdict(insertedItems[0]);
        return;
      }

      if (!insertedItems.length) {
        throw new Error(failures[0] || 'No items were imported.');
      }

      if (insertedItems.length === 1 && targetImages.length === 1) {
        showDirectSaveAlert(insertedItems[0]);
      } else {
        showBatchSaveAlert(insertedItems.length, targetImages.length);
      }
    } catch (error: any) {
      console.error('AddItem import failed:', error);
      Alert.alert('Error importing item', error?.message || 'Unknown error');
    } finally {
      setIsLoading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }, [
    color,
    images,
    importSingleImage,
    importMeta,
    manualOverride,
    mainCategory,
    name,
    navigateToVerdict,
    season,
    selectedImage,
    showBatchSaveAlert,
    showDirectSaveAlert,
    subcategory,
    vibes,
  ]);

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Closet' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.flex}>
          <AddCaptureTopBar
            canSave={hasSelectedImage}
            loading={isLoading}
            saveLabel={images.length > 1 ? `Save ${images.length}` : 'Save'}
            onClose={handleClose}
            onOpenDetails={() => setDetailsVisible(true)}
            onSave={() => {
              void handleImportSelected();
            }}
          />

          <View style={styles.stageWrap}>
            <AddCaptureStage
              selectedImage={selectedImage}
              images={images}
              selectedImageIndex={selectedImageIndex}
              importMethod={importMeta?.method ?? null}
              cameraRef={cameraRef}
              hasCameraPermission={hasCameraPermission}
              canAskForPermission={canAskCameraPermission}
              onRequestPermission={() => {
                void requestCameraPermission();
              }}
              onCameraReady={() => {
                setCameraReady(true);
              }}
              onRemove={removeSelectedImage}
              onSelectImage={setSelectedImageIndex}
            />
          </View>

          <AddCaptureDock
            hasImage={hasSelectedImage}
            loading={isLoading}
            onLibrary={() => {
              void pickImages();
            }}
            onCapture={() => {
              void captureFromStage();
            }}
            onVerdict={() => {
              void handleImportSelected({ openVerdict: true });
            }}
            verdictDisabled={!hasSelectedImage}
          />

          <AddItemDetailsSheet
            visible={detailsVisible}
            manualOverride={manualOverride}
            name={name}
            mainCategory={mainCategory}
            subcategory={subcategory}
            color={color}
            vibes={vibes}
            season={season}
            onClose={() => setDetailsVisible(false)}
            onSetManualOverride={setManualOverride}
            onSetName={setName}
            onSetMainCategory={(next) => {
              setMainCategory(next);
              setSubcategory((current) => (isSubtypeInCategory(current, next) ? current : ''));
            }}
            onSetSubcategory={setSubcategory}
            onSetColor={setColor}
            onSetVibes={setVibes}
            onSetSeason={setSeason}
          />
        </View>
      </KeyboardAvoidingView>

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
            <Text style={styles.loadingTitle}>{loadingLabel}</Text>
            <Text style={styles.loadingText}>
              Item {uploadProgress.current} of {uploadProgress.total}
            </Text>
          </View>
        </View>
      ) : null}

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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  stageWrap: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 27, 24, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 1,
  },
  loadingTitle: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  loadingText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
