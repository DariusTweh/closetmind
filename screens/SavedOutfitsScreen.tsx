import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { colors, spacing } from '../lib/theme';

import HeaderControls from '../components/SavedOutfits/HeaderControls';
import OutfitCard from '../components/SavedOutfits/OutfitCard';
import EmptyState from '../components/SavedOutfits/EmptyState';
import { fetchSavedOutfitsPage } from '../services/savedOutfitService';

const PAGE_SIZE = 20;

export default function SavedOutfitsScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const tabBarHeight = useBottomTabBarHeight();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Favorites' | 'Spring' | 'Summer' | 'Fall' | 'Winter'>('All');
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const pagingRef = useRef(false);

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id as string;
  }, []);

  const loadPage = useCallback(async (reset = false) => {
    const uid = userId || (await resolveUser());
    if (!uid) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
      return;
    }

    if (reset) {
      if (pagingRef.current) return;
      pagingRef.current = true;
      setRefreshing(true);
      setLoading(true);
      setHasMore(true);
      hasMoreRef.current = true;
      pageRef.current = 0;
    } else if (pagingRef.current || !hasMoreRef.current) {
      return;
    } else {
      pagingRef.current = true;
      setLoadingMore(true);
    }

    const nextPage = reset ? 0 : pageRef.current;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      setUserId(uid);

      const detailed = await fetchSavedOutfitsPage({
        userId: uid,
        from,
        to,
      });
      setOutfits((previous) => {
        if (reset) return detailed;
        const seen = new Set(previous.map((item) => item.id));
        return [...previous, ...detailed.filter((item) => !seen.has(item.id))];
      });
      pageRef.current = nextPage + 1;
      hasMoreRef.current = detailed.length === PAGE_SIZE;
      setHasMore(hasMoreRef.current);
    } catch (e: any) {
      console.error('❌ SavedOutfitsScreen load error:', e?.message || e);
      Alert.alert('Error', 'Failed to load outfits.');
    } finally {
      pagingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [navigation, resolveUser, userId]);

  useEffect(() => {
    if (isFocused) {
      void loadPage(true);
    }
  }, [isFocused, loadPage]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void loadPage(true);
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [loadPage]);

  const deleteOutfit = async (id: string) => {
    if (!userId) return;
    const prev = outfits;
    setOutfits(prev.filter(o => o.id !== id));
    const { error } = await supabase.from('saved_outfits').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      setOutfits(prev); // rollback
      Alert.alert('Error', 'Could not delete outfit.');
    }
  };

  const toggleFavorite = async (id: string) => {
    if (!userId) return;
    const target = outfits.find(o => o.id === id);
    if (!target) return;
    const updated = !target.is_favorite;

    // optimistic
    setOutfits(prev => prev.map(o => (o.id === id ? { ...o, is_favorite: updated } : o)));

    const { error } = await supabase
      .from('saved_outfits')
      .update({ is_favorite: updated })
      .eq('id', id)
      .eq('user_id', userId);
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
        onPress={() => (navigation as any).navigate('OutfitDetail', { outfit })}
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
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + spacing.xl + 20 }]}
        data={filtered}
        renderItem={renderOutfit}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.textSecondary} style={styles.footerLoader} /> : null}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={() => { void loadPage(true); }}
        onEndReached={() => { void loadPage(false); }}
        onEndReachedThreshold={0.35}
      />

      {loading && <ActivityIndicator size="large" color={colors.textSecondary} style={styles.loadingOverlay} />}
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
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 14,
  },
  fixedHeader: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  footerLoader: {
    marginTop: 12,
    marginBottom: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -12,
  },
});
