import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  loadFollowersForCurrentUser,
  removeFollower,
  type FollowerEntry,
} from '../services/followService';
import { colors, spacing, typography } from '../lib/theme';

export default function ManageFollowersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<FollowerEntry[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        setLoading(true);
        try {
          const rows = await loadFollowersForCurrentUser();
          if (!active) return;
          setFollowers(rows);
        } catch (error) {
          console.error('Load followers failed:', error);
          if (!active) return;
          Alert.alert('Could not load followers', 'Try again in a moment.');
        } finally {
          if (active) setLoading(false);
        }
      };

      void load();

      return () => {
        active = false;
      };
    }, []),
  );

  const handleRemoveFollower = useCallback((follower: FollowerEntry) => {
    if (removingId) return;

    Alert.alert(
      `Remove @${follower.username}?`,
      'They will stop following you. They can still find you again later unless you block them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setRemovingId(follower.id);
            void removeFollower(follower.id)
              .then(() => {
                setFollowers((current) => current.filter((entry) => entry.id !== follower.id));
              })
              .catch((error) => {
                console.error('Remove follower failed:', error);
                Alert.alert('Could not remove follower', String(error?.message || 'Try again in a moment.'));
              })
              .finally(() => {
                setRemovingId(null);
              });
          },
        },
      ],
    );
  }, [removingId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Followers</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + spacing.xl }]}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Social boundary</Text>
          <Text style={styles.title}>Remove Followers</Text>
          <Text style={styles.subtitle}>
            Review who follows you and remove people without fully blocking them.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
            <Text style={styles.loadingText}>Loading followers</Text>
          </View>
        ) : !followers.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No followers yet</Text>
            <Text style={styles.emptyCopy}>
              When people follow your profile, they’ll show up here so you can remove them if needed.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {followers.map((follower) => (
              <TouchableOpacity
                key={follower.id}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PublicProfile', { userId: follower.id, source: 'manage_followers' })}
                style={styles.userCard}
              >
                {follower.avatar_url ? (
                  <Image source={{ uri: follower.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}

                <View style={styles.copyWrap}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {follower.full_name || follower.username}
                  </Text>
                  <Text style={styles.handle} numberOfLines={1}>
                    @{follower.username}
                  </Text>
                  {follower.bio ? (
                    <Text style={styles.bio} numberOfLines={2}>
                      {follower.bio}
                    </Text>
                  ) : null}
                  {follower.style_tags.length ? (
                    <View style={styles.tagWrap}>
                      {follower.style_tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tagChip}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  activeOpacity={removingId === follower.id ? 1 : 0.88}
                  disabled={removingId === follower.id}
                  onPress={() => handleRemoveFollower(follower)}
                  style={[styles.removeButton, removingId === follower.id && styles.removeButtonDisabled]}
                >
                  <Text style={styles.removeText}>
                    {removingId === follower.id ? 'Removing…' : 'Remove'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  topBarSpacer: {
    width: 48,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 42,
    lineHeight: 46,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  loadingWrap: {
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  list: {
    gap: 14,
  },
  userCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  displayName: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  handle: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  bio: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  tagWrap: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  tagText: {
    fontSize: 11.5,
    lineHeight: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  removeButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d9b7ad',
    backgroundColor: '#fff4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.55,
  },
  removeText: {
    fontSize: 12.5,
    lineHeight: 16,
    color: '#9e4a3e',
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
