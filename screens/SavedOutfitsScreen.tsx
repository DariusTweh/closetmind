import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import CreateTravelCollectionModal from '../components/SavedOutfits/CreateTravelCollectionModal';
import EmptyState from '../components/SavedOutfits/EmptyState';
import OutfitCard from '../components/SavedOutfits/OutfitCard';
import SavedOutfitsHeader, {
  type SavedOutfitsSeasonFilter,
} from '../components/SavedOutfits/SavedOutfitsHeader';
import TravelCollectionCard from '../components/SavedOutfits/TravelCollectionCard';
import TravelCollectionEmptyState from '../components/SavedOutfits/TravelCollectionEmptyState';
import UpgradeLimitModal from '../components/subscriptions/UpgradeLimitModal';
import { useUpgradeWall } from '../hooks/useUpgradeWall';
import { useOptionalBottomTabBarHeight } from '../lib/useOptionalBottomTabBarHeight';
import { isSubscriptionLimitError } from '../lib/subscriptions/errors';
import { buildUpgradeModalState, HIDDEN_UPGRADE_MODAL_STATE } from '../lib/subscriptions/modalState';
import { canUseFeature } from '../lib/subscriptions/usageService';
import { colors, spacing } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { fetchAllSavedOutfits } from '../services/savedOutfitService';
import { createTravelCollection, fetchTravelCollections } from '../services/travelCollectionsService';
import type { TravelCollectionDraft } from '../types/travelCollections';

type ContentMode = 'All' | 'Favorites' | 'Travel';

type TravelCollectionCardData = {
  collection: any;
  outfitCount: number;
  previewItems: any[];
  linkedOutfits: any[];
};

let SAVED_OUTFITS_SCREEN_CACHE: {
  outfits: any[];
  travelCollections: any[];
  userId: string | null;
} | null = null;

function matchesSearch(values: Array<string | null | undefined>, query: string) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
}

function seasonMatches(outfit: any, seasonFilter: SavedOutfitsSeasonFilter) {
  if (seasonFilter === 'Any Season') return true;
  return String(outfit?.season || '').trim().toLowerCase() === seasonFilter.toLowerCase();
}

