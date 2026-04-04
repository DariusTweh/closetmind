import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { colors, spacing, radii } from '../lib/theme';

import HeaderControls from '../components/SavedOutfits/HeaderControls';
import OutfitCard from '../components/SavedOutfits/OutfitCard';
import EmptyState from '../components/SavedOutfits/EmptyState';

const DISPLAY_ORDER = ['onepiece', 'top', 'layer', 'bottom', 'shoes', 'outerwear', 'accessory'];

export default function SavedOutfitsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Favorites' | 'Spring' | 'Summer' | 'Fall' | 'Winter'>('All');

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id as string;
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await resolveUser();
      if (!uid) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }

      // 1) Get all outfits for this user
      const { data: savedOutfits, error: outfitsErr } = await supabase
        .from('saved_outfits')
        .select('id, name, context, season, is_favorite, created_at, items')
        .eq('user_id', uid) // keep for clarity even if RLS is on
        .order('created_at', { ascending: false });

      if (outfitsErr) throw outfitsErr;

      // 2) Collect all wardrobe IDs we need, unique
      const allIds = Array.from(
        new Set(
          (savedOutfits || [])
            .flatMap(o => (Array.isArray(o.items) ? o.items : []))
            .map((i: any) => i?.id)
            .filter(Boolean)
        )
      );

      // 3) One fetch for all wardrobe items
      const { data: wardrobeItems, error: wardrobeErr } = allIds.length
        ? await supabase
            .from('wardrobe')
            .select('id, image_url, name, type, main_category, primary_color, secondary_colors, pattern_description, vibe_tags, season')
            .in('id', allIds)
        : { data: [], error: null };

      if (wardrobeErr) throw wardrobeErr;

      const byId = new Map((wardrobeItems || []).map((w: any) => [w.id, w]));

      // 4) Attach and sort items per outfit
      const detailed = (savedOutfits || []).map(o => {
        const ids = Array.isArray(o.items) ? o.items.map((i: any) => i?.id).filter(Boolean) : [];
        const sortedItems = ids
          .map((id: string) => byId.get(id))
          .filter(Boolean)
          .sort((a: any, b: any) => DISPLAY_ORDER.indexOf(a.main_category) - DISPLAY_ORDER.indexOf(b.main_category));
        return { ...o, wardrobeItems: sortedItems };
      });

      setOutfits(detailed);
    } catch (e: any) {
      console.error('❌ SavedOutfitsScreen load error:', e?.message || e);
      Alert.alert('Error', 'Failed to load outfits.');
    } finally {
      setLoading(false);
    }
  }, [navigation, resolveUser]);

  useEffect(() => {
    if (isFocused) fetchAll();
  }, [isFocused, fetchAll]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => fetchAll());
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [fetchAll]);

  const deleteOutfit = async (id: string) => {
    const prev = outfits;
    setOutfits(prev.filter(o => o.id !== id));
    const { error } = await supabase.from('saved_outfits').delete().eq('id', id);
    if (error) {
      setOutfits(prev); // rollback
      Alert.alert('Error', 'Could not delete outfit.');
    }
  };

  const toggleFavorite = async (id: string) => {
    const target = outfits.find(o => o.id === id);
    if (!target) return;
    const updated = !target.is_favorite;

    // optimistic
    setOutfits(prev => prev.map(o => (o.id === id ? { ...o, is_favorite: updated } : o)));

    const { error } = await supabase.from('saved_outfits').update({ is_favorite: updated }).eq('id', id);
    if (error) {
      // rollback
      setOutfits(prev => prev.map(o => (o.id === id ? { ...o, is_favorite: !updated } : o)));
      Alert.alert('Error', 'Could not update favorite.');
    }
  };

  const filtered = useMemo(() => {
    return outfits.filter(outfit => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        outfit.name?.toLowerCase().includes(q) ||
        outfit.context?.toLowerCase().includes(q);

      const matchFilter =
        activeFilter === 'All' ||
        (activeFilter === 'Favorites' && outfit.is_favorite) ||
        (['Spring', 'Summer', 'Fall', 'Winter'].includes(activeFilter) &&
          outfit.season?.toLowerCase() === activeFilter.toLowerCase());

      return matchSearch && matchFilter;
    });
  }, [outfits, searchQuery, activeFilter]);

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
        onPress={() => navigation.navigate('OutfitDetail' as never, { outfit } as never)}
        onToggleFavorite={() => toggleFavorite(outfit.id)}
      />
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.fixedHeader}>
        <HeaderControls
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        renderItem={renderOutfit}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        keyboardShouldPersistTaps="handled"
      />

      {loading && <ActivityIndicator size="large" color="#888" style={{ marginTop: 40 }} />}
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
    width: 64,
    borderTopRightRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    marginBottom: spacing.md + 2,
  },
  fixedHeader: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    paddingTop: spacing.md + 4,
    paddingBottom: spacing.md - 2,
    zIndex: 10,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2.5, // ~120
    paddingTop: 0,
  },
});