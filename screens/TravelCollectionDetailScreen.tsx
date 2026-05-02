import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FilterChip from '../components/SavedOutfits/FilterChip';
import OutfitCard from '../components/SavedOutfits/OutfitCard';
import TravelCollectionHeader from '../components/SavedOutfits/TravelCollectionHeader';
import { colors, spacing, typography } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { fetchTravelCollectionDetail, deleteTravelCollection } from '../services/travelCollectionsService';

export default function TravelCollectionDetailScreen({ route }) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const collectionId = String(route?.params?.collectionId || '').trim();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collection, setCollection] = useState<any | null>(null);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [activityLabels, setActivityLabels] = useState<string[]>([]);
  const [activeActivity, setActiveActivity] = useState('All');

  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id as string;
  }, []);

  const loadData = useCallback(async () => {
    const uid = userId || (await resolveUser());
    if (!uid || !collectionId) {
      navigation.goBack();
      return;
    }

    try {
      setUserId(uid);
      const detail = await fetchTravelCollectionDetail({
        collectionId,
        userId: uid,
      });
      setCollection(detail.collection);
      setOutfits(detail.outfits);
      setActivityLabels(detail.activityLabels);
      setActiveActivity((current) => {
        if (current === 'All') return current;
        return detail.activityLabels.includes(current) ? current : 'All';
      });
    } catch (error: any) {
      console.error('❌ TravelCollectionDetail load error:', error?.message || error);
      Alert.alert('Error', error?.message || 'Failed to load this trip.');
      navigation.goBack();
    }
  }, [collectionId, navigation, resolveUser, userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    if (!isFocused) return;
    setLoading(true);
    void refresh();
  }, [isFocused, refresh]);

  const filteredOutfits = useMemo(() => {
    if (activeActivity === 'All') return outfits;
    return outfits.filter(
      (outfit) => String(outfit?.activity_label || '').trim().toLowerCase() === activeActivity.toLowerCase(),
    );
  }, [activeActivity, outfits]);

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

  const handleDeleteTrip = () => {
    if (!collection?.id) return;

    Alert.alert(
      'Delete trip?',
      'This removes the trip only. Outfits in it will stay saved and be unassigned from the collection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTravelCollection({
                collectionId: String(collection.id),
                userId: userId || undefined,
                unassignOutfits: true,
              });
              navigation.goBack();
            } catch (error: any) {
              console.error('❌ Delete trip failed:', error?.message || error);
              Alert.alert('Error', error?.message || 'Could not delete this trip.');
            }
          },
        },
      ],
    );
  };

  const activityOptions = useMemo(() => ['All', ...activityLabels], [activityLabels]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.86}
        >
          <Ionicons name="chevron-back" size={22} color="rgba(28, 28, 28, 0.72)" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Trip Outfits</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <FlatList
        data={filteredOutfits}
        keyExtractor={(item) => String(item?.id || '')}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => {
          void refresh();
        }}
        renderItem={({ item: outfit }) => (
          <OutfitCard
            outfit={outfit}
            onPress={() => (navigation as any).navigate('OutfitDetail', { outfit })}
            onToggleFavorite={() => toggleFavorite(outfit.id)}
          />
        )}
        ListHeaderComponent={
          collection ? (
            <View>
              <TravelCollectionHeader
                collection={collection}
                outfitCount={outfits.length}
                onDelete={handleDeleteTrip}
                onGenerate={() =>
                  (navigation as any).navigate('MainTabs', {
                    screen: 'Generate',
                    params: {
                      initialMode: 'travel',
                      initialTravelCollectionId: collection.id,
                      initialActivityLabel: activeActivity !== 'All' ? activeActivity : undefined,
                      prefillNonce: Date.now(),
                    },
                  })
                }
              />

              {activityOptions.length > 1 ? (
                <View style={styles.activitySection}>
                  <Text style={styles.activityLabel}>Activities</Text>
                  <View style={styles.activityRow}>
                    {activityOptions.map((label) => (
                      <FilterChip
                        key={label}
                        label={label}
                        active={activeActivity === label}
                        onPress={() => setActiveActivity(label)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No outfits saved to this trip yet</Text>
              <Text style={styles.emptyStateText}>
                Generate a travel outfit and save it into this collection to start planning the trip.
              </Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  (navigation as any).navigate('MainTabs', {
                    screen: 'Generate',
                    params: {
                      initialMode: 'travel',
                      initialTravelCollectionId: collection?.id,
                      prefillNonce: Date.now(),
                    },
                  })
                }
                style={styles.emptyStateButton}
              >
                <Text style={styles.emptyStateButtonText}>Generate Travel Outfit</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.textSecondary} style={styles.loadingOverlay} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    paddingHorizontal: spacing.sm,
  },
  topBarSpacer: {
    width: 42,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  activitySection: {
    marginBottom: spacing.md,
  },
  activityLabel: {
    marginBottom: spacing.sm,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyState: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  emptyStateText: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  emptyStateButton: {
    marginTop: spacing.lg,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textOnAccent,
    fontFamily: typography.fontFamily,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -12,
  },
});
