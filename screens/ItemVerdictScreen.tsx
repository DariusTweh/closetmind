import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiPost } from '../lib/api';
import {
  ItemVerdictResponse,
  ItemVerdictRouteParams,
  normalizeVerdictItemSeason,
  VerdictItem,
  VerdictType,
} from '../lib/itemVerdict';
import { insertWardrobeItemWithCompatibility } from '../lib/wardrobeStorage';
import { supabase } from '../lib/supabase';
import { spacing } from '../lib/theme';
import { editorialPalette, editorialShadow } from '../lib/editorialTheme';
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
  'id, name, type, main_category, image_url, image_path, primary_color, secondary_colors, pattern_description, vibe_tags, season, source_url, brand';
const PROOF_LEGACY_SELECT_FIELDS =
  'id, name, type, main_category, image_url, primary_color, secondary_colors, pattern_description, vibe_tags, season, source_url, brand';

function formatVerdictLabel(verdict?: VerdictType) {
  switch (verdict) {
    case 'strong_buy':
      return 'Strong Buy';
    case 'skip':
      return 'Skip';
    default:
      return 'Maybe';
  }
}

function getVerdictPalette(verdict?: VerdictType) {
  switch (verdict) {
    case 'strong_buy':
      return {
        background: editorialPalette.verdictStrong,
        border: editorialPalette.outlineGhost,
        eyebrow: editorialPalette.onSurface,
      };
    case 'skip':
      return {
        background: editorialPalette.verdictSkip,
        border: editorialPalette.outlineGhost,
        eyebrow: editorialPalette.error,
      };
    default:
      return {
        background: editorialPalette.verdictMaybe,
        border: editorialPalette.outlineGhost,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

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
        setProofItemsById(proofItemMap);
        return;
      }

      let responseItems: any = await supabase
        .from('wardrobe')
        .select(PROOF_SELECT_FIELDS)
        .eq('user_id', userId)
        .in('id', wardrobeIds);

      if (responseItems.error && hasMissingColumn(responseItems.error.message, 'image_path')) {
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

      if (mountedRef.current) {
        setProofItemsById(proofItemMap);
      }
    },
    []
  );

  const loadVerdict = useCallback(
    async ({
      itemIdOverride,
      itemOverride,
      isRefresh = false,
    }: {
      itemIdOverride?: string | null;
      itemOverride?: VerdictItem | null;
      isRefresh?: boolean;
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
        const response = await apiPost(
          '/item-verdict',
          shouldUseWardrobeId ? { item_id: explicitItemId } : { item: itemPayload }
        );
        const payload = (await response.json().catch(() => null)) as ItemVerdictResponse | { error?: string } | null;

        if (!response.ok || !payload || 'error' in payload) {
          throw new Error((payload as any)?.error || 'Failed to analyze this item.');
        }
        const verdictPayload = payload as ItemVerdictResponse;
        const mergedItem = mergeVerdictItem(itemPayload || routeItem || null, verdictPayload.item);
        const mergedVerdictPayload = {
          ...verdictPayload,
          item: mergedItem || verdictPayload.item,
        };

        const userId = await fetchUserId();
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        setVerdict(mergedVerdictPayload);
        setCurrentItem(mergedVerdictPayload.item);
        await fetchProofItems(userId, mergedVerdictPayload);
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
    });
  }, [currentItem, loadVerdict, routeItem, routeItemId]);

  const handleSave = useCallback(async () => {
    if (!verdict?.actions.can_save || !hydratedItem) return;

    try {
      setSaving(true);
      const userId = await fetchUserId();
      let nextItem: VerdictItem | null = null;

      if (hydratedItem.id && isScannedCandidate(hydratedItem)) {
        const { data, error } = await supabase
          .from('wardrobe')
          .update({ wardrobe_status: 'owned' })
          .eq('user_id', userId)
          .eq('id', hydratedItem.id)
          .select()
          .single();

        if (error) throw error;
        nextItem = data as VerdictItem;
      } else {
        const insertPayload = buildSavePayload(hydratedItem, userId, params.source);
        const { data, error } = await insertWardrobeItemWithCompatibility(insertPayload);
        if (error) throw error;
        if (!data) throw new Error('Item saved, but the new row could not be loaded.');
        nextItem = data as VerdictItem;
      }

      setCurrentItem(nextItem);
      await loadVerdict({
        itemIdOverride: nextItem.id,
        itemOverride: nextItem,
        isRefresh: false,
      });
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not save this item to your closet.');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [fetchUserId, hydratedItem, loadVerdict, params.source, verdict?.actions.can_save]);

  const handleStyle = useCallback(() => {
    navigation.navigate('StyleItemScreen', { item: hydratedItem });
  }, [hydratedItem, navigation]);

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

  const verdictPalette = getVerdictPalette(verdict?.verdict);

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
              })
            }
            tintColor={editorialPalette.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>ClosetMind Verdict</Text>
            <Text style={styles.headerTitle}>Item Verdict</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {loading && !verdict ? renderLoading() : null}
        {!loading && errorMessage && !verdict ? renderErrorState() : null}

        {verdict ? (
          <>
            <VerdictHeroCard item={hydratedItem} />

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
              <Text style={styles.verdictTitle}>{formatVerdictLabel(verdict.verdict)}</Text>
              <Text style={styles.verdictSummary}>{verdict.summary}</Text>
            </View>

            <VerdictScoreRow scores={verdict.scores} />
            <VerdictReasonList reasons={verdict.reasons} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Outfit Proof</Text>
              <Text style={styles.sectionSub}>Real closet matches, not abstract taste scores.</Text>
            </View>
            <View style={styles.proofStack}>
              {proofRows.length ? (
                proofRows.map((proof) => (
                  <VerdictOutfitProof
                    key={`${proof.label}-${proof.item_ids.join('|')}`}
                    label={proof.label}
                    reason={proof.reason}
                    items={proof.items}
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

            <VerdictInsightCard insight={verdict.gap_or_duplicate} />

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
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md + 2,
  },
  backButton: {
    minWidth: 60,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: editorialPalette.surfaceContainer,
    borderRadius: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: editorialPalette.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  headerCopy: {
    alignItems: 'center',
    gap: 2,
  },
  headerEyebrow: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: editorialPalette.onSurface,
    fontSize: 21,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60,
  },
  verdictCard: {
    borderWidth: 0,
    borderRadius: 14,
    padding: spacing.md + 2,
    gap: 6,
    marginBottom: spacing.md + 2,
    ...editorialShadow,
  },
  verdictEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  verdictTitle: {
    color: editorialPalette.onSurface,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  verdictSummary: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    marginBottom: spacing.sm + 4,
    gap: 3,
  },
  sectionTitle: {
    color: editorialPalette.onSurface,
    fontSize: 19,
    fontWeight: '700',
  },
  sectionSub: {
    color: editorialPalette.onSurfaceVariant,
    fontSize: 13.5,
  },
  proofStack: {
    gap: 10,
    marginBottom: spacing.md + 4,
  },
  emptyProofCard: {
    backgroundColor: editorialPalette.surfaceContainerLowest,
    borderRadius: 14,
    padding: spacing.md + 2,
    gap: 6,
    ...editorialShadow,
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
    borderRadius: 14,
    padding: spacing.lg,
    gap: 12,
    ...editorialShadow,
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
