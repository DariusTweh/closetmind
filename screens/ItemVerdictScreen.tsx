import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ItemVerdictResponse,
  ItemVerdictRouteParams,
  OutfitProof,
  normalizeVerdictItemSeason,
  VerdictItem,
  VerdictTone,
} from '../lib/itemVerdict';
import { apiPost, readApiResponse } from '../lib/api';
import {
  insertWardrobeItemWithCompatibility,
  prepareWardrobeItemDerivatives,
} from '../lib/wardrobeStorage';
import UpgradeLimitModal from '../components/subscriptions/UpgradeLimitModal';
import { useUpgradeWall } from '../hooks/useUpgradeWall';
import { fetchStyleContextSignals } from '../lib/styleProfile';
import { isSubscriptionLimitError } from '../lib/subscriptions/errors';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../lib/subscriptions/modalState';
import { canUseFeature } from '../lib/subscriptions/usageService';
import { supabase } from '../lib/supabase';
import { spacing } from '../lib/theme';
import { editorialPalette, editorialShadow } from '../lib/editorialTheme';
import {
  buildVerdictCacheItemKey,
  bumpClosetRevision,
  pruneExpiredVerdictCache,
  readCachedVerdict,
  readClosetRevision,
  writeCachedVerdict,
} from '../lib/itemVerdictCache';
import {
  buildWardrobeInsertPayload,
  buildWardrobeInsertPayloadFromExternalItem,
  isExternalItemLike,
} from '../lib/wardrobePayload';
import VerdictActionsBar from '../components/verdict/VerdictActionsBar';
import VerdictHeroCard from '../components/verdict/VerdictHeroCard';
import VerdictInsightCard from '../components/verdict/VerdictInsightCard';
import VerdictOutfitProof from '../components/verdict/VerdictOutfitProof';
import VerdictReasonList from '../components/verdict/VerdictReasonList';
import VerdictScoreRow from '../components/verdict/VerdictScoreRow';

const PROOF_SELECT_FIELDS =
  'id, name, type, main_category, image_url, image_path, cutout_image_url, primary_color, secondary_colors, pattern_description, vibe_tags, season, source_url, brand';
const PROOF_LEGACY_SELECT_FIELDS =
  'id, name, type, main_category, image_url, primary_color, secondary_colors, pattern_description, vibe_tags, season, source_url, brand';

function formatVerdictLabel(label?: string | null) {
  return String(label || 'Verdict').trim() || 'Verdict';
}

function getVerdictPalette(tone?: VerdictTone | string | null) {
  switch (tone) {
    case 'clear_yes':
      return {
        background: editorialPalette.surfaceContainer,
        border: editorialPalette.outline,
        eyebrow: editorialPalette.onSurface,
      };
    case 'clear_no':
    case 'overlap_warning':
      return {
        background: editorialPalette.surfaceContainer,
        border: editorialPalette.outline,
        eyebrow: editorialPalette.error,
      };
    default:
      return {
        background: editorialPalette.surfaceContainer,
        border: editorialPalette.outline,
        eyebrow: editorialPalette.onSurfaceVariant,
      };
  }
}

function hasMissingColumn(message: string, columnName: string) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('does not exist') && normalized.includes(String(columnName || '').toLowerCase());
}

function firstSeason(value?: VerdictItem['season']) {
  return normalizeVerdictItemSeason(value)[0] || 'all';
}

function safeHostname(url?: string | null) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