export default function SavedOutfitsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const hasLoadedOnceRef = useRef(Boolean(SAVED_OUTFITS_SCREEN_CACHE));

  const [loading, setLoading] = useState(!SAVED_OUTFITS_SCREEN_CACHE);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const [outfits, setOutfits] = useState<any[]>(SAVED_OUTFITS_SCREEN_CACHE?.outfits ?? []);
  const [travelCollections, setTravelCollections] = useState<any[]>(SAVED_OUTFITS_SCREEN_CACHE?.travelCollections ?? []);
  const [userId, setUserId] = useState<string | null>(SAVED_OUTFITS_SCREEN_CACHE?.userId ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentMode, setContentMode] = useState<ContentMode>('All');
  const [seasonFilter, setSeasonFilter] = useState<SavedOutfitsSeasonFilter>('Any Season');
  const [createTripVisible, setCreateTripVisible] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(HIDDEN_UPGRADE_MODAL_STATE);
  const { isPaywallAvailable, openTryOnPack, openUpgrade } = useUpgradeWall();

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id as string;
  }, []);

  const loadData = useCallback(async () => {
    const uid = userId || (await resolveUser());
    if (!uid) {
      SAVED_OUTFITS_SCREEN_CACHE = null;
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
      return;
    }

    try {
      setUserId(uid);
      const [savedOutfits, collections] = await Promise.all([
        fetchAllSavedOutfits(uid),
        fetchTravelCollections(uid),
      ]);
      setOutfits(savedOutfits);
      setTravelCollections(collections);
    } catch (error: any) {
      console.error('❌ SavedOutfitsScreen load error:', error?.message || error);
      Alert.alert('Error', 'Failed to load saved outfits.');
    }
  }, [navigation, resolveUser, userId]);

  const refreshAll = useCallback(async ({
    showLoader = !hasLoadedOnceRef.current,
    pullToRefresh = false,
  }: {
    showLoader?: boolean;
    pullToRefresh?: boolean;
  } = {}) => {
    if (showLoader) setLoading(true);
    if (pullToRefresh) setRefreshing(true);
    try {
      await loadData();
      hasLoadedOnceRef.current = true;
    } finally {
      setLoading(false);
      if (pullToRefresh) setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    if (!isFocused) return;
    void refreshAll({ showLoader: !hasLoadedOnceRef.current });
  }, [isFocused, refreshAll]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refreshAll({ showLoader: !hasLoadedOnceRef.current });
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [refreshAll]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current && !userId && outfits.length === 0 && travelCollections.length === 0) return;
    SAVED_OUTFITS_SCREEN_CACHE = {
      outfits,
      travelCollections,
      userId,
    };
  }, [outfits, travelCollections, userId]);

  const deleteOutfit = async (id: string) => {
    if (!userId) return;
    const previous = outfits;
    setOutfits(previous.filter((outfit) => outfit.id !== id));

    const { error } = await supabase.from('saved_outfits').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      setOutfits(previous);
      Alert.alert('Error', 'Could not delete outfit.');
    }
  };

  const toggleFavorite = async (id: string) => {
    if (!userId) return;
    const target = outfits.find((outfit) => outfit.id === id);
    if (!target) return;
    const nextValue = !target.is_favorite;

    setOutfits((previous) =>
      previous.map((outfit) => (outfit.id === id ? { ...outfit, is_favorite: nextValue } : outfit)),
    );

    const { error } = await supabase
      .from('saved_outfits')
      .update({ is_favorite: nextValue })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      setOutfits((previous) =>
        previous.map((outfit) => (outfit.id === id ? { ...outfit, is_favorite: !nextValue } : outfit)),
      );
      Alert.alert('Error', 'Could not update favorite.');
    }
  };

  const travelCards = useMemo<TravelCollectionCardData[]>(() => {
    const outfitsByCollectionId = new Map<string, any[]>();

    outfits.forEach((outfit) => {
      const collectionId = String(outfit?.travel_collection_id || '').trim();
      if (!collectionId) return;
      const current = outfitsByCollectionId.get(collectionId) || [];
      current.push(outfit);
      outfitsByCollectionId.set(collectionId, current);
    });

    return travelCollections.filter(Boolean).map((collection) => {
      const linkedOutfits = (outfitsByCollectionId.get(String(collection?.id || '')) || []).sort((left, right) => {
        const leftSort = Number.isFinite(Number(left?.sort_order)) ? Number(left.sort_order) : Number.MAX_SAFE_INTEGER;
        const rightSort = Number.isFinite(Number(right?.sort_order)) ? Number(right.sort_order) : Number.MAX_SAFE_INTEGER;
        if (leftSort !== rightSort) return leftSort - rightSort;
        return new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime();
      });
      const previewItems = linkedOutfits
        .flatMap((outfit) => (Array.isArray(outfit?.resolvedItems) ? outfit.resolvedItems : []))
        .slice(0, 4);

      return {
        collection,
        outfitCount: linkedOutfits.length,
        previewItems,
        linkedOutfits,
      };
    });
  }, [outfits, travelCollections]);

  const filteredOutfits = useMemo(() => {
    const query = String(searchQuery || '').trim();
    const next = outfits.filter((outfit) => {
      const matchesMode =
        contentMode === 'All' || (contentMode === 'Favorites' && Boolean(outfit?.is_favorite));

      if (!matchesMode) return false;
      if (!seasonMatches(outfit, seasonFilter)) return false;

      return matchesSearch(
        [
          outfit?.name,
          outfit?.context,
          outfit?.season,
          outfit?.activity_label,
          outfit?.day_label,
          outfit?.outfit_mode,
        ],
        query,
      );
    });

    return [...next].sort(
      (left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime(),
    );
  }, [contentMode, outfits, searchQuery, seasonFilter]);

  const filteredTravelCards = useMemo(() => {
    const query = String(searchQuery || '').trim();
    return travelCards.filter((entry) => {
      const linkedSearchFields = entry.linkedOutfits.flatMap((outfit) => [
        outfit?.name,
        outfit?.activity_label,
        outfit?.day_label,
        outfit?.context,
      ]);

      return matchesSearch(
        [entry.collection?.name, entry.collection?.destination, entry.collection?.notes, ...linkedSearchFields],
        query,
      );
    });
  }, [searchQuery, travelCards]);

  const headerSummaryText = useMemo(() => {
    const normalizedQuery = String(searchQuery || '').trim();
    const favoriteCount = outfits.filter((entry) => Boolean(entry?.is_favorite)).length;
    const travelLookCount = outfits.filter((entry) => String(entry?.travel_collection_id || '').trim()).length;
    const tripCount = travelCollections.length;

    if (contentMode === 'Travel') {
      const shownTrips = filteredTravelCards.length;
      const base = normalizedQuery ? `Showing ${shownTrips} of ${tripCount} trips` : `${shownTrips} trips`;
      return `${base} • ${travelLookCount} travel looks`;
    }

    const baseOutfitCount =
      contentMode === 'Favorites'
        ? outfits.filter((entry) => Boolean(entry?.is_favorite)).length
        : outfits.length;
    const shownOutfitCount = filteredOutfits.length;
    const label = contentMode === 'Favorites' ? 'favorites' : 'looks';
    const base = normalizedQuery
      ? `Showing ${shownOutfitCount} of ${baseOutfitCount} ${label}`
      : `${shownOutfitCount} ${label}`;
    return `${base} • ${tripCount} trips • ${favoriteCount} favorites`;
  }, [contentMode, filteredOutfits.length, filteredTravelCards.length, outfits, searchQuery, travelCollections.length]);

  const handleCreateTrip = useCallback(
    async (draft: TravelCollectionDraft) => {
      try {
        setSubmittingTrip(true);
        const uid = userId || (await resolveUser());
        if (!uid) {
          Alert.alert('Authentication Required', 'Please log in to create a trip.');
          return;
        }

        const organizationAccess = await canUseFeature(uid, 'premium_organization');
        if (!organizationAccess.allowed) {
          setUpgradeModal(buildUpgradeModalState('premium_organization', organizationAccess));
          return;
        }

        const created = await createTravelCollection({
          userId: uid,
          draft,
        });

        setUserId(uid);
        setTravelCollections((previous) => [created, ...previous]);
        setCreateTripVisible(false);
        setContentMode('Travel');
      } catch (error: any) {
        if (isSubscriptionLimitError(error)) {
          setUpgradeModal(buildUpgradeModalState(error.featureName, error.accessResult));
          return;
        }
        console.error('❌ Create travel collection failed:', error?.message || error);
        Alert.alert('Error', error?.message || 'Could not create this trip.');
      } finally {
        setSubmittingTrip(false);
      }
    },
    [resolveUser, userId],
  );

  const renderOutfit = ({ item: outfit }: { item: any }) => (
    <Swipeable
      renderRightActions={() => (
        <TouchableOpacity style={styles.swipeDelete} onPress={() => deleteOutfit(outfit.id)}>
          <Icon name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    >
      <OutfitCard
        outfit={outfit}
        onPress={() => (navigation as any).navigate('OutfitDetail', { outfit })}
        onToggleFavorite={() => toggleFavorite(outfit.id)}
      />
    </Swipeable>
  );

  const renderTravelCollection = ({ item }: { item: TravelCollectionCardData }) => (
    <TravelCollectionCard
      collection={item.collection}
      outfitCount={item.outfitCount}
      previewItems={item.previewItems}
      onPress={() =>
        (navigation as any).navigate('TravelCollectionDetail', {
          collectionId: item.collection.id,
        })
      }
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.fixedHeader}>
        <SavedOutfitsHeader
          contentMode={contentMode}
          onChangeMode={(nextMode) => {
            if (nextMode !== 'Travel') {
              setContentMode(nextMode);
              return;
            }

            void (async () => {
              const uid = userId || (await resolveUser());
              if (!uid) {
                Alert.alert('Authentication Required', 'Please log in to use premium organization tools.');
                return;
              }
              const result = await canUseFeature(uid, 'premium_organization');
              if (!result.allowed) {
                setUpgradeModal(buildUpgradeModalState('premium_organization', result));
                return;
              }
              setContentMode(nextMode);
            })().catch((error: any) => {
              console.warn('Travel mode gate failed:', error?.message || error);
            });
          }}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          seasonFilter={seasonFilter}
          onChangeSeasonFilter={setSeasonFilter}
          summaryText={headerSummaryText}
          onPressCreateTrip={() => {
            void (async () => {
              const uid = userId || (await resolveUser());
              if (!uid) {
                Alert.alert('Authentication Required', 'Please log in to create a trip.');
                return;
              }
              const result = await canUseFeature(uid, 'premium_organization');
              if (!result.allowed) {
                setUpgradeModal(buildUpgradeModalState('premium_organization', result));
                return;
              }
              setCreateTripVisible(true);
            })().catch((error: any) => {
              console.warn('Create trip gate failed:', error?.message || error);
            });
          }}
        />
      </View>

      <FlatList
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + spacing.xl + 20 }]}
        data={contentMode === 'Travel' ? filteredTravelCards : filteredOutfits}
        renderItem={contentMode === 'Travel' ? renderTravelCollection : renderOutfit}
        keyExtractor={(item: any) =>
          contentMode === 'Travel' ? `travel-${String(item?.collection?.id || item?.id || '')}` : String(item?.id || '')
        }
        ListEmptyComponent={
          !loading ? (
            contentMode === 'Travel' ? (
              <TravelCollectionEmptyState onCreateTrip={() => setCreateTripVisible(true)} />
            ) : (
              <EmptyState />
            )
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={() => {
          void refreshAll({ showLoader: false, pullToRefresh: true });
        }}
        showsVerticalScrollIndicator={false}
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.textSecondary} style={styles.loadingOverlay} />
      ) : null}

      <CreateTravelCollectionModal
        visible={createTripVisible}
        submitting={submittingTrip}
        onClose={() => {
          if (submittingTrip) return;
          setCreateTripVisible(false);
        }}
        onSubmit={(draft) => {
          void handleCreateTrip(draft);
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
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  swipeDelete: {
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    marginBottom: 14,
  },
  fixedHeader: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    zIndex: 10,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -12,
  },
});
