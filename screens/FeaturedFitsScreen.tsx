import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import FeaturedFitCard from '../components/Profile/FeaturedFitCard';
import FeaturedFitsEmptyState from '../components/Profile/FeaturedFitsEmptyState';
import AddFeaturedFitModal from '../components/Profile/AddFeaturedFitModal';
import {
  addFeaturedFits,
  fetchFeatureableSavedOutfits,
  fetchFeaturedFits,
  removeFeaturedFit,
  saveFeaturedFitOrder,
} from '../services/featuredFitsService';

function reindexFeaturedFits(items: any[]) {
  return (items || []).map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

export default function FeaturedFitsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [schemaReady, setSchemaReady] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [featureableOutfits, setFeatureableOutfits] = useState<any[]>([]);

  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user?.id) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }

      setUserId(user.id);
      const response = await fetchFeaturedFits(user.id);
      setSchemaReady(response.available);
      setItems(reindexFeaturedFits(response.items));
    } catch (error: any) {
      console.error('FeaturedFitsScreen hydrate failed:', error?.message || error);
      Alert.alert('Error', error?.message || 'Could not load featured fits.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    if (isFocused) {
      void hydrate();
    }
  }, [hydrate, isFocused]);

  const openAddModal = useCallback(async () => {
    if (!userId) return;
    if (!schemaReady) {
      Alert.alert('Migration needed', 'Apply the featured fits migration before using this screen.');
      return;
    }

    setModalVisible(true);
    setModalLoading(true);
    try {
      const outfits = await fetchFeatureableSavedOutfits({
        userId,
        excludeSavedOutfitIds: items.map((item) => String(item?.saved_outfit_id || '')),
      });
      setFeatureableOutfits(outfits);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Could not load saved looks.');
    } finally {
      setModalLoading(false);
    }
  }, [items, schemaReady, userId]);

  const applyOrder = useCallback(
    async (nextItems: any[], previousItems: any[]) => {
      setItems(nextItems);
      try {
        await saveFeaturedFitOrder({
          userId,
          items: nextItems.map((item, index) => ({
            id: item.id,
            sort_order: index,
          })),
        });
      } catch (error: any) {
        setItems(previousItems);
        Alert.alert('Order error', error?.message || 'Could not update featured fit order.');
      }
    },
    [userId],
  );

  const moveItem = useCallback(
    async (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= items.length) return;
      const previousItems = items;
      const nextItems = [...items];
      const [current] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, current);
      await applyOrder(reindexFeaturedFits(nextItems), previousItems);
    },
    [applyOrder, items],
  );

  const handleRemove = useCallback(
    async (index: number) => {
      const target = items[index];
      if (!target?.id) return;
      const previousItems = items;
      const nextItems = reindexFeaturedFits(items.filter((item) => item.id !== target.id));
      setItems(nextItems);

      try {
        await removeFeaturedFit({ id: target.id, userId });
        if (nextItems.length) {
          await saveFeaturedFitOrder({
            userId,
            items: nextItems.map((item, sortIndex) => ({ id: item.id, sort_order: sortIndex })),
          });
        }
      } catch (error: any) {
        setItems(previousItems);
        Alert.alert('Remove error', error?.message || 'Could not remove this featured fit.');
      }
    },
    [items, userId],
  );

  const handleAddFits = useCallback(
    async (outfitIds: string[]) => {
      if (!userId) return;
      setModalSubmitting(true);
      try {
        await addFeaturedFits({
          userId,
          savedOutfitIds: outfitIds,
          currentFeaturedCount: items.length,
        });
        setModalVisible(false);
        setFeatureableOutfits([]);
        await hydrate();
      } catch (error: any) {
        Alert.alert('Add error', error?.message || 'Could not feature those looks.');
      } finally {
        setModalSubmitting(false);
      }
    },
    [hydrate, items.length, userId],
  );

  const headerSummary = useMemo(() => {
    const count = items.length;
    return `${count} featured ${count === 1 ? 'look' : 'looks'}`;
  }, [items.length]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={21} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.88} onPress={() => void openAddModal()} style={styles.addButton}>
            <Ionicons name="add" size={16} color={colors.textOnAccent} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.eyebrow}>Profile ecosystem</Text>
        <Text style={styles.title}>Featured Fits</Text>
        <Text style={styles.subtitle}>Pin the outfits that define your style profile.</Text>
        <Text style={styles.summary}>{headerSummary}</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : items.length ? (
          <View style={styles.listWrap}>
            {items.map((item, index) => (
              <FeaturedFitCard
                key={item.id}
                fit={item}
                onMoveUp={() => {
                  void moveItem(index, -1);
                }}
                onMoveDown={() => {
                  void moveItem(index, 1);
                }}
                onRemove={() => {
                  void handleRemove(index);
                }}
                disableMoveUp={index === 0}
                disableMoveDown={index === items.length - 1}
              />
            ))}
          </View>
        ) : (
          <FeaturedFitsEmptyState onAdd={() => void openAddModal()} />
        )}
      </ScrollView>

      <AddFeaturedFitModal
        visible={modalVisible}
        outfits={featureableOutfits}
        loading={modalLoading}
        submitting={modalSubmitting}
        onClose={() => {
          setModalVisible(false);
          setFeatureableOutfits([]);
        }}
        onSubmit={handleAddFits}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    color: colors.textOnAccent,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 8,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'Georgia',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  summary: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontFamily: typography.fontFamily,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrap: {
    paddingBottom: spacing.md,
  },
});
