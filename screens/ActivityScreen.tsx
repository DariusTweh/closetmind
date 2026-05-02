import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ActivityEmptyState from '../components/Activity/ActivityEmptyState';
import ActivityRow from '../components/Activity/ActivityRow';
import { getUnreadActivityCount, loadActivityEvents, markActivityEventsRead } from '../lib/activityService';
import { loadFitCheckPostById } from '../lib/fitCheckService';
import { colors, spacing, typography } from '../lib/theme';
import type { FitCheckActivityEvent } from '../types/fitCheck';

const FILTERS = ['All', 'Fits', 'Follows'] as const;
type ActivityFilter = (typeof FILTERS)[number];

export default function ActivityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('All');
  const [events, setEvents] = useState<FitCheckActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingEventId, setOpeningEventId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        setLoading(true);
        const nextEvents = await loadActivityEvents();
        if (!active) return;
        setEvents(nextEvents);
        setLoading(false);

        const unreadIds = nextEvents.filter((event) => !event.read_at).map((event) => event.id);
        if (unreadIds.length) {
          void markActivityEventsRead(unreadIds);
          setEvents((current) =>
            current.map((event) =>
              unreadIds.includes(event.id)
                ? { ...event, read_at: new Date().toISOString() }
                : event,
            ),
          );
        }

        void getUnreadActivityCount();
      };

      void load();

      return () => {
        active = false;
      };
    }, []),
  );

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'All') return events;
    if (activeFilter === 'Follows') {
      return events.filter((event) => event.event_type === 'follow');
    }
    return events.filter((event) => event.event_type !== 'follow');
  }, [activeFilter, events]);

  const handleOpenEvent = async (event: FitCheckActivityEvent) => {
    if (openingEventId) return;
    if (event.event_type === 'follow') {
      navigation.navigate('PublicProfile', { userId: event.actor_id, source: 'activity_follow' });
      return;
    }

    if (!event.post_id) {
      Alert.alert('No linked fit', 'This activity doesn’t have a fit attached yet.');
      return;
    }

    setOpeningEventId(event.id);
    try {
      const post = await loadFitCheckPostById(event.post_id);
      if (!post) {
        Alert.alert('Fit unavailable', 'That fit is not available right now.');
        return;
      }
      navigation.navigate('FitPostDetail', { post });
    } catch (error: any) {
      console.error('Open activity post failed:', error);
      Alert.alert('Could not open fit', String(error?.message || 'Try again in a moment.'));
    } finally {
      setOpeningEventId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Activity</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>Social loop</Text>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>Everything happening around your fits, follows, and saves.</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const active = filter === activeFilter;
          return (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.9}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityRow event={item} onPress={() => void handleOpenEvent(item)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 36 },
            !filteredEvents.length && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ActivityEmptyState
              title={activeFilter === 'Follows' ? 'No follow activity yet' : 'No activity yet'}
              description={
                activeFilter === 'Follows'
                  ? 'When people follow you, it will land here.'
                  : 'Reactions, saves, style notes, follows, and your own daily fit posts will show up here.'
              }
            />
          }
          ListFooterComponent={openingEventId ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.textPrimary} />
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  topBarSpacer: {
    width: 44,
  },
  headerBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: 14,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  title: {
    marginTop: 6,
    fontSize: 36,
    lineHeight: 40,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 18,
    paddingBottom: 14,
  },
  filterChip: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  filterChipTextActive: {
    color: colors.textOnAccent,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 18,
    alignItems: 'center',
  },
});
