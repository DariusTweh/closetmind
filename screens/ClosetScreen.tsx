import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../lib/theme';
import { bumpClosetRevision } from '../lib/itemVerdictCache';
import useClosetDashboard from '../hooks/useClosetDashboard';

import ClosetDailyFitHero from '../components/Closet/ClosetDailyFitHero';
import ClosetFilterPills from '../components/Closet/ClosetFilterPills';
import ClosetHeader from '../components/Closet/ClosetHeader';
import ClosetRecentlyAddedRow from '../components/Closet/ClosetRecentlyAddedRow';
import ClosetTopBar from '../components/Closet/ClosetTopBar';
import ClothingCard from '../components/Closet/ClothingCard';
import ClothingSection from '../components/Closet/ClothingSection';
import EditModeToolbar from '../components/Closet/EditModeToolbar';
import EmptyState from '../components/Closet/EmptyState';
import LoadingSkeleton from '../components/Closet/LoadingSkeleton';
import FilterModal from '../components/Closet/modal/FilterModal';
import ViewItemModal from '../components/Closet/modal/ViewItemModal';

const MAIN_CATEGORIES = ['top', 'bottom', 'shoes', 'outerwear', 'accessory', 'layer', 'onepiece'];
const CORE_WARDROBE_SELECT_FIELDS = [
  'id',
  'name',
  'type',
  'main_category',
  'primary_color',
  'secondary_colors',
  'pattern_description',
  'season',
  'vibe_tags',
  'image_url',
  'source_type',
  'wardrobe_status',
  'created_at',
];
const LEGACY_LISTED_WARDROBE_FIELDS = ['is_listed', 'listed'];
const REQUIRED_WARDROBE_MEDIA_FIELDS = [
  'image_path',
  'cutout_image_url',
  'original_image_url',
];
const OPTIONAL_WARDROBE_MEDIA_FIELDS = [
  'thumbnail_url',
  'display_image_url',
  'cutout_thumbnail_url',
  'cutout_display_url',
];
const OPTIONAL_WARDROBE_STYLE_FIELDS = [
  'subcategory',
  'garment_function',
  'fabric_weight',
  'style_role',
  'material_guess',
  'silhouette',
  'weather_use',
  'occasion_tags',
  'formality',
  'layering_role',
  'fit',
  'fit_notes',
];
const FULL_WARDROBE_SELECT_FIELDS = [
  ...CORE_WARDROBE_SELECT_FIELDS,
  ...LEGACY_LISTED_WARDROBE_FIELDS,
  ...REQUIRED_WARDROBE_MEDIA_FIELDS,
  ...OPTIONAL_WARDROBE_MEDIA_FIELDS,
  ...OPTIONAL_WARDROBE_STYLE_FIELDS,
].join(', ');
const MEDIA_WITHOUT_CUTOUT_DERIVATIVE_FIELDS = [
  ...CORE_WARDROBE_SELECT_FIELDS,
  ...LEGACY_LISTED_WARDROBE_FIELDS,
  ...REQUIRED_WARDROBE_MEDIA_FIELDS,
  'thumbnail_url',
  'display_image_url',
  ...OPTIONAL_WARDROBE_STYLE_FIELDS,
].join(', ');
const MEDIA_WITHOUT_ANY_DERIVATIVE_FIELDS = [
  ...CORE_WARDROBE_SELECT_FIELDS,
  ...LEGACY_LISTED_WARDROBE_FIELDS,
  ...REQUIRED_WARDROBE_MEDIA_FIELDS,
  ...OPTIONAL_WARDROBE_STYLE_FIELDS,
].join(', ');
const LISTED_WARDROBE_SELECT_FIELDS = [
  ...CORE_WARDROBE_SELECT_FIELDS,
  ...LEGACY_LISTED_WARDROBE_FIELDS,
  ...REQUIRED_WARDROBE_MEDIA_FIELDS,
  ...OPTIONAL_WARDROBE_STYLE_FIELDS,
].join(', ');
const MINIMAL_WARDROBE_SELECT_FIELDS = [
  ...CORE_WARDROBE_SELECT_FIELDS,
  'image_path',
].join(', ');
const WARDROBE_PAGE_SIZE = 60;
const AUTH_EVENTS_REQUIRING_REFRESH = new Set(['SIGNED_IN', 'SIGNED_OUT']);
let CLOSET_WARDROBE_CACHE: { userId: string; items: any[] } | null = null;

const CATEGORY_LABELS: Record<string, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  shoes: 'Shoes',
  outerwear: 'Outerwear',
  accessory: 'Accessories',
  layer: 'Layers',
  onepiece: 'One-Piece',
};

const isWardrobeItemListed = (item: any) => item?.is_listed === true || item?.listed === true;

