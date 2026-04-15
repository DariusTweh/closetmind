import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../lib/theme';
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
const BASE_WARDROBE_SELECT_FIELDS = [
  'id',
  'user_id',
  'name',
  'type',
  'main_category',
  'color',
  'primary_color',
  'secondary_colors',
  'pattern_description',
  'season',
  'vibe_tags',
  'image_url',
  'created_at',
];
const MEDIA_WARDROBE_SELECT_FIELDS = ['image_path'];
const STATUS_WARDROBE_SELECT_FIELDS = ['wardrobe_status'];
const OPTIONAL_WARDROBE_SELECT_FIELDS = ['is_listed', 'listed'];
const WARDROBE_SELECT_FIELDS = [
  ...BASE_WARDROBE_SELECT_FIELDS,
  ...MEDIA_WARDROBE_SELECT_FIELDS,
  ...STATUS_WARDROBE_SELECT_FIELDS,
  ...OPTIONAL_WARDROBE_SELECT_FIELDS,
].join(', ');
const MEDIA_WARDROBE_SELECT_ONLY_FIELDS = [
  ...BASE_WARDROBE_SELECT_FIELDS,
  ...MEDIA_WARDROBE_SELECT_FIELDS,
  ...STATUS_WARDROBE_SELECT_FIELDS,
].join(', ');
const STATUS_WARDROBE_SELECT_ONLY_FIELDS = [
  ...BASE_WARDROBE_SELECT_FIELDS,
  ...STATUS_WARDROBE_SELECT_FIELDS,
].join(', ');
const LEGACY_WARDROBE_SELECT_FIELDS = BASE_WARDROBE_SELECT_FIELDS.join(', ');
const WARDROBE_PAGE_SIZE = 60;

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

const hasMissingWardrobeOptionalColumnError = (message: string) => (
  OPTIONAL_WARDROBE_SELECT_FIELDS.some((field) => message.includes(`wardrobe.${field}`))
);

const hasMissingWardrobeMediaColumnError = (message: string) => (
  MEDIA_WARDROBE_SELECT_FIELDS.some((field) => message.includes(`wardrobe.${field}`))
);

const hasMissingWardrobeStatusColumnError = (message: string) => (
  STATUS_WARDROBE_SELECT_FIELDS.some((field) => message.includes(`wardrobe.${field}`))
);

type AdvancedFilters = {
  category: string;
  colors: string[];
  seasons: string[];
  listedOnly: boolean;
};

export default function ClosetScreen() {
  const [wardrobe, setWardrobe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchWardrobe = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setWardrobe([]);
      setLoading(false);
      Alert.alert('Not Logged In', 'Please log in to view your closet.');
      return;
    }

    let { data, error } = await supabase
      .from('wardrobe')
      .select(WARDROBE_SELECT_FIELDS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error && hasMissingWardrobeOptionalColumnError(error.message)) {
      const fallbackResponse = await supabase
        .from('wardrobe')
        .select(MEDIA_WARDROBE_SELECT_ONLY_FIELDS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      data = fallbackResponse.data;
      error = fallbackResponse.error;
    }

    if (error && hasMissingWardrobeMediaColumnError(error.message)) {
      const fallbackResponse = await supabase
        .from('wardrobe')
        .select(STATUS_WARDROBE_SELECT_ONLY_FIELDS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      data = fallbackResponse.data;
      error = fallbackResponse.error;
    }

    if (error && hasMissingWardrobeStatusColumnError(error.message)) {
      const fallbackResponse = await supabase
        .from('wardrobe')
        .select(LEGACY_WARDROBE_SELECT_FIELDS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      data = fallbackResponse.data;
      error = fallbackResponse.error;
    }

    if (error) {
      console.error('ClosetScreen fetchWardrobe error:', error.message);
      Alert.alert('Error', 'Failed to load your closet.');
      setWardrobe([]);
      setLoading(false);
      return;
    }

    setWardrobe((data || []).filter((item: any) => item?.wardrobe_status !== 'scanned_candidate'));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchWardrobe();
    }
  }, [fetchWardrobe, isFocused]);

  useEffect(() => {
    setVisibleCount(WARDROBE_PAGE_SIZE);
  }, [advancedFilters, filter, searchQuery, wardrobe.length]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWardrobe();
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
