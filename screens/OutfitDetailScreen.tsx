import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import OutfitCanvas from '../components/OutfitCanvas/OutfitCanvas';
import OutfitSummaryCard from '../components/OutfitCanvas/OutfitSummaryCard';
import WhyItWorksPanel from '../components/OutfitCanvas/WhyItWorksPanel';
import OutfitDetailActions from '../components/SavedOutfits/OutfitDetailActions';
import OutfitDetailHeader from '../components/SavedOutfits/OutfitDetailHeader';
import { buildLegacyCanvasLayoutMap, buildOutfitCanvasItems, buildOutfitCanvasReasons } from '../components/OutfitCanvas/utils';
import { supabase } from '../lib/supabase';
import { spacing, typography } from '../lib/theme';
import { loadSavedOutfitItemsForDetail } from '../services/savedOutfitService';
import { loadStyleCanvas } from '../services/styleCanvasService';

function buildSubtitle(outfit: any) {
  const context = String(outfit?.context || '').trim().replace(/\s+°F$/i, '').trim();
  const weather = outfit?.weather;
  if (context) return context;
  if (weather !== undefined && weather !== null && weather !== '') {
    return `${weather}°F`;
  }
  return 'Saved from your archive';
}

function formatSeason(value: any) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (normalized.toLowerCase() === 'all') return 'Any season';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function OutfitDetailScreen({ route, navigation }) {
  const { outfit } = route.params;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [legacyLayoutMap, setLegacyLayoutMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeReasonItemId, setActiveReasonItemId] = useState<string | null>(null);

  const savedItemCount = useMemo(
    () =>
      Array.isArray(outfit?.resolvedItems)
        ? outfit.resolvedItems.length
        : Array.isArray(outfit?.items)
          ? outfit.items.length
          : 0,
    [outfit.items, outfit.resolvedItems],
  );
  const subtitle = useMemo(() => buildSubtitle(outfit), [outfit]);

  const canvasItems = useMemo(
    () => buildOutfitCanvasItems(items, { legacyLayoutMap }),
    [items, legacyLayoutMap],
  );
  const reasonItems = useMemo(() => buildOutfitCanvasReasons(canvasItems), [canvasItems]);
  const summaryChips = useMemo(
    () =>
      [
        canvasItems.length ? `${canvasItems.length} pieces` : null,
        formatSeason(outfit?.season),
        outfit?.activity_label || null,
        outfit?.day_label || null,
      ].filter(Boolean) as string[],
    [canvasItems.length, outfit?.activity_label, outfit?.day_label, outfit?.season],
  );

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view this outfit.');
        navigation.goBack();
        return;
      }
      setUserId(user.id);
      await loadItems(user.id);
    };
    void init();
  }, [navigation]);

  const loadItems = useCallback(
    async (uid: string) => {
      const { data: favorite, error: favoriteError } = await supabase
        .from('saved_outfits')
        .select('is_favorite')
        .eq('id', outfit.id)
        .eq('user_id', uid)
        .maybeSingle();

      if (favoriteError) {
        console.error('Failed to load favorite state:', favoriteError.message);
      } else {
        setIsFavorited(!!favorite?.is_favorite);
      }

      try {
        const detailedOutfit = await loadSavedOutfitItemsForDetail({
          outfit,
          userId: uid,
        });
        const resolvedItems = detailedOutfit?.resolvedItems || [];
        const savedItems = Array.isArray(detailedOutfit?.items) ? detailedOutfit.items : Array.isArray(outfit?.items) ? outfit.items : [];
        const hasSavedLayouts = savedItems.some((entry: any) => entry?.layout);

        setItems(resolvedItems);
        setActiveReasonItemId(null);

        if (hasSavedLayouts || !detailedOutfit?.canvas_id) {
          setLegacyLayoutMap({});
        } else {
          try {
            const savedCanvas = await loadStyleCanvas(String(detailedOutfit.canvas_id));
            setLegacyLayoutMap(buildLegacyCanvasLayoutMap(savedCanvas?.items || []));
          } catch (canvasError: any) {
            console.error('Failed to load legacy canvas layout:', canvasError?.message || canvasError);
            setLegacyLayoutMap({});
          }
        }
      } catch (error: any) {
        console.error('Failed to load outfit items:', error?.message || error);
        Alert.alert('Error', 'Could not load outfit details.');
        setItems(Array.isArray(outfit?.resolvedItems) ? outfit.resolvedItems : Array.isArray(outfit?.items) ? outfit.items : []);
        setLegacyLayoutMap({});
      } finally {
        setLoading(false);
      }
    },
    [outfit],
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
        itemCount={canvasItems.length || savedItemCount}
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
          <View style={styles.contentStack}>
            <OutfitSummaryCard
              eyebrow={outfit?.outfit_mode === 'travel' ? 'Saved travel look' : 'Saved look'}
              title={outfit.name || 'Untitled Fit'}
              summary={subtitle}
              chips={summaryChips}
            />

            <OutfitCanvas
              items={canvasItems}
              imagePreference="display"
              highlightedItemId={activeReasonItemId}
              onPressItem={setActiveReasonItemId}
              emptyLabel="This saved look does not have any visible items yet."
            />

            <WhyItWorksPanel
              summary={subtitle}
              items={reasonItems}
              activeItemId={activeReasonItemId}
              onChangeActiveItemId={setActiveReasonItemId}
            />
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <OutfitDetailActions
        onTryOn={() => navigation.navigate('TryOn', { items, savedOutfitId: outfit?.id || null })}
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
    paddingTop: spacing.sm,
  },
  contentStack: {
    gap: spacing.md,
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
  bottomSpacer: {
    height: 24,
  },
});