const WARDROBE_QUERY_ATTEMPTS = [
  { select: FULL_WARDROBE_SELECT_FIELDS, excludeScannedCandidates: true },
  { select: MEDIA_WITHOUT_CUTOUT_DERIVATIVE_FIELDS, excludeScannedCandidates: true },
  { select: MEDIA_WITHOUT_ANY_DERIVATIVE_FIELDS, excludeScannedCandidates: true },
  { select: LISTED_WARDROBE_SELECT_FIELDS, excludeScannedCandidates: true },
  { select: MINIMAL_WARDROBE_SELECT_FIELDS, excludeScannedCandidates: true },
  { select: MINIMAL_WARDROBE_SELECT_FIELDS, excludeScannedCandidates: false },
];

const isMissingSchemaError = (error: any) => {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the') ||
    normalized.includes('schema cache') ||
    normalized.includes('column') ||
    normalized.includes('relation')
  );
};

const parseMissingWardrobeColumn = (error: any) => {
  const message = String(error?.message || error?.details || error || '');
  const matches = [
    message.match(/column\s+wardrobe\.([a-zA-Z0-9_]+)\s+does not exist/i),
    message.match(/column\s+([a-zA-Z0-9_]+)\s+does not exist/i),
    message.match(/Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i),
  ];

  for (const match of matches) {
    const column = match?.[1]?.trim();
    if (column) return column;
  }

  return null;
};

const removeSelectColumn = (selectFields: string, columnName: string) => {
  const nextFields = selectFields
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
    .filter((field) => field !== columnName);

  if (!nextFields.length || nextFields.length === selectFields.split(',').filter(Boolean).length) {
    return null;
  }

  return nextFields.join(', ');
};

type AdvancedFilters = {
  category: string;
  colors: string[];
  seasons: string[];
  listedOnly: boolean;
};

