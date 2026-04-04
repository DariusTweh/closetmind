
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Modal, Alert, ScrollView,
  StyleSheet, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import ClosetHeader from '../components/Closet/ClosetHeader';
import ClosetFilterPills from '../components/Closet/ClosetFilterPills';
import ClothingSection from '../components/Closet/ClothingSection';
import ClothingCard from '../components/Closet/ClothingCard';
import EditModeToolbar from '../components/Closet/EditModeToolbar';
import FilterModal from '../components/Closet/modal/FilterModal';
import EmptyState from '../components/Closet/EmptyState';
import LoadingSkeleton from '../components/Closet/LoadingSkeleton';

const HARDCODED_USER_ID = 'e4679c16-7ee2-4db8-8bc5-6e78642537e8';
const MAIN_CATEGORIES = ['top', 'bottom', 'shoes', 'outerwear', 'accessory', 'layer', 'onepiece'];

export default function ClosetScreen() {
  const [wardrobe, setWardrobe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editMode, setEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [advancedFilters, setAdvancedFilters] = useState({
    category: 'all',
    colors: [],
    seasons: [],
    listedOnly: false,
  });

  useEffect(() => {
    fetchWardrobe();
  }, []);

  const fetchWardrobe = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wardrobe')
      .select('*')
      .eq('user_id', HARDCODED_USER_ID);

    if (!error) setWardrobe(data || []);
    setLoading(false);
  };

  const filteredWardrobe = wardrobe.filter((item) => {
    const matchesCategory = advancedFilters.category === 'all' || item.main_category === advancedFilters.category;
    const matchesColor = advancedFilters.colors.length === 0 || advancedFilters.colors.includes(item.primary_color);
    const matchesSeason = advancedFilters.seasons.length === 0 || advancedFilters.seasons.includes(item.season);
    const matchesListed = !advancedFilters.listedOnly || item.listed === true;
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesColor && matchesSeason && matchesListed && matchesSearch;
  });

  const toggleItemSelection = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleMultiDelete = async () => {
    const { error } = await supabase.from('wardrobe').delete().in('id', selectedItems);
    if (!error) {
      setSelectedItems([]);
      setEditMode(false);
      fetchWardrobe();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf8f3' }}>
      <ClosetHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onEditPress={() => {
          setEditMode(!editMode);
          if (editMode) setSelectedItems([]);
        }}
      />

      <ClosetFilterPills activeFilter={filter} setActiveFilter={setFilter} />

      {loading ? (
        <LoadingSkeleton count={4} />
      ) : filteredWardrobe.length === 0 ? (
        <EmptyState message="No matching clothing found." />
      ) : filter === 'all' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {MAIN_CATEGORIES.map((category) => {
            const items = filteredWardrobe.filter((i) => i.main_category === category);
            return items.length > 0 ? (
              <ClothingSection
                key={category}
                title={category.charAt(0).toUpperCase() + category.slice(1)}
                items={items}
              />
            ) : null;
          })}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredWardrobe.filter(i => i.main_category === filter)}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 20 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListEmptyComponent={<EmptyState message="No items in this category." />}
          renderItem={({ item }) => (
            <ClothingCard
              item={item}
              onPress={() => {
                if (editMode) toggleItemSelection(item.id);
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
                        const { error } = await supabase.from('wardrobe').delete().eq('id', item.id);
                        if (!error) fetchWardrobe();
                      }
                    }
                  ]);
                }
              }}
            />
          )}
        />
      )}

      {editMode && selectedItems.length > 0 && (
        <EditModeToolbar
          onCancel={() => {
            setEditMode(false);
            setSelectedItems([]);
          }}
          onDelete={handleMultiDelete}
        />
      )}

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        selectedCategories={[advancedFilters.category]}
        setSelectedCategories={(cats) => setAdvancedFilters((prev) => ({ ...prev, category: cats[0] || 'all' }))}
        selectedColors={advancedFilters.colors}
        setSelectedColors={(colors) => setAdvancedFilters((prev) => ({ ...prev, colors }))}
        selectedSeasons={advancedFilters.seasons}
        setSelectedSeasons={(seasons) => setAdvancedFilters((prev) => ({ ...prev, seasons }))}
        listedOnly={advancedFilters.listedOnly}
        setListedOnly={(val) => setAdvancedFilters((prev) => ({ ...prev, listedOnly: val }))}
        onApply={() => setShowFilters(false)}
        onClear={() => setAdvancedFilters({ category: 'all', colors: [], seasons: [], listedOnly: false })}
      />
    </View>
  );
}
