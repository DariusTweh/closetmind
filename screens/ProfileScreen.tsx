import React, { useCallback, useEffect, useState,useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, typography } from '../lib/theme';
import ProfileHeader from '../components/Profile/ProfileHeader';
import StatsRow from '../components/Profile/StatsRow';
import StyleMoodTags from '../components/Profile/StyleMoodTags';
import ProfileActions from '../components/Profile/ProfileActions';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [wardrobe, setWardrobe] = useState<any[]>([]);
  const [favoriteOutfits, setFavoriteOutfits] = useState<any[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const hydratingRef = useRef(false);
  const loggingOutRef = useRef(false);

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
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        { id: uid, username: 'New user', style_tags: [] },
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select('id, username, avatar_url, style_tags')
      .single();

    if (error) throw error;
    setProfile(data);
  }, []);

  const fetchWardrobe = useCallback(async (uid: string) => {
    let { data, error } = await supabase
      .from('wardrobe')
      .select('id, is_listed')
      .eq('user_id', uid);

    if (error && error.message.includes('is_listed')) {
      const fallback = await supabase
        .from('wardrobe')
        .select('id')
        .eq('user_id', uid);
      if (fallback.error) throw fallback.error;
      setWardrobe(fallback.data || []);
      return;
    }

    if (error) throw error;
    setWardrobe(data || []);
  }, []);

  const fetchFavorites = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('saved_outfits')
      .select('id, is_favorite')
      .eq('user_id', uid)
      .eq('is_favorite', true);

    if (error) throw error;
    setFavoriteOutfits(data || []);
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

      await Promise.allSettled([
        fetchProfile(uid),
        fetchWardrobe(uid),
        fetchFavorites(uid),
      ]);
    } catch (e: any) {
      console.error('ProfileScreen hydrate error:', e?.message || e);
      Alert.alert('Error', 'Failed to load your profile.');
    } finally {
      setLoading(false);
      hydratingRef.current = false;
    }
  }, [fetchFavorites, fetchProfile, fetchWardrobe, navigation, resolveUser]);

  // Initial session check on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setAuthReady(true);
      }
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

      if (event === 'SIGNED_IN' && session?.user && !loggingOutRef.current) {
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

  const handleLogout = async () => {
    loggingOutRef.current = true;
    const { error } = await supabase.auth.signOut();
    if (error) {
      loggingOutRef.current = false;
      console.error('Logout error:', error.message);
      Alert.alert('Error', 'Unable to log out.');
    }
  };

  // Example loading render fallback (you can customize this)
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f3' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.appTitle}>ClosetMind</Text>

        <ProfileHeader
          username={profile?.username}
          avatarUrl={profile?.avatar_url}
          onEditPress={() => navigation.navigate('EditProfile' as never)}
          onSettingsPress={() => navigation.navigate('Settings' as never)}
        />

        <StatsRow
          stats={{
            closet: wardrobe.length,
            favorites: favoriteOutfits.length,
            listed: wardrobe.filter(item => item.is_listed).length,
          }}
          onPressStat={(type) => console.log('Tapped:', type)}
        />

        <StyleMoodTags
          tags={profile?.style_tags || []}
          onEdit={() => navigation.navigate('EditProfile' as never)}
        />

        <ProfileActions
          onEditProfile={() => navigation.navigate('EditProfile' as never)}
          onPreferences={() => navigation.navigate('StylePreferences' as never)}
          onLogout={handleLogout}
        />

        {loading && (
          <View style={{ paddingTop: 16 }}>
            <Text style={{ textAlign: 'center', color: '#555' }}>Loading…</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl, // for safe bottom space
  },
  appTitle: {
    ...typography.subheader,
    alignSelf: 'center',
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
});