export default function ClosetScreen() {
  const [wardrobe, setWardrobe] = useState<any[]>(CLOSET_WARDROBE_CACHE?.items ?? []);
  const [loading, setLoading] = useState(!CLOSET_WARDROBE_CACHE);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editMode, setEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(WARDROBE_PAGE_SIZE);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    category: 'all',
    colors: [],
    seasons: [],
    listedOnly: false,
  });

  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const hasLoadedOnceRef = useRef(Boolean(CLOSET_WARDROBE_CACHE));
  const fetchingWardrobeRef = useRef(false);
  const {
    avatarUri,
    dailyFitItems,
    outfitLocation,
    outfitLoading,
    outfitWeather,
    recentItems,
    handleRegenerate,
  } = useClosetDashboard({ wardrobe, enabled: isFocused });
  const heroItems = loading ? dailyFitItems : (wardrobe.length ? dailyFitItems : []);

  const fetchWardrobe = useCallback(async ({ showLoader = !hasLoadedOnceRef.current } = {}) => {
    if (fetchingWardrobeRef.current) return;
    fetchingWardrobeRef.current = true;
    if (showLoader) setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        CLOSET_WARDROBE_CACHE = null;
        setWardrobe([]);
        Alert.alert('Not Logged In', 'Please log in to view your closet.');
        return;
      }

      if (
        !showLoader &&
        CLOSET_WARDROBE_CACHE?.userId === user.id &&
        Array.isArray(CLOSET_WARDROBE_CACHE.items)
      ) {
        setWardrobe(CLOSET_WARDROBE_CACHE.items);
      }

      const runWardrobeQuery = async (selectFields: string, excludeScannedCandidates = true) => {
        let query = supabase
          .from('wardrobe')
          .select(selectFields)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (excludeScannedCandidates) {
          query = query.neq('wardrobe_status', 'scanned_candidate');
        }

        return query;
      };

      let data: any[] | null = null;
      let error: any = null;

      for (const attempt of WARDROBE_QUERY_ATTEMPTS) {
        let selectFields = attempt.select;
        const removedColumns = new Set<string>();

        while (selectFields) {
          const response = await runWardrobeQuery(
            selectFields,
            attempt.excludeScannedCandidates,
          );
          data = response.data;
          error = response.error;

          if (!error) break;
          if (!isMissingSchemaError(error)) break;

          const missingColumn = parseMissingWardrobeColumn(error);
          if (!missingColumn || removedColumns.has(missingColumn)) break;

          const nextSelectFields = removeSelectColumn(selectFields, missingColumn);
          if (!nextSelectFields) break;

          removedColumns.add(missingColumn);
          selectFields = nextSelectFields;
        }

        if (!error) break;
        if (!isMissingSchemaError(error)) break;
      }

      if (error) {
        console.error('ClosetScreen fetchWardrobe error:', error.message);
        Alert.alert('Error', 'Failed to load your closet.');
        setWardrobe([]);
        return;
      }

      const nextItems = data || [];
      CLOSET_WARDROBE_CACHE = {
        userId: user.id,
        items: nextItems,
      };
      setWardrobe(nextItems);
    } finally {
      hasLoadedOnceRef.current = true;
      fetchingWardrobeRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      void fetchWardrobe({ showLoader: !hasLoadedOnceRef.current });
    }
  }, [fetchWardrobe, isFocused]);

  useEffect(() => {
    setVisibleCount(WARDROBE_PAGE_SIZE);
  }, [advancedFilters, filter, searchQuery, wardrobe.length]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!AUTH_EVENTS_REQUIRING_REFRESH.has(String(event || ''))) return;

      if (event === 'SIGNED_OUT') {
        CLOSET_WARDROBE_CACHE = null;
        hasLoadedOnceRef.current = false;
        setWardrobe([]);
        setLoading(false);
        return;
      }

      void fetchWardrobe({ showLoader: false });
    });
    return () => subscription.unsubscribe();
  }, [fetchWardrobe]);

  const baseFilteredWardrobe = useMemo(() => wardrobe.filter((item) => {
    const normalizedCategory = String(advancedFilters.category || 'all').toLowerCase();
    const normalizedSeasons = advancedFilters.seasons.map((value) => String(value).toLowerCase());
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesCategory =
      normalizedCategory === 'all' || item.main_category === normalizedCategory;
    const matchesColor =
      advancedFilters.colors.length === 0 || advancedFilters.colors.includes(item.primary_color);
    const matchesSeason =
      normalizedSeasons.length === 0 || normalizedSeasons.includes(String(item.season || '').toLowerCase());
    const matchesListed = !advancedFilters.listedOnly || isWardrobeItemListed(item);
    const matchesSearch =
      !normalizedSearch
      || item.name?.toLowerCase().includes(normalizedSearch)
      || item.type?.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesColor && matchesSeason && matchesListed && matchesSearch;
  }), [advancedFilters, searchQuery, wardrobe]);

  const filteredWardrobe = useMemo(() => (
    filter === 'all'
      ? baseFilteredWardrobe
      : baseFilteredWardrobe.filter((item) => item.main_category === filter)
  ), [baseFilteredWardrobe, filter]);

  const visibleWardrobe = useMemo(
    () => filteredWardrobe.slice(0, visibleCount),
    [filteredWardrobe, visibleCount]
  );

  const itemsByCategory = useMemo(() => {
    if (filter !== 'all') {
      return { [filter]: visibleWardrobe };
    }

    return Object.fromEntries(
      MAIN_CATEGORIES.map((category) => [
        category,
        visibleWardrobe.filter((item) => item.main_category === category),
      ])
    );
  }, [filter, visibleWardrobe]);

  const categorySections = useMemo(() => MAIN_CATEGORIES
    .map((category) => ({
      key: category,
      title: CATEGORY_LABELS[category] || category,
      items: itemsByCategory[category] || [],
    }))
    .filter((section) => section.items.length > 0), [itemsByCategory]);

  const hasMoreVisible = filteredWardrobe.length > visibleCount;
  const loadMoreVisible = useCallback(() => {
    setVisibleCount((current) => Math.min(filteredWardrobe.length, current + WARDROBE_PAGE_SIZE));
  }, [filteredWardrobe.length]);

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }, []);

  const openItemModal = useCallback((items: any[], index: number) => {
    setModalItems(items);
    setSelectedIndex(index);
  }, []);

  const handleSharedItemPress = useCallback((items: any[], index: number) => {
    const item = items[index];
    if (!item) return;

    if (editMode) {
      toggleItemSelection(item.id);
      return;
    }

    openItemModal(items, index);
  }, [editMode, openItemModal, toggleItemSelection]);

  const deleteWardrobeItem = async (itemId: string) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      Alert.alert('Not Logged In', 'Please log in to manage your closet.');
      return;
    }

    const { error } = await supabase
      .from('wardrobe')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) {
      Alert.alert('Delete Failed', error.message);
      return;
    }

    await bumpClosetRevision(user.id).catch(() => null);
    fetchWardrobe();
  };

  const handleMultiDelete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('wardrobe')
      .delete()
      .in('id', selectedItems)
      .eq('user_id', user.id);

    if (!error) {
      await bumpClosetRevision(user.id).catch(() => null);
      setSelectedItems([]);
      setEditMode(false);
      fetchWardrobe();
    }
  };

  const topBarSubtitle = useMemo(() => {
    if (outfitWeather && outfitLocation) return `${outfitWeather} · ${outfitLocation}`;
    if (outfitWeather) return `Daily outlook ${outfitWeather}`;
    if (outfitLocation) return `Daily outlook ${outfitLocation}`;
    return 'Curated essentials, ready for today';
  }, [outfitLocation, outfitWeather]);

  const renderListHeader = () => (
    <View>
      <ClosetTopBar
        subtitle={topBarSubtitle}
        avatarUri={avatarUri}
        onPressProfile={() => navigation.navigate('Profile')}
        onPressSaved={() => navigation.navigate('SavedOutfits')}
        onPressSettings={() => navigation.navigate('Settings')}
      />

      <ClosetDailyFitHero
        items={heroItems}
        weather={outfitWeather}
        location={outfitLocation}
        loading={outfitLoading && heroItems.length === 0}
        editMode={editMode}
        selectedItemIds={selectedItems}
        onRegenerate={handleRegenerate}
        onPressItem={(_, index) => handleSharedItemPress(heroItems.slice(0, 3), index)}
      />

      <ClosetRecentlyAddedRow
        items={recentItems}
        editMode={editMode}
        selectedItemIds={selectedItems}
        onPressItem={(_, index) => handleSharedItemPress(recentItems, index)}
      />

      <ClosetHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        editMode={editMode}
        selectedCount={selectedItems.length}
        onEditPress={() => {
          setEditMode(!editMode);
          if (editMode) setSelectedItems([]);
        }}
        onFilterPress={() => setShowFilters(true)}
      />

      <ClosetFilterPills activeFilter={filter} setActiveFilter={setFilter} />
    </View>
  );

  const renderLoadMoreButton = () => (
    hasMoreVisible ? (
      <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreVisible}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    ) : <View style={styles.bottomSpacer} />
  );

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderListHeader()}
          <LoadingSkeleton count={4} />
        </ScrollView>
      ) : filteredWardrobe.length === 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderListHeader()}
          <EmptyState message="No matching clothing found." />
          {renderLoadMoreButton()}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderListHeader()}

          {filter === 'all' ? (
            categorySections.map((item) => (
              <ClothingSection
                key={item.key}
                title={item.title}
                items={item.items}
                editMode={editMode}
                selectedItems={selectedItems}
                toggleItemSelection={toggleItemSelection}
                setSelectedIndex={(index) => {
                  openItemModal(item.items, index);
                }}
              />
            ))
          ) : (
            <View style={styles.gridWrap}>
              {visibleWardrobe.map((item, index) => (
                <View key={String(item.id)} style={styles.gridItemWrap}>
                  <ClothingCard
                    item={item}
                    gridMode
                    onPress={() => {
                      if (editMode) toggleItemSelection(item.id);
                      else openItemModal(visibleWardrobe, index);
                    }}
                    isSelected={selectedItems.includes(item.id)}
                    onLongPress={() => {
                      if (!editMode) {
                        Alert.alert('Delete Item', 'Are you sure?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await deleteWardrobeItem(item.id);
                            },
                          },
                        ]);
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          )}

          {renderLoadMoreButton()}
        </ScrollView>
      )}

      {editMode && selectedItems.length > 0 ? (
        <EditModeToolbar
          onCancel={() => {
            setEditMode(false);
            setSelectedItems([]);
          }}
          onDelete={handleMultiDelete}
          selectedCount={selectedItems.length}
        />
      ) : null}

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        selectedCategories={[advancedFilters.category]}
        setSelectedCategories={(cats) =>
          setAdvancedFilters((prev) => ({ ...prev, category: cats[0] || 'all' }))
        }
        selectedColors={advancedFilters.colors}
        setSelectedColors={(nextColors) => setAdvancedFilters((prev) => ({ ...prev, colors: nextColors }))}
        selectedSeasons={advancedFilters.seasons}
        setSelectedSeasons={(seasons) => setAdvancedFilters((prev) => ({ ...prev, seasons }))}
        listedOnly={advancedFilters.listedOnly}
        setListedOnly={(val) => setAdvancedFilters((prev) => ({ ...prev, listedOnly: val }))}
        onApply={() => setShowFilters(false)}
        onClear={() =>
          setAdvancedFilters({ category: 'all', colors: [], seasons: [], listedOnly: false })
        }
      />

      <ViewItemModal
        visible={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        items={modalItems}
        initialIndex={selectedIndex}
        onEdit={(item) => {
          setSelectedIndex(null);
          setTimeout(() => {
            navigation.navigate('EditItem', { item });
          }, 180);
        }}
        onStyle={(item) => {
          setSelectedIndex(null);
          navigation.navigate('StyleItemScreen', { item });
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
  scrollContent: {
    paddingBottom: spacing.xl * 2.35,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs + 6,
  },
  gridItemWrap: {
    width: '48%',
    marginBottom: spacing.lg - 4,
  },
  loadMoreButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadMoreText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: spacing.xl + spacing.lg,
  },
});
