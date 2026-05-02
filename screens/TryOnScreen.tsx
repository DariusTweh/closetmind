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
import UpgradeLimitModal from '../components/subscriptions/UpgradeLimitModal';
import { apiPost, getRetryAfterMs, isRateLimitedResponse, readApiResponse } from '../lib/api';
import { describeResolvedPrivateMediaSource, resolvePrivateMediaUrl } from '../lib/privateMedia';
import { useUpgradeWall } from '../hooks/useUpgradeWall';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../lib/subscriptions/modalState';
import { canUseFeature, incrementUsage } from '../lib/subscriptions/usageService';
import { toStyleRequestWardrobeItem } from '../lib/styleRequestWardrobe';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import { buildTryOnSourceKeys, readCachedTryOnResult, writeCachedTryOnResult } from '../lib/tryOnCache';
import TryOnActionBar from '../components/TryOn/TryOnActionBar';
import TryOnHeader from '../components/TryOn/TryOnHeader';
import TryOnPreviewStage from '../components/TryOn/TryOnPreviewStage';
import TryOnSelectedTray from '../components/TryOn/TryOnSelectedTray';

// ---- Types ----
type WardrobeItem = {
  id: string;
  outfit_role?: string | null;
  layering_role?: string | null;
  category?: string | null;
  source_type?: 'wardrobe' | 'external' | string | null;
  source_subtype?: string | null;
  external_item_id?: string | null;
  is_saved_to_closet?: boolean | null;
  name?: string;
  type?: string;
  main_category?: string;
  image_url?: string;
  image_path?: string;
  cutout_url?: string | null;
  cutout_image_url?: string | null;
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
  savedOutfitId?: string | null;
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
const TRY_ON_MAX_POLL_ATTEMPTS = 60;
const MAX_TRY_ON_GARMENTS = 8;
const TRY_ON_ITEM_ORDER = ['outerwear', 'top_layer', 'base_top', 'onepiece', 'bottom', 'shoes', 'accessory'];

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

function formatTryOnErrorMessage(message?: string | null) {
  const normalized = String(message || '').trim();
  if (!normalized) {
    return 'Try-on generation failed. Please try again.';
  }

  const lowered = normalized.toLowerCase();
  if (lowered.includes('not configured')) {
    return 'Try-on is not configured on the backend right now.';
  }
  if (lowered.includes('timed out')) {
    return 'Try-on generation timed out. Please try again.';
  }
  if (lowered.includes('temporarily unavailable')) {
    return 'Try-on generation is temporarily unavailable. Please try again later.';
  }
  if (lowered.includes('rate-limited') || lowered.includes('rate limited') || lowered.includes('rate limit')) {
    return 'Try-on image generation is temporarily rate-limited. Please wait a moment and try again.';
  }
  return normalized;
}

function getImageExtensionFromUrl(url?: string | null) {
  const normalized = String(url || '').split('?')[0].trim().toLowerCase();
  const match = normalized.match(/\.(png|jpe?g|webp|heic)$/);
  return match ? `.${match[1]}`.replace('.jpeg', '.jpg') : '.jpg';
}

function hasMissingTryOnColumn(error: any, field: string) {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  const target = String(field || '').trim().toLowerCase();
  return (
    normalized.includes(`tryon_jobs.${target}`) ||
    normalized.includes(`'${target}' column of 'tryon_jobs'`) ||
    (normalized.includes("column of 'tryon_jobs'") && normalized.includes(target)) ||
    (normalized.includes('does not exist') && normalized.includes(target))
  );
}

function normalizeIdentity(value: unknown) {
  return String(value || '').trim();
}

function buildExternalTryOnIdentity(item: any) {
  const identity =
    normalizeIdentity(item?.external_item_id) ||
    normalizeIdentity(item?.id) ||
    normalizeIdentity(item?.image_path) ||
    normalizeIdentity(item?.image_url);

  if (!identity) return null;
  return `${normalizeIdentity(item?.source_subtype) || normalizeIdentity(item?.source_type) || 'external'}:${identity}`;
}

function arraysMatch(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => entry === b[index]);
}

