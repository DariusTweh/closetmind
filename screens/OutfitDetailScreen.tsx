import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { spacing, typography } from '../lib/theme';
import OutfitDetailActions from '../components/SavedOutfits/OutfitDetailActions';
import OutfitDetailHeader from '../components/SavedOutfits/OutfitDetailHeader';
import OutfitDetailItemCard from '../components/SavedOutfits/OutfitDetailItemCard';
import { loadSavedOutfitItemsForDetail } from '../services/savedOutfitService';

function buildSubtitle(outfit: any) {
  const context = String(outfit?.context || '').trim().replace(/\s+°F$/i, '').trim();
  const weather = outfit?.weather;
  if (context) return context;
  if (weather !== undefined && weather !== null && weather !== '') {
    return `${weather}°F`;
  }
  return 'Saved from your archive';
}

export default function OutfitDetailScreen({ route, navigation }) {
  const { outfit } = route.params;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userId, setUserId] = useState(null);
  const savedItemCount = useMemo(
    () => (Array.isArray(outfit?.resolvedItems) ? outfit.resolvedItems.length : Array.isArray(outfit?.items) ? outfit.items.length : 0),
    [outfit.items, outfit.resolvedItems]
  );
  const subtitle = useMemo(() => buildSubtitle(outfit), [outfit]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view this outfit.');
        navigation.goBack();
        return;
      }
      setUserId(user.id);
      await loadItems(user.id);
    };
    init();
  }, []);

  const loadItems = async (uid) => {
    // ✅ Check favorite status securely
    const { data: favorite, error: favoriteError } = await supabase
      .from('saved_outfits')
      .select('is_favorite')
      .eq('id', outfit.id)
      .eq('user_id', uid)
      .maybeSingle();

    if (favoriteError) {
      console.error('❌ Failed to load favorite state:', favoriteError.message);
    } else {
      setIsFavorited(!!favorite?.is_favorite);
    }

    try {
      const detailedOutfit = await loadSavedOutfitItemsForDetail({
        outfit,
        userId: uid,
      });
      setItems(detailedOutfit?.resolvedItems || []);
    } catch (error: any) {
      console.error('❌ Failed to load outfit items:', error?.message || error);
      Alert.alert('Error', 'Could not load outfit details.');
      setItems(Array.isArray(outfit?.resolvedItems) ? outfit.resolvedItems : Array.isArray(outfit?.items) ? outfit.items : []);
    }

    setLoading(false);
  };

  const handleOpenItem = useCallback(
    (item: any) => {
      if (!item) return;

      if (item.source_type === 'external') {
        if (!item.product_url) {
          Alert.alert('No product link', 'This saved item does not have a product page attached yet.');
          return;
        }

        navigation.navigate('ImportBrowser', {
          initialUrl: item.product_url,
          initialTitle: item.title || item.name || 'Saved product',
        });
        return;
      }

      navigation.navigate('StyleItemScreen', { item });
    },
    [navigation],
  );

  const handleDelete = async () => {
    const { error } = await supabase
      .from('saved_outfits')
      .delete()
      .eq('id', outfit.id)
      .eq('user_id', userId);

    if (error) {
      Alert.alert('Error', 'Failed to delete outfit.');
    } else {
      Alert.alert('Outfit deleted.');
      navigation.goBack();
    }
  };

  const toggleFavorite = async () => {
    const { error } = await supabase
      .from('saved_outfits')
      .update({ is_favorite: !isFavorited })
      .eq('id', outfit.id)
      .eq('user_id', userId);

    if (!error) {
      setIsFavorited(!isFavorited);
    } else {
      Alert.alert('Error', 'Failed to update favorite.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OutfitDetailHeader
        title={outfit.name || 'Untitled Fit'}
        subtitle={subtitle}
        itemCount={items.length || savedItemCount}
        season={outfit.season}
        isFavorited={isFavorited}
        onBack={() => navigation.goBack()}
        onToggleFavorite={toggleFavorite}
      />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 132 + Math.max(insets.bottom, 10) }]}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="rgba(28, 28, 28, 0.72)" />
            <Text style={styles.loadingText}>Loading saved look</Text>
          </View>
        ) : (
          items.map(item => (
            <OutfitDetailItemCard key={item.id} item={item} onPress={() => handleOpenItem(item)} />
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <OutfitDetailActions
        onTryOn={() => navigation.navigate('TryOn', { items })}
        onDelete={handleDelete}
        disabled={loading || items.length === 0}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fafaff',
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingWrap: {
    marginTop: spacing.xl * 1.5,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: 'rgba(28, 28, 28, 0.72)',
    fontFamily: typography.fontFamily,
  },
});
