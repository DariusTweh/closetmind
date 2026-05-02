import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import InsightCard from '../components/Stats/InsightCard';
import StatsHero from '../components/Stats/StatsHero';
import CategoryBarsSection from '../components/Stats/CategoryBarsSection';
import ColorChipsSection from '../components/Stats/ColorChipsSection';
import RecentActivitySection from '../components/Stats/RecentActivitySection';
import { fetchProfileAnalytics } from '../services/profileInsightsService';

export default function StatsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any | null>(null);

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

      const nextAnalytics = await fetchProfileAnalytics(user.id);
      setAnalytics(nextAnalytics);
    } catch (error) {
      console.error('StatsScreen hydrate failed:', error);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    if (isFocused) {
      void hydrate();
    }
  }, [hydrate, isFocused]);

  const metrics = analytics?.metrics;
  const recentMomentum = useMemo(() => {
    if (!metrics) return [];
    return [
      `${metrics.recentSaved7} saved ${metrics.recentSaved7 === 1 ? 'look' : 'looks'} in the last 7 days`,
      `${metrics.recentSaved30} saved ${metrics.recentSaved30 === 1 ? 'look' : 'looks'} in the last 30 days`,
      `Favorite rate ${metrics.favoriteRatio}%`,
      metrics.topColor ? `Top color: ${metrics.topColor}` : null,
    ].filter(Boolean);
  }, [metrics]);

  const heroItems = useMemo(() => {
    if (!metrics) return [];
    return [
      { key: 'closet', label: 'Closet', value: metrics.closetCount },
      { key: 'saved', label: 'Saved Looks', value: metrics.savedLookCount },
      { key: 'favorites', label: 'Favorites', value: metrics.favoriteLookCount },
      { key: 'featured', label: 'Featured', value: metrics.featuredFitCount },
    ];
  }, [metrics]);

  const empty = !loading && metrics && !metrics.closetCount && !metrics.savedLookCount;

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
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.eyebrow}>Style Activity</Text>
        <Text style={styles.title}>Your Style Signal</Text>
        <Text style={styles.subtitle}>
          A living snapshot of how your closet, saved looks, and style tendencies are taking shape.
        </Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
          </View>
        ) : empty ? (
          <InsightCard
            eyebrow="Style signal"
            title="No profile activity yet"
            subtitle="Add closet pieces or save a few looks to unlock wardrobe intelligence."
          />
        ) : (
          <>
            <StatsHero items={heroItems} />

            <InsightCard
              eyebrow="Closet composition"
              title={metrics?.topCategory ? `${metrics.topCategory} is leading your closet.` : 'Closet composition'}
              subtitle="See how your wardrobe is distributed across the categories you rely on most."
            >
              <CategoryBarsSection items={metrics?.categoryBreakdown?.slice(0, 6) || []} total={metrics?.closetCount || 0} />
            </InsightCard>

            <InsightCard
              eyebrow="Seasonal breakdown"
              title={metrics?.topSeason ? `${metrics.topSeason} shows up the most.` : 'Seasonal breakdown'}
              subtitle="These are the seasons your wardrobe leans toward right now."
            >
              <CategoryBarsSection items={metrics?.seasonBreakdown?.slice(0, 5) || []} total={metrics?.closetCount || 0} />
            </InsightCard>

            <InsightCard
              eyebrow="Color profile"
              title={metrics?.topColor ? `${metrics.topColor} is your dominant color.` : 'Color profile'}
              subtitle="Primary colors across your closet reveal the tones your style keeps returning to."
            >
              <ColorChipsSection items={metrics?.colorBreakdown?.slice(0, 6) || []} />
            </InsightCard>

            <InsightCard
              eyebrow="Vibe signal"
              title={metrics?.topVibe ? `${metrics.topVibe} is the clearest mood.` : 'Vibe signal'}
              subtitle="Explicit profile tags and wardrobe vibe tags combine to define your aesthetic direction."
            >
              <ColorChipsSection
                items={
                  metrics?.vibeBreakdown?.slice(0, 5)?.length
                    ? metrics.vibeBreakdown.slice(0, 5)
                    : (metrics?.profileStyleTags || []).map((tag: string) => ({ key: tag, label: tag, count: 1 }))
                }
              />
            </InsightCard>

            <InsightCard
              eyebrow="Recent momentum"
              title="How your archive is moving."
              subtitle="Derived activity, not social noise."
            >
              <RecentActivitySection items={recentMomentum} />
            </InsightCard>
          </>
        )}
      </ScrollView>
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
  headerSpacer: {
    width: 40,
    height: 40,
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
    marginBottom: spacing.lg,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