function extractRequestPayloadSignatures(payload: any) {
  const clothingItemIds = Array.isArray(payload?.clothing_item_ids)
    ? payload.clothing_item_ids.map((entry: any) => normalizeIdentity(entry)).filter(Boolean).sort()
    : [];
  const externalItemKeys = Array.isArray(payload?.external_items)
    ? payload.external_items.map((entry: any) => buildExternalTryOnIdentity(entry)).filter(Boolean).sort()
    : [];

  return {
    clothingItemIds,
    externalItemKeys,
  };
}

function isRecentTryOnJob(createdAt: string | null | undefined, maxAgeMs: number) {
  const timestamp = new Date(String(createdAt || '')).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= maxAgeMs;
}

function resolveTryOnItemRole(item: WardrobeItem | null | undefined) {
  const candidates = [
    item?.outfit_role,
    item?.layering_role,
    item?.main_category,
    item?.category,
    item?.type,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'outerwear' || candidate === 'outer') return 'outerwear';
    if (candidate === 'layer' || candidate === 'top_layer' || candidate === 'mid') return 'top_layer';
    if (candidate === 'top' || candidate === 'base_top' || candidate === 'base') return 'base_top';
    if (candidate === 'onepiece' || candidate === 'dress' || candidate === 'jumpsuit' || candidate === 'romper') return 'onepiece';
    if (candidate === 'bottom' || candidate === 'pants' || candidate === 'jeans' || candidate === 'shorts' || candidate === 'skirt') return 'bottom';
    if (candidate === 'shoes' || candidate === 'shoe' || candidate === 'sneakers' || candidate === 'boots') return 'shoes';
    if (candidate === 'accessory' || candidate === 'accessories') return 'accessory';
  }

  return 'base_top';
}

function sortTryOnItems(items: WardrobeItem[]) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const aRole = resolveTryOnItemRole(a);
    const bRole = resolveTryOnItemRole(b);
    const aIndex = TRY_ON_ITEM_ORDER.indexOf(aRole);
    const bIndex = TRY_ON_ITEM_ORDER.indexOf(bRole);

    if (aIndex !== bIndex) {
      return (aIndex === -1 ? TRY_ON_ITEM_ORDER.length : aIndex) - (bIndex === -1 ? TRY_ON_ITEM_ORDER.length : bIndex);
    }

    return 0;
  });
}

