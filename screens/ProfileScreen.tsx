import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import FitItemStrip from '../components/FitCheck/FitItemStrip';
import ProfileEmptyModule from '../components/Profile/ProfileEmptyModule';
import ProfileHeroCard from '../components/Profile/ProfileHeroCard';
import ProfileSectionCard from '../components/Profile/ProfileSectionCard';
import ProfileStatGrid from '../components/Profile/ProfileStatGrid';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import ProfileEcosystemCard from '../components/Profile/ProfileEcosystemCard';
import { fetchProfileAnalytics } from '../services/profileInsightsService';
import { loadCurrentProfileFitCheckSnapshot } from '../lib/fitCheckService';
import {
  FIT_CHECK_PROFILE_BOARDS,
  FIT_CHECK_PROFILE_CLOSET_PICKS,
  FIT_CHECK_PROFILE_FITS,
  FIT_CHECK_PROFILE_SOCIAL_STATS,
} from '../lib/fitCheckMock';

const DEFAULT_PROFILE = {
  username: 'New user',
  style_tags: [],
};
const DEFAULT_PROFILE_STATS = {
  closet: 0,
  saved: 0,
  favorites: 0,
  listed: 0,
  featured: 0,
  topColor: null as string | null,
  topSeason: null as string | null,
  favoriteRatio: 0,
};
const PROFILE_MEDIA_BUCKET = 'onboarding';

const PROFILE_SELECT_FIELDS = 'id, username, full_name, bio, avatar_url, avatar_path, style_tags';
const PROFILE_FALLBACK_SELECT_FIELDS = 'id, username, full_name, bio, avatar_url, style_tags';
const PROFILE_LEGACY_SELECT_FIELDS = 'id, username, full_name, avatar_url, style_tags';
const PROFILE_TABS = ['Fits', 'Boards', 'Closet Picks'] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

let PROFILE_SCREEN_CACHE: {
  userId: string | null;
  profile: any | null;
  stats: typeof DEFAULT_PROFILE_STATS;
  avatarUri: string | null;
  fitCheckSnapshot?: {
    socialStats: typeof FIT_CHECK_PROFILE_SOCIAL_STATS;
    fits: typeof FIT_CHECK_PROFILE_FITS;
    boards: typeof FIT_CHECK_PROFILE_BOARDS;
    closetPicks: typeof FIT_CHECK_PROFILE_CLOSET_PICKS;
  };
} | null = null;