function formatConfidence(confidence?: string | null) {
  const normalized = String(confidence || '').trim().toLowerCase();
  if (!normalized) return null;
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} confidence`;
}

function getGapInsightTone(type?: string) {
  if (type === 'gap_fill') return 'positive' as const;
  if (type === 'duplicate_risk') return 'warning' as const;
  return 'neutral' as const;
}

function normalizeVerdictItemForActions(item: VerdictItem): VerdictItem {
  return {
    ...item,
    main_category: item.main_category || item.category || item.type || null,
    season: normalizeVerdictItemSeason(item.season).length ? normalizeVerdictItemSeason(item.season) : ['all'],
  };
}

function mergeVerdictItem(base?: VerdictItem | null, incoming?: VerdictItem | null): VerdictItem | null {
  if (!base && !incoming) return null;
  if (!base) return incoming || null;
  if (!incoming) return base;

  return {
    ...base,
    ...incoming,
    cutout_url: incoming.cutout_url || base.cutout_url || null,
    cutout_image_url: incoming.cutout_image_url || base.cutout_image_url || null,
    image_path: incoming.image_path || base.image_path || null,
    image_url: incoming.image_url || base.image_url || null,
    source_url: incoming.source_url || base.source_url || null,
    product_url: incoming.product_url || base.product_url || incoming.source_url || base.source_url || null,
    source_domain: incoming.source_domain || base.source_domain || null,
    source_image_url: incoming.source_image_url || base.source_image_url || base.image_url || null,
    original_image_url:
      incoming.original_image_url || base.original_image_url || incoming.source_image_url || base.source_image_url || base.image_url || null,
    source_type: incoming.source_type || base.source_type || null,
    source_id: incoming.source_id || base.source_id || null,
    external_product_id: incoming.external_product_id || base.external_product_id || null,
    source_title: incoming.source_title || base.source_title || null,
    brand: incoming.brand || base.brand || null,
    retailer: incoming.retailer || base.retailer || null,
    retailer_name: incoming.retailer_name || base.retailer_name || base.meta?.retailer_name || null,
    price: incoming.price ?? base.price ?? incoming.retail_price ?? base.retail_price ?? base.meta?.price ?? null,
    retail_price: incoming.retail_price ?? base.retail_price ?? base.meta?.price ?? null,
    currency: incoming.currency ?? base.currency ?? base.meta?.currency ?? null,
    secondary_colors: incoming.secondary_colors?.length ? incoming.secondary_colors : base.secondary_colors || [],
    vibe_tags: incoming.vibe_tags?.length ? incoming.vibe_tags : base.vibe_tags || [],
    occasion_tags: incoming.occasion_tags?.length ? incoming.occasion_tags : base.occasion_tags || [],
    weather_use: incoming.weather_use?.length ? incoming.weather_use : base.weather_use || [],
    season: normalizeVerdictItemSeason(incoming.season).length ? incoming.season : base.season,
    meta: {
      ...(base.meta || {}),
      ...(incoming.meta || {}),
    },
  };
}

function buildSavePayload(item: VerdictItem, userId: string, source?: string) {
  if (isExternalItemLike(item)) {
    return buildWardrobeInsertPayloadFromExternalItem(item as any, userId, {
      wardrobeStatus: 'owned',
      importMethod: item?.source_subtype === 'temp_scan' ? 'screenshot' : 'pick',
      sourceTitleFallback: item?.source_title || item?.name,
    });
  }
  const sourceUrl = item.source_url || item.meta?.source_url || null;
  return buildWardrobeInsertPayload({
    userId,
    uploadedImage: {
      imagePath: item.image_path || null,
      imageUrl: item.image_url || null,
    },
    normalizedTags: {
      ...item,
      season: firstSeason(item.season),
      price: item.price ?? item.retail_price ?? item.meta?.price ?? item.meta?.retail_price ?? null,
      retail_price: item.retail_price ?? item.price ?? item.meta?.retail_price ?? item.meta?.price ?? null,
      retailer: item.retailer || item.retailer_name || item.meta?.retailer || item.meta?.retailer_name || null,
      retailer_name: item.retailer_name || item.retailer || item.meta?.retailer_name || item.meta?.retailer || null,
      product_url: item.product_url || sourceUrl,
      original_image_url: item.original_image_url || item.source_image_url || item.image_url || null,
      source_title: item.source_title || item.meta?.source_title || null,
    } as any,
    importMeta: {
      source_url: sourceUrl,
      product_url: item.product_url || sourceUrl,
      source_domain: item.source_domain || safeHostname(sourceUrl),
      brand: item.brand || item.meta?.brand || null,
      retailer: item.retailer || item.retailer_name || item.meta?.retailer || item.meta?.retailer_name || null,
      retailer_name: item.retailer_name || item.retailer || item.meta?.retailer_name || item.meta?.retailer || null,
      price: item.price ?? item.retail_price ?? item.meta?.price ?? item.meta?.retail_price ?? null,
      retail_price: item.retail_price ?? item.price ?? item.meta?.retail_price ?? item.meta?.price ?? null,
      currency: item.currency ?? item.meta?.currency ?? null,
      source_image_url: item.source_image_url || item.image_url || null,
      original_image_url: item.original_image_url || item.source_image_url || item.image_url || null,
      source_type: source === 'browser' ? 'browser_import' : 'manual_upload',
      source_id: item.source_id || item.meta?.source_id || null,
      external_product_id: item.external_product_id || item.meta?.external_product_id || null,
      source_title: item.source_title || item.meta?.source_title || null,
    },
    wardrobeStatus: 'owned',
    importMethod: source === 'browser' ? 'pick' : 'manual',
    sourceType: source === 'browser' ? 'browser_import' : 'manual_upload',
    sourceTitleFallback: item.source_title || item.meta?.source_title || item.name,
  });
}

function isScannedCandidate(item?: VerdictItem | null) {
  return String(item?.wardrobe_status || '').trim().toLowerCase() === 'scanned_candidate';
}

function isPersistedWardrobeItemId(value?: string | null) {
  const normalized = String(value || '').trim();
  return Boolean(normalized) && !normalized.startsWith('ext_');
}

export default function ItemVerdictScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params || {}) as ItemVerdictRouteParams;
  const routeItem = params.item || null;
  const routeItemId = String(params.itemId || '').trim() || null;

  const [verdict, setVerdict] = useState<ItemVerdictResponse | null>(null);
  const [currentItem, setCurrentItem] = useState<VerdictItem | null>(routeItem);
  const [proofItemsById, setProofItemsById] = useState<Record<string, VerdictItem>>({});
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();

  const hydratedItem = useMemo(
    () => normalizeVerdictItemForActions(currentItem || verdict?.item || { name: 'Imported Item' }),
    [currentItem, verdict?.item]
  );

  const fetchUserId = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('You must be logged in.');
    }
    return user.id;
  }, []);

  const fetchProofItems = useCallback(
    async (userId: string, response: ItemVerdictResponse) => {
      const proofIds = Array.from(
        new Set(response.outfit_proofs.flatMap((proof) => proof.item_ids).filter(Boolean))
      );
      const currentId = String(response.item?.id || '').trim();
      const proofItemMap: Record<string, VerdictItem> = currentId ? { [currentId]: response.item } : {};
      const wardrobeIds = proofIds.filter((id) => id !== currentId);

      if (!wardrobeIds.length) {
        return proofItemMap;
      }

      let responseItems: any = await supabase
        .from('wardrobe')
        .select(PROOF_SELECT_FIELDS)
        .eq('user_id', userId)
        .in('id', wardrobeIds);

      if (
        responseItems.error &&
        (hasMissingColumn(responseItems.error.message, 'image_path') ||
          hasMissingColumn(responseItems.error.message, 'cutout_image_url'))
      ) {
        responseItems = await supabase
          .from('wardrobe')
          .select(PROOF_LEGACY_SELECT_FIELDS)
          .eq('user_id', userId)
          .in('id', wardrobeIds);
      }

      if (responseItems.error) {
        throw responseItems.error;
      }

      for (const item of responseItems.data || []) {
        proofItemMap[item.id] = item;
      }

      return proofItemMap;
    },
    []
  );

  const loadVerdict = useCallback(
    async ({
      itemIdOverride,
      itemOverride,
      isRefresh = false,
      bypassCache = false,
    }: {
      itemIdOverride?: string | null;
      itemOverride?: VerdictItem | null;
      isRefresh?: boolean;
      bypassCache?: boolean;
    } = {}) => {
      const requestId = ++requestIdRef.current;
      const explicitItemId = String(itemIdOverride || routeItemId || '').trim();
      const itemPayload = itemOverride || routeItem || null;
      const shouldUseWardrobeId = isPersistedWardrobeItemId(explicitItemId) && !isExternalItemLike(itemPayload);

      if (!shouldUseWardrobeId && !itemPayload) {
        setErrorMessage('No item was provided for verdict analysis.');
        setVerdict(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMessage(null);

      try {
        const userId = await fetchUserId();
        const closetRevisionState = await readClosetRevision(userId);
        const cacheItemKey = buildVerdictCacheItemKey({
          itemId: shouldUseWardrobeId ? explicitItemId : null,
          item: itemPayload,
        });

        await pruneExpiredVerdictCache({ userId }).catch(() => {});

        if (!bypassCache && cacheItemKey) {
          const cachedEntry = await readCachedVerdict({
            userId,
            itemKey: cacheItemKey,
            closetRevision: closetRevisionState.revision,
          });

          if (cachedEntry && mountedRef.current && requestId === requestIdRef.current) {
            setVerdict(cachedEntry.verdict);
            setCurrentItem(cachedEntry.item || cachedEntry.verdict.item || itemPayload || routeItem || null);
            setProofItemsById(cachedEntry.proofItemsById || {});
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }

        const styleContext = await fetchStyleContextSignals(userId).catch(() => null);
        const response = await apiPost(
          '/item-verdict',
          shouldUseWardrobeId
            ? {
                item_id: explicitItemId,
                include_outfit_proofs: true,
                ...(styleContext ? { style_profile: styleContext } : {}),
              }
            : {
                item: itemPayload,
                include_outfit_proofs: true,
                ...(styleContext ? { style_profile: styleContext } : {}),
              }
        );
        const payload = (await readApiResponse<ItemVerdictResponse>(response)) as
          | ItemVerdictResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || 'error' in payload) {
          throw new Error((payload as any)?.error || 'Failed to analyze this item.');
        }
        const verdictPayload = payload as ItemVerdictResponse;
        const mergedItem = mergeVerdictItem(itemPayload || routeItem || null, verdictPayload.item);
        const mergedVerdictPayload = {
          ...verdictPayload,
          item: mergedItem || verdictPayload.item,
        };
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        const proofItemMap = await fetchProofItems(userId, mergedVerdictPayload);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        setVerdict(mergedVerdictPayload);
        setCurrentItem(mergedVerdictPayload.item);
        setProofItemsById(proofItemMap);

        const nextCacheItemKey = cacheItemKey || buildVerdictCacheItemKey({
          itemId: mergedVerdictPayload.item?.id,
          item: mergedVerdictPayload.item,
        });

        if (nextCacheItemKey) {
          await writeCachedVerdict({
            userId,
            itemKey: nextCacheItemKey,
            closetRevision: closetRevisionState.revision,
            cachedAt: new Date().toISOString(),
            verdict: mergedVerdictPayload,
            item: mergedVerdictPayload.item,
            proofItemsById: proofItemMap,
          }).catch(() => null);
        }
      } catch (error: any) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setErrorMessage(error?.message || 'Failed to analyze this item.');
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchProofItems, fetchUserId, routeItem, routeItemId]
  );

  useEffect(() => {
    mountedRef.current = true;
    setCurrentItem(routeItem);
    setVerdict(null);
    setProofItemsById({});
    setErrorMessage(null);
    void loadVerdict({
      itemIdOverride: routeItemId,
      itemOverride: routeItem,
    });

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadVerdict, routeItem, routeItemId]);

  const handleRetry = useCallback(() => {
    void loadVerdict({
      itemIdOverride: routeItemId,
      itemOverride: routeItem || currentItem || null,
      isRefresh: false,
      bypassCache: true,
    });
  }, [currentItem, loadVerdict, routeItem, routeItemId]);

  const handleSave = useCallback(async () => {
    if (!verdict?.actions.can_save || !hydratedItem) return;

    try {
      setSaving(true);
      const userId = await fetchUserId();
      let nextItem: VerdictItem | null = null;

      if (hydratedItem.id && isScannedCandidate(hydratedItem)) {
        const closetAccess = await canUseFeature(userId, 'closet_item');
        if (!closetAccess.allowed) {
          setUpgradeModal(buildUpgradeModalState('closet_item', closetAccess));
          return;
        }

        const { data, error } = await supabase
          .from('wardrobe')
          .update({ wardrobe_status: 'owned' })
          .eq('user_id', userId)
          .eq('id', hydratedItem.id)
          .select()
          .single();

        if (error) throw error;
        nextItem = data as VerdictItem;
        await bumpClosetRevision(userId).catch(() => null);
        nextItem = (await prepareWardrobeItemDerivatives(nextItem)) as VerdictItem;
      } else {
        const insertPayload = buildSavePayload(hydratedItem, userId, params.source);
        const { data, error } = await insertWardrobeItemWithCompatibility(insertPayload);
        if (error) throw error;
        if (!data) throw new Error('Item saved, but the new row could not be loaded.');
        nextItem = (await prepareWardrobeItemDerivatives(data as VerdictItem)) as VerdictItem;
      }

      setCurrentItem(nextItem);
      await loadVerdict({
        itemIdOverride: nextItem.id,
        itemOverride: nextItem,
        isRefresh: false,
        bypassCache: true,
      });
    } catch (error: any) {
      if (isSubscriptionLimitError(error)) {
        setUpgradeModal(buildUpgradeModalState(error.featureName, error.accessResult));
        return;
      }
      Alert.alert('Save failed', error?.message || 'Could not save this item to your closet.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [fetchUserId, hydratedItem, loadVerdict, params.source, verdict?.actions.can_save]);

  const handleStyle = useCallback(() => {
    navigation.navigate('StyleItemScreen', { item: hydratedItem });
  }, [hydratedItem, navigation]);

  const handleOpenProof = useCallback(
    (proof: OutfitProof) => {
      navigation.navigate('StyleItemScreen', {
        item: hydratedItem,
        initialContext: proof.context || '',
        initialVibe: proof.vibe || '',
        initialSeason: proof.season || firstSeason(hydratedItem.season),
        initialTemperature: proof.temperature ? String(proof.temperature) : '',
      });
    },
    [hydratedItem, navigation]
  );

  const handleTryOn = useCallback(() => {
    navigation.navigate('TryOn', {
      mode: 'quick',
      lockedItem: hydratedItem,
    });
  }, [hydratedItem, navigation]);

  const renderLoading = () => (
    <View style={styles.loadingStack}>
      <View style={[styles.skeletonBlock, styles.heroSkeleton]} />
      <View style={[styles.skeletonBlock, styles.verdictSkeleton]} />
      <View style={styles.scoreSkeletonRow}>
        <View style={[styles.skeletonBlock, styles.scoreSkeleton]} />
        <View style={[styles.skeletonBlock, styles.scoreSkeleton]} />
        <View style={[styles.skeletonBlock, styles.scoreSkeleton]} />
      </View>
      <View style={[styles.skeletonBlock, styles.sectionSkeleton]} />
      <View style={[styles.skeletonBlock, styles.sectionSkeleton]} />
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorCard}>
      <Text style={styles.errorTitle}>We could not build the verdict</Text>
      <Text style={styles.errorBody}>{errorMessage || 'Something went wrong while analyzing this item.'}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const proofRows = useMemo(
    () =>
      (verdict?.outfit_proofs || []).map((proof) => ({
        ...proof,
        items: proof.item_ids
          .map((itemId) => proofItemsById[itemId] || (hydratedItem.id === itemId ? hydratedItem : null))
          .filter(Boolean) as VerdictItem[],
      })).filter((proof) => proof.items.length > 0),
    [hydratedItem, proofItemsById, verdict?.outfit_proofs]
  );

  const verdictPalette = getVerdictPalette(verdict?.verdict_meta?.tone);
  const confidenceLabel = formatConfidence(verdict?.verdict_meta?.confidence);
  const verdictFactChips = useMemo(
    () =>
      [
        verdict?.outfit_proof_count ? `${verdict.outfit_proof_count} proof looks` : null,
        verdict?.compatibility_matches_strong_count ? `${verdict.compatibility_matches_strong_count} strong matches` : null,
        verdict?.duplicate_count ? `${verdict.duplicate_count} close overlaps` : null,
      ].filter(Boolean) as string[],
    [verdict?.compatibility_matches_strong_count, verdict?.duplicate_count, verdict?.outfit_proof_count]
  );
  const proofSectionSub = verdict?.occasion_insights?.best_use_case
    ? `Best use case: ${verdict.occasion_insights.best_use_case.label}. ${verdict.occasion_insights.best_use_case.message}`
    : 'Real closet matches, not abstract taste scores.';
  const insightCards = useMemo(
    () =>
      [
        verdict?.occasion_insights?.best_use_case
          ? {
              key: 'best-use-case',
              title: 'Best Use Case',
              tone: 'positive' as const,
              message: verdict.occasion_insights.best_use_case.message,
            }
          : null,
        verdict?.occasion_insights?.caution_use_case
          ? {
              key: 'caution-use-case',
              title: 'Watch Out',
              tone: 'warning' as const,
              message: verdict.occasion_insights.caution_use_case.message,
            }
          : null,
        verdict?.value_signal?.message
          ? {
              key: 'value-signal',
              title: verdict.value_signal.label || 'Value Read',
              tone:
                verdict.value_signal.tone === 'pricey_duplicate' || verdict.value_signal.tone === 'overpriced_for_fit'
                  ? ('warning' as const)
                  : verdict.value_signal.tone === 'strong_value'
                    ? ('positive' as const)
                    : ('neutral' as const),
              message: verdict.value_signal.message,
            }
          : null,
        verdict?.gap_or_duplicate?.message
          ? {
              key: 'gap-read',
              title:
                verdict.gap_or_duplicate.type === 'gap_fill'
                  ? 'Gap Fill'
                  : verdict.gap_or_duplicate.type === 'duplicate_risk'
                    ? 'Duplicate Risk'
                    : 'Wardrobe Read',
              tone: getGapInsightTone(verdict.gap_or_duplicate.type),
              message: verdict.gap_or_duplicate.message,
            }
          : null,
      ].filter(Boolean) as Array<{ key: string; title: string; tone: 'positive' | 'warning' | 'neutral'; message: string }>,
    [verdict]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void loadVerdict({
                itemIdOverride: routeItemId,
                itemOverride: routeItem || currentItem || null,
                isRefresh: true,
                bypassCache: true,
              })
            }
            tintColor={editorialPalette.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Klozu Verdict</Text>
            <Text style={styles.headerTitle}>Item Verdict</Text>
          </View>
        </View>

        {loading && !verdict ? renderLoading() : null}
        {!loading && errorMessage && !verdict ? renderErrorState() : null}

        {verdict ? (
          <>
            <VerdictHeroCard
              item={hydratedItem}
              verdictMeta={verdict.verdict_meta}
              bestUseCase={verdict.occasion_insights?.best_use_case}
              valueSignal={verdict.value_signal}
            />

            <View
              style={[
                styles.verdictCard,
                {
                  backgroundColor: verdictPalette.background,
                  borderColor: verdictPalette.border,
                },
              ]}
            >
              <Text style={[styles.verdictEyebrow, { color: verdictPalette.eyebrow }]}>Verdict</Text>
              <View style={styles.verdictTitleRow}>
                <Text style={styles.verdictTitle}>{formatVerdictLabel(verdict.verdict_meta?.label)}</Text>
              </View>
              {confidenceLabel ? (
                <View style={styles.confidenceChip}>
                  <Text style={styles.confidenceChipText}>{confidenceLabel}</Text>
                </View>
              ) : null}
              <Text style={styles.verdictSummary}>{verdict.summary}</Text>
              {verdictFactChips.length ? (
                <View style={styles.factChipRow}>
                  {verdictFactChips.map((chip) => (
                    <View key={chip} style={styles.factChip}>
                      <Text style={styles.factChipText}>{chip}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <VerdictScoreRow signals={verdict.verdict_signals} />
            <VerdictReasonList reasons={verdict.reasons} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Outfit Proof</Text>
              <Text style={styles.sectionSub}>{proofSectionSub}</Text>
            </View>
            <View style={styles.proofStack}>
              {proofRows.length ? (
                proofRows.map((proof) => (
                  <VerdictOutfitProof
                    key={`${proof.label}-${proof.item_ids.join('|')}`}
                    label={proof.label}
                    context={proof.context}
                    reason={proof.reason}
                    items={proof.items}
                    onPress={() => handleOpenProof(proof)}
                  />
                ))
              ) : (
                <View style={styles.emptyProofCard}>
                  <Text style={styles.emptyProofTitle}>No proof looks available yet</Text>
                  <Text style={styles.emptyProofBody}>
                    We could not verify enough outfit matches for this item right now.
                  </Text>
                </View>
              )}
            </View>

            {insightCards.length ? (
              <View style={styles.insightStack}>
                {insightCards.map((insight) => (
                  <VerdictInsightCard
                    key={insight.key}
                    title={insight.title}
                    tone={insight.tone}
                    message={insight.message}
                  />
                ))}
              </View>
            ) : null}

            <VerdictActionsBar
              canStyle={verdict.actions.can_style}
              canTryOn={verdict.actions.can_try_on}
              canSave={verdict.actions.can_save}
              saving={saving}
              onStyle={handleStyle}
              onTryOn={handleTryOn}
              onSave={handleSave}
            />
          </>
        ) : null}
      </ScrollView>

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
    backgroundColor: editorialPalette.surface,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 52,
    height: 52,
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
  },
  backButtonText: {
    color: editorialPalette.onSurface,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 4,
  },
  headerEyebrow: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: editorialPalette.onSurface,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
  },
  verdictCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    gap: 10,
    marginBottom: spacing.lg,
    shadowOpacity: 0,
    elevation: 0,
  },
  verdictEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  verdictTitle: {
    color: editorialPalette.onSurface,
    flex: 1,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  verdictTitleRow: {
    gap: 10,
  },
  confidenceChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
  },
  confidenceChipText: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  verdictSummary: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
  },
  factChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  factChip: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: editorialPalette.surfaceContainerLowest,
  },
  factChipText: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    marginBottom: spacing.sm + 6,
    gap: 4,
  },
  sectionTitle: {
    color: editorialPalette.onSurface,
    fontSize: 22,
    fontWeight: '800',
  },
  sectionSub: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  proofStack: {
    gap: 12,
    marginBottom: spacing.lg,
  },
  insightStack: {
    gap: 12,
    marginBottom: spacing.lg,
  },
  emptyProofCard: {
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.md + 4,
    gap: 8,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyProofTitle: {
    color: editorialPalette.onSurface,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyProofBody: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingStack: {
    gap: 16,
  },
  skeletonBlock: {
    backgroundColor: editorialPalette.surfaceContainer,
    borderRadius: 14,
  },
  heroSkeleton: {
    height: 390,
  },
  verdictSkeleton: {
    height: 140,
  },
  scoreSkeletonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreSkeleton: {
    flex: 1,
    height: 112,
  },
  sectionSkeleton: {
    height: 180,
  },
  errorCard: {
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: editorialPalette.outlineGhost,
    shadowOpacity: 0,
    elevation: 0,
  },
  errorTitle: {
    color: editorialPalette.onSurface,
    fontSize: 20,
    fontWeight: '700',
  },
  errorBody: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: editorialPalette.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#fafaff',
    fontWeight: '700',
  },
});