export default function TryOnScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute() as unknown as { params?: RouteParams };
  const mode = (params as any)?.mode;
  const lockedItem = (params as any)?.lockedItem;
  const savedOutfitId = String((params as any)?.savedOutfitId || '').trim() || null;
  const routeSeedItems = useMemo(() => ((params?.items || params?.outfit || []) as WardrobeItem[]), [params?.items, params?.outfit]);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [baseModelUrl, setBaseModelUrl] = useState<string | undefined>(params?.baseModelUrl);
  const [selectedItems, setSelectedItems] = useState<WardrobeItem[]>([]);
  const [mockGeneratedUrl, setMockGeneratedUrl] = useState<string | null>(null);
  const [tryOnJobId, setTryOnJobId] = useState<string | null>(null);
  const [tryOnJobStatus, setTryOnJobStatus] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [hasSeededQuick, setHasSeededQuick] = useState(false);
  const [hasSavedTryOnResult, setHasSavedTryOnResult] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);
  const [tryOnsRemaining, setTryOnsRemaining] = useState<number | 'unlimited' | null>(null);
  const mountedRef = useRef(true);
  const generateSequenceRef = useRef(0);
  const successfulTryOnUsageRequestsRef = useRef<Set<number>>(new Set());
  const orderedSelectedItems = useMemo(() => sortTryOnItems(selectedItems), [selectedItems]);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();
  const sourceItemsForLookup = selectedItems.length ? selectedItems : routeSeedItems;
  const tryOnSourceKeys = useMemo(
    () =>
      buildTryOnSourceKeys({
        savedOutfitId,
        items: sourceItemsForLookup,
        lockedItem,
        mode,
      }),
    [lockedItem, mode, savedOutfitId, sourceItemsForLookup],
  );
  const tryOnSourceKeyDigest = tryOnSourceKeys.join('||');
  // Seed selection
  useEffect(() => {
    const seed = routeSeedItems;
    if (seed?.length) setSelectedItems(seed);
  }, [routeSeedItems]);

  const applyRestoredTryOnResult = async ({
    jobId,
    imagePath,
    imageUrl,
  }: {
    jobId?: string | null;
    imagePath?: string | null;
    imageUrl?: string | null;
  }) => {
    const resolvedTryOnUrl = await resolvePrivateMediaUrl({
      path: imagePath,
      legacyUrl: imageUrl,
    });

    if (!resolvedTryOnUrl || !mountedRef.current) return false;

    setMockGeneratedUrl(resolvedTryOnUrl);
    setTryOnJobId(String(jobId || '').trim() || null);
    setTryOnJobStatus('completed');
    setHasSavedTryOnResult(true);
    return true;
  };

  const persistCompletedTryOnResult = async ({
    sourceKeys,
    jobId,
    imagePath,
    imageUrl,
  }: {
    sourceKeys: string[];
    jobId?: string | null;
    imagePath?: string | null;
    imageUrl?: string | null;
  }) => {
    if (!userId || !sourceKeys.length || (!imagePath && !imageUrl)) return;
    await writeCachedTryOnResult({
      userId,
      sourceKeys,
      jobId,
      imagePath,
      imageUrl,
    });
  };

  const loadRecoverableTryOnJob = async ({
    uid,
    clothingItemIds,
    externalItems,
  }: {
    uid: string;
    clothingItemIds: string[];
    externalItems: any[];
  }) => {
    const externalItemKeys = externalItems.map((item) => buildExternalTryOnIdentity(item)).filter(Boolean).sort() as string[];

    if (savedOutfitId) {
      let response: any = await supabase
        .from('tryon_jobs')
        .select('id, status, image_path, image_url, created_at')
        .eq('user_id', uid)
        .eq('saved_outfit_id', savedOutfitId)
        .in('status', ['queued', 'processing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (response.error && hasMissingTryOnColumn(response.error, 'saved_outfit_id')) {
        response = { data: null, error: null };
      } else if (response.error && hasMissingTryOnColumn(response.error, 'image_url')) {
        response = await supabase
          .from('tryon_jobs')
          .select('id, status, image_path, created_at')
          .eq('user_id', uid)
          .eq('saved_outfit_id', savedOutfitId)
          .in('status', ['queued', 'processing', 'completed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      if (response.error) throw response.error;
      if (response.data) return response.data;
    }

    let response: any = await supabase
      .from('tryon_jobs')
      .select('id, status, image_path, image_url, created_at, request_payload')
      .eq('user_id', uid)
      .in('status', ['queued', 'processing', 'completed'])
      .order('created_at', { ascending: false })
      .limit(8);

    if (response.error && hasMissingTryOnColumn(response.error, 'request_payload')) {
      response = await supabase
        .from('tryon_jobs')
        .select('id, status, image_path, image_url, created_at')
        .eq('user_id', uid)
        .in('status', ['queued', 'processing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(8);
    }

    if (response.error && hasMissingTryOnColumn(response.error, 'image_url')) {
      response = await supabase
        .from('tryon_jobs')
        .select('id, status, image_path, created_at')
        .eq('user_id', uid)
        .in('status', ['queued', 'processing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(8);
    }

    if (response.error) throw response.error;

    const rows = Array.isArray(response.data) ? response.data : [];
    const matchingRequestPayloadJob = rows.find((row: any) => {
      if (!isRecentTryOnJob(row?.created_at, 5 * 60 * 1000)) return false;
      if (!row?.request_payload) return false;

      const rowSignature = extractRequestPayloadSignatures(row.request_payload);
      return (
        arraysMatch(rowSignature.clothingItemIds, [...clothingItemIds].sort()) &&
        arraysMatch(rowSignature.externalItemKeys, externalItemKeys)
      );
    });

    if (matchingRequestPayloadJob) {
      return matchingRequestPayloadJob;
    }

    const veryRecentRows = rows.filter((row: any) => isRecentTryOnJob(row?.created_at, 90_000));
    return veryRecentRows.length === 1 ? veryRecentRows[0] : null;
  };

  const recoverRateLimitedTryOn = async ({
    uid,
    requestId,
    sourceKeys,
    clothingItemIds,
    externalItems,
    retryAfterMs,
  }: {
    uid: string;
    requestId: number;
    sourceKeys: string[];
    clothingItemIds: string[];
    externalItems: any[];
    retryAfterMs?: number | null;
  }) => {
    setTryOnJobStatus('queued');
    await delay(Math.max(1000, Number(retryAfterMs) || TRY_ON_POLL_FALLBACK_MS));

    if (!mountedRef.current || requestId !== generateSequenceRef.current) {
      return false;
    }

    const recoveredJob = await loadRecoverableTryOnJob({
      uid,
      clothingItemIds,
      externalItems,
    });

    if (!recoveredJob) return false;

    const recoveredStatus = String(recoveredJob?.status || '').trim().toLowerCase();
    if (recoveredStatus === 'completed') {
      const restored = await applyRestoredTryOnResult({
        jobId: recoveredJob?.id || null,
        imagePath: recoveredJob?.image_path || null,
        imageUrl: recoveredJob?.image_url || null,
      });

      if (restored) {
        await persistCompletedTryOnResult({
          sourceKeys,
          jobId: recoveredJob?.id || null,
          imagePath: recoveredJob?.image_path || null,
          imageUrl: recoveredJob?.image_url || null,
        });
      }
      return restored;
    }

    if (recoveredJob?.id && ['queued', 'processing'].includes(recoveredStatus)) {
      setTryOnJobId(recoveredJob.id);
      setTryOnJobStatus(recoveredStatus);
      await pollTryOnJob(recoveredJob.id, requestId, sourceKeys, retryAfterMs);
      return true;
    }

    return false;
  };

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
        void refreshTryOnRemaining(uid);

        const baseModelTask = params?.baseModelUrl
          ? Promise.resolve({ url: params.baseModelUrl, source: 'route' })
          : (async () => {
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

              return {
                url: resolvedModelUrl,
                source: resolvedModelSource,
              };
            })();

        const [baseModelResult] = await Promise.all([baseModelTask]);

        if (!mounted) return;

        if (baseModelResult?.url) {
          if (baseModelResult.source === 'legacy-storage-url') {
            console.warn("⚠️ Using legacy model URL fallback from profile; ai_model_path is missing or stale.");
          }
          setBaseModelUrl(baseModelResult.url);
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
  }, [navigation, params?.baseModelUrl]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadLatestSavedOutfitTryOn = async (uid: string) => {
      if (!savedOutfitId) return null;

      let response: any = await supabase
        .from('tryon_jobs')
        .select('id, status, image_path, image_url, created_at')
        .eq('user_id', uid)
        .eq('saved_outfit_id', savedOutfitId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (response.error && hasMissingTryOnColumn(response.error, 'saved_outfit_id')) {
        return null;
      }

      if (response.error && hasMissingTryOnColumn(response.error, 'image_url')) {
        response = await supabase
          .from('tryon_jobs')
          .select('id, status, image_path, created_at')
          .eq('user_id', uid)
          .eq('saved_outfit_id', savedOutfitId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      if (response.error) {
        throw response.error;
      }

      return response.data || null;
    };

    const restoreTryOnResult = async () => {
      try {
        const savedOutfitJob = await loadLatestSavedOutfitTryOn(userId);
        if (cancelled) return;

        if (savedOutfitJob) {
          const restored = await applyRestoredTryOnResult({
            jobId: savedOutfitJob?.id || null,
            imagePath: savedOutfitJob?.image_path || null,
            imageUrl: savedOutfitJob?.image_url || null,
          });

          if (restored) {
            await persistCompletedTryOnResult({
              sourceKeys: tryOnSourceKeys,
              jobId: savedOutfitJob?.id || null,
              imagePath: savedOutfitJob?.image_path || null,
              imageUrl: savedOutfitJob?.image_url || null,
            });
          }
          return;
        }

        for (const sourceKey of tryOnSourceKeys) {
          const cached = await readCachedTryOnResult({
            userId,
            sourceKey,
          });

          if (!cached || cancelled) continue;

          const restored = await applyRestoredTryOnResult({
            jobId: cached.jobId,
            imagePath: cached.imagePath,
            imageUrl: cached.imageUrl,
          });

          if (restored) return;
        }
      } catch (error) {
        console.error('Restore try-on result failed:', error);
      }
    };

    void restoreTryOnResult();

    return () => {
      cancelled = true;
    };
  }, [savedOutfitId, tryOnSourceKeyDigest, tryOnSourceKeys, userId]);
  // Quick "Try On" flow – when coming from ImportBrowserScreen with lockedItem
useEffect(() => {
  if (mode !== 'quick' || !lockedItem) return;
  if (!userId) return;
  if (hasSeededQuick) return; // ✅ don't run twice

  let cancelled = false;

  const runQuick = async () => {
    try {
      setQuickLoading(true);

      let resolvedResponse = await apiPost('/style-single-item', {
        context: 'basic everyday outfit for quick try-on',
        vibe: 'casual',
        season: (lockedItem as any).season || 'all',
        temperature: 70,
        locked_item: toStyleRequestWardrobeItem(lockedItem as any),
      });

      let data: any = await readApiResponse(resolvedResponse);
      if (isRateLimitedResponse(resolvedResponse, data)) {
        await delay(getRetryAfterMs(resolvedResponse, 1500));
        resolvedResponse = await apiPost('/style-single-item', {
          context: 'basic everyday outfit for quick try-on',
          vibe: 'casual',
          season: (lockedItem as any).season || 'all',
          temperature: 70,
          locked_item: toStyleRequestWardrobeItem(lockedItem as any),
        });
        data = await readApiResponse(resolvedResponse);
      }

      if (!resolvedResponse.ok || !data?.outfit) {
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

  const refreshTryOnRemaining = async (uid: string) => {
    try {
      const access = await canUseFeature(uid, 'ai_tryon');
      if (!mountedRef.current) return;
      setTryOnsRemaining(typeof access.remaining === 'undefined' ? null : access.remaining);
    } catch (error: any) {
      console.warn('Try-on balance refresh failed:', error?.message || error);
      if (!mountedRef.current) return;
      setTryOnsRemaining(null);
    }
  };

  const recordSuccessfulTryOnUsage = async (requestId: number) => {
    if (!userId || successfulTryOnUsageRequestsRef.current.has(requestId)) {
      return;
    }

    try {
      await incrementUsage(userId, 'ai_tryon');
      successfulTryOnUsageRequestsRef.current.add(requestId);
      void refreshTryOnRemaining(userId);
    } catch (error: any) {
      console.warn('AI try-on usage increment failed:', error?.message || error);
    }
  };

  const pollTryOnJob = async (
    jobId: string,
    requestId: number,
    sourceKeys: string[],
    initialDelayMs?: number | null,
  ) => {
    let nextDelayMs = Math.max(1000, Number(initialDelayMs) || TRY_ON_POLL_FALLBACK_MS);

    for (let attempt = 0; attempt < TRY_ON_MAX_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await delay(nextDelayMs);
      }

      if (!mountedRef.current || requestId !== generateSequenceRef.current) {
        return;
      }

      const statusResponse = await apiPost('/tryon/status', { job_id: jobId });
      const statusPayload: any = await readApiResponse(statusResponse);

      if (isRateLimitedResponse(statusResponse, statusPayload)) {
        if (statusPayload?.tryon_url || statusPayload?.image_path || statusPayload?.image_url) {
          const resolvedTryOnUrl =
            statusPayload?.tryon_url ||
            (await resolvePrivateMediaUrl({
              path: statusPayload?.image_path,
              legacyUrl: statusPayload?.image_url,
            }));

          if (resolvedTryOnUrl) {
            setMockGeneratedUrl(resolvedTryOnUrl);
            setTryOnJobId(statusPayload?.job_id || jobId);
            setTryOnJobStatus('completed');
            setHasSavedTryOnResult(true);
            await recordSuccessfulTryOnUsage(requestId);
            await persistCompletedTryOnResult({
              sourceKeys,
              jobId: statusPayload?.job_id || jobId,
              imagePath: statusPayload?.image_path || null,
              imageUrl: statusPayload?.image_url || null,
            });
            return;
          }
        }

        nextDelayMs = Math.max(
          1000,
          Number(statusPayload?.poll_after_ms) || getRetryAfterMs(statusResponse, nextDelayMs),
        );
        continue;
      }

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
        setTryOnJobId(statusPayload?.job_id || jobId);
        setHasSavedTryOnResult(true);
        await recordSuccessfulTryOnUsage(requestId);
        await persistCompletedTryOnResult({
          sourceKeys,
          jobId: statusPayload?.job_id || jobId,
          imagePath: statusPayload?.image_path || null,
          imageUrl: statusPayload?.image_url || null,
        });
        return;
      }

      if (nextStatus === 'failed') {
        throw new Error(formatTryOnErrorMessage(statusPayload?.error || 'Try-on generation failed.'));
      }

      nextDelayMs = Math.max(1000, Number(statusPayload?.poll_after_ms) || TRY_ON_POLL_FALLBACK_MS);
    }

    throw new Error('Try-on is taking longer than expected. Please try again in a moment.');
  };

  const generateTryOnWithItems = async (items: WardrobeItem[]) => {
    const requestId = generateSequenceRef.current + 1;
    generateSequenceRef.current = requestId;
    const uniqueItems = Array.from(
      new Map(
        items
          .filter(
            (item) =>
              isRealWardrobeItem(item) ||
              item?.image_path ||
              item?.cutout_url ||
              item?.cutout_image_url ||
              item?.image_url,
          )
          .map((item) => [item.image_path || item.cutout_url || item.cutout_image_url || item.image_url || item.id, item])
      ).values()
    );

    if (!uniqueItems.length) {
      Alert.alert("Select items", "Pick at least one item to try on.");
      return;
    }
    if (uniqueItems.length > MAX_TRY_ON_GARMENTS) {
      Alert.alert('Too many items', `Pick up to ${MAX_TRY_ON_GARMENTS} clothing items per try-on.`);
      return;
    }

    const tryOnAccess = await canUseFeature(userId, 'ai_tryon');
    if (!tryOnAccess.allowed) {
      setUpgradeModal(buildUpgradeModalState('ai_tryon', tryOnAccess));
      return;
    }

    setLoading(true);
    setMockGeneratedUrl(null);
    setTryOnJobId(null);
    setTryOnJobStatus(null);
    setHasSavedTryOnResult(false);

    try {
      const clothingItemIds = uniqueItems
        .filter((item) => isRealWardrobeItem(item))
        .map((item) => item.id);
      const externalItems = uniqueItems
        .filter((item) => !isRealWardrobeItem(item))
        .map(buildExternalTryOnItem);
      const sourceKeys = buildTryOnSourceKeys({
        savedOutfitId,
        items: uniqueItems,
        lockedItem,
        mode,
      });
      const response = await apiPost('/tryon/generate', {
        async: true,
        clothing_item_ids: clothingItemIds,
        ...(savedOutfitId ? { saved_outfit_id: savedOutfitId } : {}),
        ...(externalItems.length ? { external_items: externalItems } : {}),
      });

      const data: any = await readApiResponse(response);

      if (isRateLimitedResponse(response, data)) {
        if (data?.job_id) {
          setTryOnJobId(data.job_id);
          setTryOnJobStatus(String(data.status || 'queued').toLowerCase());
          await pollTryOnJob(
            data.job_id,
            requestId,
            sourceKeys,
            Number(data?.poll_after_ms) || getRetryAfterMs(response, TRY_ON_POLL_FALLBACK_MS),
          );
          return;
        }

        if (data?.tryon_url || data?.image_path || data?.image_url) {
          const resolvedTryOnUrl =
            data.tryon_url ||
            (await resolvePrivateMediaUrl({
              path: data.image_path,
              legacyUrl: data.image_url,
            }));

          setMockGeneratedUrl(resolvedTryOnUrl || null);
          setTryOnJobId(data?.job_id || null);
          setTryOnJobStatus('completed');
          setHasSavedTryOnResult(true);
          await recordSuccessfulTryOnUsage(requestId);
          await persistCompletedTryOnResult({
            sourceKeys,
            jobId: data?.job_id || null,
            imagePath: data?.image_path || null,
            imageUrl: data?.image_url || null,
          });
          return;
        }

        const recovered = await recoverRateLimitedTryOn({
          uid: userId,
          requestId,
          sourceKeys,
          clothingItemIds,
          externalItems,
          retryAfterMs: getRetryAfterMs(response, TRY_ON_POLL_FALLBACK_MS),
        });

        if (recovered) {
          return;
        }
      }

      if (!response.ok) {
        throw new Error(formatTryOnErrorMessage(data.error || "Failed to generate try-on image."));
      }

      if (data?.job_id) {
        setTryOnJobId(data.job_id);
        setTryOnJobStatus(String(data.status || 'queued').toLowerCase());
        await pollTryOnJob(data.job_id, requestId, sourceKeys, data.poll_after_ms);
        return;
      }

      const resolvedTryOnUrl =
        data.tryon_url ||
        (await resolvePrivateMediaUrl({
          path: data.image_path,
          legacyUrl: data.image_url,
        }));

      setMockGeneratedUrl(resolvedTryOnUrl);
      setTryOnJobId(data?.job_id || null);
      setTryOnJobStatus(data?.status ? String(data.status).toLowerCase() : 'completed');
      setHasSavedTryOnResult(true);
      await recordSuccessfulTryOnUsage(requestId);
      await persistCompletedTryOnResult({
        sourceKeys,
        jobId: data?.job_id || null,
        imagePath: data?.image_path || null,
        imageUrl: data?.image_url || null,
      });
    } catch (err: any) {
      if (requestId === generateSequenceRef.current && mountedRef.current) {
        setTryOnJobStatus('failed');
        setTryOnJobId(null);
      }
      Alert.alert("Error", formatTryOnErrorMessage(err.message || "Unknown error"));
    } finally {
      if (requestId === generateSequenceRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleGenerateTryOn = async () => {
    await generateTryOnWithItems(orderedSelectedItems);
  };

  const loadWardrobeItemsByIds = async (ids: string[]) => {
    if (!ids.length || !userId) return [];

    const { data, error } = await supabase
      .from('wardrobe')
      .select('id, name, type, main_category, image_url, image_path, cutout_image_url, primary_color')
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
  image_url: item.cutout_url || item.cutout_image_url || item.image_url || null,
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
      <TryOnHeader
        onBack={() => navigation.goBack()}
        tryOnsRemaining={tryOnsRemaining}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 124 + Math.max(insets.bottom, 10) },
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
          items={orderedSelectedItems}
          onRemove={handleRemoveItem}
        />
      </ScrollView>

      <TryOnActionBar
        onGenerate={handleGenerateTryOn}
        onSave={handleSaveMock}
        generateLabel={hasSavedTryOnResult ? 'Regenerate Try-On' : 'Generate Try-On'}
        generateDisabled={!baseModelUrl || isBusy}
        saveDisabled={!mockGeneratedUrl || isBusy}
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: 8,
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
