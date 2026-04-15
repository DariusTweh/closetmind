import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import ProfileEmptyModule from '../components/Profile/ProfileEmptyModule';
import ProfileHeroCard from '../components/Profile/ProfileHeroCard';
import ProfileSectionCard from '../components/Profile/ProfileSectionCard';
import ProfileStatGrid from '../components/Profile/ProfileStatGrid';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';

const DEFAULT_PROFILE = {
  username: 'New user',
  style_tags: [],
};
const PROFILE_MEDIA_BUCKET = 'onboarding';

const PROFILE_SELECT_FIELDS = 'id, username, full_name, bio, avatar_url, avatar_path, style_tags';
const PROFILE_FALLBACK_SELECT_FIELDS = 'id, username, full_name, bio, avatar_url, style_tags';
const PROFILE_LEGACY_SELECT_FIELDS = 'id, username, full_name, avatar_url, style_tags';

function hasMissingWardrobeColumn(message: string, field: string) {
  return String(message || '').includes(`wardrobe.${field}`);
}

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

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState({ closet: 0, favorites: 0, listed: 0 });
  const [authReady, setAuthReady] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const hydratingRef = useRef(false);

  // Resolve user from session
  const resolveUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
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

  const fetchStats = useCallback(async (uid: string) => {
    let closetResponse = await supabase
      .from('wardrobe')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .or('wardrobe_status.eq.owned,wardrobe_status.is.null');

    if (closetResponse.error && hasMissingWardrobeColumn(closetResponse.error.message, 'wardrobe_status')) {
      closetResponse = await supabase
        .from('wardrobe')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid);
    }

    const favoritesResponse = await supabase
      .from('saved_outfits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_favorite', true);

    if (closetResponse.error) throw closetResponse.error;
    if (favoritesResponse.error) throw favoritesResponse.error;

    let listedCount = 0;
    let listedResponse = await supabase
      .from('wardrobe')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .or('wardrobe_status.eq.owned,wardrobe_status.is.null')
      .eq('is_listed', true);

    const missingWardrobeStatus = listedResponse.error
      ? hasMissingWardrobeColumn(listedResponse.error.message, 'wardrobe_status')
      : false;

    if (missingWardrobeStatus) {
      listedResponse = await supabase
        .from('wardrobe')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('is_listed', true);
    }

    if (listedResponse.error && hasMissingWardrobeColumn(listedResponse.error.message, 'is_listed')) {
      listedResponse = missingWardrobeStatus
        ? await supabase
            .from('wardrobe')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('listed', true)
        : await supabase
            .from('wardrobe')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', uid)
            .or('wardrobe_status.eq.owned,wardrobe_status.is.null')
            .eq('listed', true);

      if (listedResponse.error && !hasMissingWardrobeColumn(listedResponse.error.message, 'listed')) {
        throw listedResponse.error;
      }
    } else if (listedResponse.error) {
      throw listedResponse.error;
    }

    listedCount = listedResponse.count || 0;

    setStats({
      closet: closetResponse.count || 0,
      favorites: favoritesResponse.count || 0,
      listed: listedCount,
    });
  }, []);

  const hydrate = useCallback(async () => {
    if (hydratingRef.current) return;
    hydratingRef.current = true;
    try {
      setLoading(true);
      const uid = await resolveUser();
      if (!uid) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }

      const results = await Promise.allSettled([fetchProfile(uid), fetchStats(uid)]);
      const firstFailure = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
      if (firstFailure) throw firstFailure.reason;
    } catch (e: any) {
      console.error('ProfileScreen hydrate error:', e?.message || e);
      Alert.alert('Error', 'Failed to load your profile.');
    } finally {
      setLoading(false);
      hydratingRef.current = false;
    }
  }, [fetchProfile, fetchStats, navigation, resolveUser]);

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
      hydrate();
    }
  }, [authReady, isFocused, hydrate]);

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
  const socialModules = useMemo(
    () => [
      {
        key: 'featured-fits',
        eyebrow: 'Featured Fits',
        title: 'Lead with your signature looks.',
        description: 'Pin standout outfits to define your public profile.',
        badgeLabel: 'Coming soon',
      },
      {
        key: 'saved-looks',
        eyebrow: 'Saved Looks',
        title: `${stats.favorites} favorite ${stats.favorites === 1 ? 'look' : 'looks'}`,
        description: 'Build a visible archive of the fits you keep returning to.',
        badgeLabel: stats.favorites ? undefined : 'Archive',
      },
      {
        key: 'marketplace',
        eyebrow: 'Marketplace',
        title: `${stats.listed} listed ${stats.listed === 1 ? 'piece' : 'pieces'}`,
        description: 'Seller-facing storefront controls and public listings will live here.',
        badgeLabel: stats.listed ? undefined : 'Coming soon',
      },
      {
        key: 'activity',
        eyebrow: 'Activity',
        title: 'Track your profile signal.',
        description: 'Likes, follows, and wardrobe activity will appear here once social features land.',
        badgeLabel: 'Coming soon',
      },
    ],
    [stats.favorites, stats.listed]
  );
  const statItems = useMemo(
    () => [
      { key: 'closet', label: 'Closet', value: stats.closet },
      { key: 'favorites', label: 'Favorites', value: stats.favorites },
      { key: 'listed', label: 'Listed', value: stats.listed },
    ],
    [stats]
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
          onEditPress={() => navigation.navigate('EditProfile' as never)}
          onSettingsPress={() => navigation.navigate('Settings' as never)}
        />

        <View style={styles.sectionSpacing}>
          <ProfileStatGrid items={statItems} />
        </View>

        <View style={styles.sectionSpacing}>
          <ProfileSectionCard
            eyebrow="Style Identity"
            title="Personal style signals"
            subtitle="These cues shape outfit generation, verdicts, and how your profile can read publicly later."
            actionLabel={styleTags.length ? 'Edit' : undefined}
            onActionPress={styleTags.length ? () => navigation.navigate('EditProfile' as never) : undefined}
          >
            {styleTags.length ? (
              <View style={styles.tagWrap}>
                {styleTags.map((tag: string) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
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
          <Text style={styles.sectionLabel}>Profile Ecosystem</Text>
          <View style={styles.moduleGrid}>
            {socialModules.map((module) => (
              <View key={module.key} style={styles.moduleCell}>
                <ProfileSectionCard
                  compact
                  eyebrow={module.eyebrow}
                  title={module.title}
                  style={styles.moduleCard}
                >
                  <ProfileEmptyModule
                    title={module.badgeLabel || 'Ready to grow'}
                    description={module.description}
                    badgeLabel={module.badgeLabel}
                  />
                </ProfileSectionCard>
              </View>
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
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  moduleCell: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  moduleCard: {
    minHeight: 210,
  },
});
