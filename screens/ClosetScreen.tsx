import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Modal, Alert, ScrollView,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import {  colors ,spacing, radii } from '../lib/theme';

import ClosetHeader from '../components/Closet/ClosetHeader';
import ClosetFilterPills from '../components/Closet/ClosetFilterPills';
import ClothingSection from '../components/Closet/ClothingSection';
import ClothingCard from '../components/Closet/ClothingCard';
import EditModeToolbar from '../components/Closet/EditModeToolbar';
import FilterModal from '../components/Closet/modal/FilterModal';
import ViewItemModal from '../components/Closet/modal/ViewItemModal';
import EditItemModal from '../components/Closet/modal/EditItemModal';
import EmptyState from '../components/Closet/EmptyState';
import LoadingSkeleton from '../components/Closet/LoadingSkeleton';

const MAIN_CATEGORIES = ['top', 'bottom', 'shoes', 'outerwear', 'accessory', 'layer', 'onepiece'];

export default function ClosetScreen() {
  const [wardrobe, setWardrobe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editMode, setEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [reopenIndex, setReopenIndex] = useState(null);
  const [modalItems, setModalItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: 'all',
    colors: [],
    seasons: [],
    listedOnly: false,
  });

  const isFocused = useIsFocused();
  const navigation = useNavigation();

 
  useEffect(() => {
    if (isFocused) {
      fetchWardrobe();
    }
  }, [isFocused]);

  // keep screen in sync if user logs in/out without navigating
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWardrobe();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchWardrobe = async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setWardrobe([]);
      setLoading(false);
      Alert.alert('Not Logged In', 'Please log in to view your closet.');
      return;
    }

    const { data, error } = await supabase
      .from('wardrobe')
      .select('*')
      .eq('user_id', user.id) // only your items
      .order('created_at', { ascending: false });

    if (!error) setWardrobe(data || []);
    setLoading(false);
  };

  const filteredWardrobe = wardrobe.filter((item) => {
    const matchesCategory =
      advancedFilters.category === 'all' || item.main_category === advancedFilters.category;
    const matchesColor =
      advancedFilters.colors.length === 0 || advancedFilters.colors.includes(item.primary_color);
    const matchesSeason =
      advancedFilters.seasons.length === 0 || advancedFilters.seasons.includes(item.season);
    const matchesListed = !advancedFilters.listedOnly || item.listed === true;
    const matchesSearch =
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesColor && matchesSeason && matchesListed && matchesSearch;
  });

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleMultiDelete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('wardrobe')
      .delete()
      .in('id', selectedItems)
      .eq('user_id', user.id); // extra safety with RLS

    if (!error) {
      setSelectedItems([]);
      setEditMode(false);
      fetchWardrobe();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ClosetHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        editMode={editMode}
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.xl * 2.5 }}
          showsVerticalScrollIndicator={false}
        >
          {MAIN_CATEGORIES.map((category) => {
            const items = filteredWardrobe.filter((i) => i.main_category === category);
            return items.length > 0 ? (
              <ClothingSection
                key={category}
                title={category.charAt(0).toUpperCase() + category.slice(1)}
                items={items}
                editMode={editMode}
                selectedItems={selectedItems}
                toggleItemSelection={toggleItemSelection}
                setSelectedIndex={(index) => {
                  setModalItems(items);
                  setSelectedIndex(index);
                }}
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
                        const { error } = await supabase
                          .from('wardrobe')
                          .delete()
                          .eq('id', item.id);
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
        setSelectedCategories={(cats) =>
          setAdvancedFilters((prev) => ({ ...prev, category: cats[0] || 'all' }))
        }
        selectedColors={advancedFilters.colors}
        setSelectedColors={(colors) => setAdvancedFilters((prev) => ({ ...prev, colors }))}
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
          const index = modalItems.findIndex((i) => i.id === item.id);
          setReopenIndex(index);
          setSelectedIndex(null);
          setEditingItem(item);
        }}
        onStyle={(item) => {
          navigation.navigate('StyleItemScreen', { item });
        }}
      />

      <EditItemModal
        visible={editingItem !== null}
        item={editingItem}
        onClose={() => {
          setEditingItem(null);
          setTimeout(() => {
            setSelectedIndex(reopenIndex);
            setReopenIndex(null);
          }, 300);
        }}
        onSave={async (updated) => {
          const { error } = await supabase
            .from('wardrobe')
            .update(updated)
            .eq('id', editingItem.id);
          if (!error) {
            setEditingItem(null);
            fetchWardrobe();
            setTimeout(() => {
              setSelectedIndex(reopenIndex);
              setReopenIndex(null);
            }, 300);
          }
        }}
      />
    </SafeAreaView>
  );
}