function hasMissingProfileColumn(message: string, field: string) {
  const normalized = String(message || '').toLowerCase();
  const normalizedField = String(field || '').toLowerCase();
  return (
    normalized.includes(`profiles.${normalizedField}`) ||
    normalized.includes(`'${normalizedField}' column of 'profiles'`) ||
    (normalized.includes("column of 'profiles'") && normalized.includes(normalizedField))
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(!PROFILE_SCREEN_CACHE);
  const [userId, setUserId] = useState<string | null>(PROFILE_SCREEN_CACHE?.userId ?? null);
  const [profile, setProfile] = useState<any | null>(PROFILE_SCREEN_CACHE?.profile ?? null);
  const [stats, setStats] = useState<typeof DEFAULT_PROFILE_STATS>(PROFILE_SCREEN_CACHE?.stats ?? DEFAULT_PROFILE_STATS);
  const [authReady, setAuthReady] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(PROFILE_SCREEN_CACHE?.avatarUri ?? null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('Fits');
  const [fitCheckSnapshot, setFitCheckSnapshot] = useState(
    PROFILE_SCREEN_CACHE?.fitCheckSnapshot ?? {
      socialStats: FIT_CHECK_PROFILE_SOCIAL_STATS,
      fits: FIT_CHECK_PROFILE_FITS,
      boards: FIT_CHECK_PROFILE_BOARDS,
      closetPicks: FIT_CHECK_PROFILE_CLOSET_PICKS,
    },
  );

  const hydratingRef = useRef(false);
  const hasLoadedOnceRef = useRef(Boolean(PROFILE_SCREEN_CACHE));

  // Resolve user from session
  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      PROFILE_SCREEN_CACHE = null;
      setUserId(null);
      return null;
    }
    setUserId(data.user.id);
    return data.user.id;
  }, []);

  const fetchProfile = useCallback(async (uid: string) => {
    let response = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FIELDS)
      .eq('id', uid)
      .maybeSingle();

    if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
      response = await supabase
        .from('profiles')
        .select(PROFILE_FALLBACK_SELECT_FIELDS)
        .eq('id', uid)
        .maybeSingle();
    }

    if (response.error && hasMissingProfileColumn(response.error.message, 'bio')) {
      response = await supabase
        .from('profiles')
        .select(PROFILE_LEGACY_SELECT_FIELDS)
        .eq('id', uid)
        .maybeSingle();
    }

    if (response.error) throw response.error;

    if (response.data) {
      setProfile(response.data);
      return response.data;
    }

    const createPayload = { id: uid, ...DEFAULT_PROFILE };
    const insertResponse = await supabase
      .from('profiles')
      .insert([createPayload])
      .select(PROFILE_LEGACY_SELECT_FIELDS)
      .single();

    if (insertResponse.error) {
      const duplicateCreate = await supabase
        .from('profiles')
        .select(PROFILE_LEGACY_SELECT_FIELDS)
        .eq('id', uid)
        .single();
      if (duplicateCreate.error) throw duplicateCreate.error;
      setProfile(duplicateCreate.data);
      return duplicateCreate.data;
    }

    setProfile(insertResponse.data);
    return insertResponse.data;
  }, []);

  const hydrate = useCallback(async ({ showLoader = !hasLoadedOnceRef.current } = {}) => {
    if (hydratingRef.current) return;
    hydratingRef.current = true;
    try {
      if (showLoader) setLoading(true);
      const uid = await resolveUser();
      if (!uid) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }

      const results = await Promise.allSettled([
        fetchProfile(uid),
        fetchProfileAnalytics(uid),
        loadCurrentProfileFitCheckSnapshot(uid),
      ]);
      const firstFailure = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
      if (firstFailure) throw firstFailure.reason;

      const analyticsResult = results[1] as PromiseFulfilledResult<any>;
      if (analyticsResult?.value?.metrics) {
        const metrics = analyticsResult.value.metrics;
        setStats({
          closet: metrics.closetCount || 0,
          saved: metrics.savedLookCount || 0,
          favorites: metrics.favoriteLookCount || 0,
          listed: metrics.listedCount || 0,
          featured: metrics.featuredFitCount || 0,
          topColor: metrics.topColor || null,
          topSeason: metrics.topSeason || null,
          favoriteRatio: metrics.favoriteRatio || 0,
        });
      }

      const fitCheckResult = results[2] as PromiseFulfilledResult<any>;
      if (fitCheckResult?.value) {
        setFitCheckSnapshot(fitCheckResult.value);
      }
    } catch (e: any) {
      console.error('ProfileScreen hydrate error:', e?.message || e);
      Alert.alert('Error', 'Failed to load your profile.');
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
      hydratingRef.current = false;
    }
  }, [fetchProfile, navigation, resolveUser]);

  // Initial session check on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setAuthReady(true);
      if (!data?.session?.user) setLoading(false);
    };
    checkSession();
  }, []);

  // Supabase auth listener
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        PROFILE_SCREEN_CACHE = null;
        setAuthReady(false);
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setAuthReady(true);
      }
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [navigation]);

  // Trigger hydration on focus + authReady
  useEffect(() => {
    if (authReady && isFocused) {
      void hydrate({ showLoader: !hasLoadedOnceRef.current });
    }
  }, [authReady, isFocused, hydrate]);

  useEffect(() => {
    if (!userId && !profile && !avatarUri) return;
    PROFILE_SCREEN_CACHE = {
      userId,
      profile,
      stats,
      avatarUri,
      fitCheckSnapshot,
    };
  }, [avatarUri, fitCheckSnapshot, profile, stats, userId]);

  useEffect(() => {
    let cancelled = false;
    const nextLegacyAvatar = String(profile?.avatar_url || '').trim();
    const nextAvatarPath = String(profile?.avatar_path || '').trim();
    if (!nextLegacyAvatar && !nextAvatarPath) {
      setAvatarUri(null);
      return;
    }

    setAvatarUri(nextLegacyAvatar || null);
    resolvePrivateMediaUrl({
      path: nextAvatarPath || null,
      legacyUrl: nextLegacyAvatar,
      bucket: PROFILE_MEDIA_BUCKET,
    })
      .then((resolvedUri) => {
        if (!cancelled) {
          setAvatarUri(resolvedUri || nextLegacyAvatar);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvatarUri(nextLegacyAvatar);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_path, profile?.avatar_url]);

  const displayName = useMemo(
    () => profile?.full_name || profile?.username || DEFAULT_PROFILE.username,
    [profile?.full_name, profile?.username]
  );
  const username = useMemo(() => String(profile?.username || '').trim(), [profile?.username]);
  const styleTags = useMemo(
    () => (Array.isArray(profile?.style_tags) ? profile.style_tags.filter(Boolean) : []),
    [profile?.style_tags]
  );
  const privateModules = useMemo(
    () => [
      {
        key: 'featured-fits',
        eyebrow: 'Featured Fits',
        title: `${stats.featured} featured ${stats.featured === 1 ? 'look' : 'looks'}`,
        subtitle: 'Lead with your strongest outfits.',
        description: 'Curate the looks that should define your profile identity.',
        onPress: () => navigation.navigate('FeaturedFits' as never),
      },
      {
        key: 'saved-looks',
        eyebrow: 'Saved Looks',
        title: `${stats.saved} saved ${stats.saved === 1 ? 'look' : 'looks'}`,
        subtitle: `${stats.favorites} ${stats.favorites === 1 ? 'favorite' : 'favorites'}`,
        description: 'Build a visible archive of the fits you return to.',
        onPress: () => navigation.navigate('SavedOutfits' as never),
      },
      {
        key: 'activity',
        eyebrow: 'Activity',
        title: stats.topColor ? `Top color: ${stats.topColor}` : `${stats.favoriteRatio}% favorite rate`,
        subtitle: `${stats.closet} closet pieces`,
        description: 'Track your style signal through wardrobe composition and saved-look behavior.',
        onPress: () => navigation.navigate('Stats' as never),
      },
    ],
    [navigation, stats.closet, stats.favoriteRatio, stats.favorites, stats.featured, stats.saved, stats.topColor]
  );
  const socialStatItems = useMemo(
    () => [
      { key: 'fits', label: 'Fits', value: fitCheckSnapshot.socialStats.fits },
      {
        key: 'followers',
        label: 'Followers',
        value: fitCheckSnapshot.socialStats.followers,
        onPress: () => navigation.navigate('ManageFollowers' as never),
      },
      { key: 'following', label: 'Following', value: fitCheckSnapshot.socialStats.following },
      { key: 'boards', label: 'Boards', value: fitCheckSnapshot.socialStats.boards },
    ],
    [
      fitCheckSnapshot.socialStats.boards,
      fitCheckSnapshot.socialStats.fits,
      fitCheckSnapshot.socialStats.followers,
      fitCheckSnapshot.socialStats.following,
      navigation,
    ]
  );
  const privateStatItems = useMemo(
    () => [
      { key: 'closet', label: 'Closet', value: stats.closet },
      { key: 'saved', label: 'Saved', value: stats.saved },
      { key: 'favorites', label: 'Favorites', value: stats.favorites },
    ],
    [stats]
  );
  const styleSignalChips = useMemo(
    () =>
      [
        stats.topColor ? `Top color: ${stats.topColor}` : null,
        stats.topSeason ? `Top season: ${stats.topSeason}` : null,
        `${stats.favoriteRatio}% favorite rate`,
      ].filter(Boolean) as string[],
    [stats.favoriteRatio, stats.topColor, stats.topSeason],
  );

  // Example loading render fallback (you can customize this)
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1c1c1c" />
          <Text style={styles.loadingText}>Loading profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) + spacing.xl }]}>
        <ProfileHeroCard
          displayName={displayName}
          username={username}
          bio={profile?.bio || ''}
          avatarUrl={avatarUri}
          styleTags={styleTags}
          onEditPress={() => navigation.navigate('EditProfile' as never)}
          onSettingsPress={() => navigation.navigate('Settings' as never)}
        />

        <View style={styles.sectionSpacing}>
          <Text style={styles.sectionLabel}>Public Profile</Text>
          <ProfileStatGrid items={socialStatItems} />
        </View>

        <View style={styles.sectionSpacing}>
          <View style={styles.tabSwitch}>
            {PROFILE_TABS.map((tab) => {
              const isActive = activeProfileTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.9}
                  onPress={() => setActiveProfileTab(tab)}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeProfileTab === 'Fits' ? (
            <View style={styles.tabContent}>
              {fitCheckSnapshot.fits.map((fit) => (
                <TouchableOpacity
                  key={fit.id}
                  activeOpacity={0.9}
                  onPress={() => (navigation as any).navigate('FitPostDetail', { post: fit })}
                >
                  <ProfileSectionCard
                    compact
                    eyebrow="Fit Check"
                    title={fit.context}
                    subtitle={`${fit.time_ago} • ${fit.weather}`}
                  >
                    <Text style={styles.publicCardDescription}>{fit.caption}</Text>
                    <View style={styles.publicStripWrap}>
                      <FitItemStrip items={fit.items.slice(0, 3)} />
                    </View>
                  </ProfileSectionCard>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {activeProfileTab === 'Boards' ? (
            <View style={styles.tabContent}>
              {fitCheckSnapshot.boards.map((board) => (
                <ProfileSectionCard
                  key={board.id}
                  compact
                  eyebrow="Board"
                  title={board.title}
                  subtitle={board.subtitle}
                >
                  <Text style={styles.publicCardDescription}>{board.description}</Text>
                </ProfileSectionCard>
              ))}
            </View>
          ) : null}

          {activeProfileTab === 'Closet Picks' ? (
            <View style={styles.tabContent}>
              <ProfileSectionCard
                compact
                eyebrow="Closet Picks"
                title="Pieces worth keeping in rotation"
                subtitle="Core items your profile keeps close for quick styling."
              >
                <FitItemStrip items={fitCheckSnapshot.closetPicks} />
              </ProfileSectionCard>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionSpacing}>
          <ProfileSectionCard
            eyebrow="Closet Stats"
            title="Private closet stats"
            subtitle="These stay personal and reflect how you use Klozu behind the scenes."
          >
            <ProfileStatGrid items={privateStatItems} />
          </ProfileSectionCard>
        </View>

        <View style={styles.sectionSpacing}>
          <ProfileSectionCard
            eyebrow="Personal Style Signals"
            title="Signals shaping your style engine"
            subtitle="These cues still guide outfit generation, verdicts, and how discovery can find your taste later."
            actionLabel={styleTags.length ? 'Edit' : undefined}
            onActionPress={styleTags.length ? () => navigation.navigate('EditProfile' as never) : undefined}
          >
            {styleTags.length ? (
              <>
                <View style={styles.tagWrap}>
                  {styleTags.map((tag: string) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.signalWrap}>
                  {styleSignalChips.map((signal) => (
                    <View key={signal} style={styles.signalChip}>
                      <Text style={styles.signalChipText}>{signal}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <ProfileEmptyModule
                title="No style identity set yet"
                description="Add style tags so recommendations and future profile discovery feel more personal."
                ctaLabel="Edit profile"
                onPress={() => navigation.navigate('EditProfile' as never)}
              />
            )}
          </ProfileSectionCard>
        </View>

        <View style={styles.sectionSpacing}>
          <Text style={styles.sectionLabel}>Private Tools</Text>
          <View style={styles.moduleGrid}>
            {privateModules.map((module) => (
              <ProfileEcosystemCard
                key={module.key}
                eyebrow={module.eyebrow}
                title={module.title}
                subtitle={module.subtitle}
                description={module.description}
                onPress={module.onPress}
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionSpacing: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 12,
    fontFamily: typography.fontFamily,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
  },
  tagChipText: {
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  tabSwitch: {
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
  },
  tabButtonText: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  tabButtonTextActive: {
    color: colors.textOnAccent,
  },
  tabContent: {
    gap: 12,
    marginTop: 14,
  },
  publicCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  publicStripWrap: {
    marginTop: 14,
  },
  signalWrap: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signalChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },
  signalChipText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  moduleGrid: {
    gap: 12,
  },
});
