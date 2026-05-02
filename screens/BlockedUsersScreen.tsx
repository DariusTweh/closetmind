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
  loadBlockedFitCheckUsers,
  unblockFitCheckUser,
  type BlockedFitCheckUser,
} from '../lib/fitCheckSafetyService';
import { colors, spacing, typography } from '../lib/theme';

export default function BlockedUsersScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedFitCheckUser[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        setLoading(true);
        const rows = await loadBlockedFitCheckUsers();
        if (!active) return;
        setBlockedUsers(rows);
        setLoading(false);
      };

      void load();

      return () => {
        active = false;
      };
    }, []),
  );

  const handleUnblock = useCallback((user: BlockedFitCheckUser) => {
    if (unblockingId) return;

    Alert.alert(
      `Unblock @${user.username}?`,
      'They will be able to show up in Fit Check again and you can follow each other normally.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            setUnblockingId(user.id);
            void unblockFitCheckUser(user.id)
              .then(() => {
                setBlockedUsers((current) => current.filter((entry) => entry.id !== user.id));
              })
              .catch((error) => {
                console.error('Unblock user failed:', error);
                Alert.alert('Could not unblock user', String(error?.message || 'Try again in a moment.'));
              })
              .finally(() => {
                setUnblockingId(null);
              });
          },
        },
      ],
    );
  }, [unblockingId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Blocked Users</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + spacing.xl }]}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Safety controls</Text>
          <Text style={styles.title}>Blocked Users</Text>
          <Text style={styles.subtitle}>
            People you block disappear from Fit Check feeds, discovery, and follow flows until you unblock them.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.textPrimary} />
            <Text style={styles.loadingText}>Loading blocked users</Text>
          </View>
        ) : !blockedUsers.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyCopy}>
              If you block someone from Fit Check, they will show up here so you can review or undo it later.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {blockedUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}

                <View style={styles.copyWrap}>
                  <Text style={styles.displayName} numberOfLines={1}>
                    {user.full_name || user.username}
                  </Text>
                  <Text style={styles.handle} numberOfLines={1}>
                    @{user.username}
                  </Text>
                  {user.bio ? (
                    <Text style={styles.bio} numberOfLines={2}>
                      {user.bio}
                    </Text>
                  ) : null}
                  {user.style_tags.length ? (
                    <View style={styles.tagWrap}>
                      {user.style_tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tagChip}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  activeOpacity={unblockingId === user.id ? 1 : 0.88}
                  disabled={unblockingId === user.id}
                  onPress={() => handleUnblock(user)}
                  style={[styles.unblockButton, unblockingId === user.id && styles.unblockButtonDisabled]}
                >
                  <Text style={styles.unblockText}>
                    {unblockingId === user.id ? 'Unblocking…' : 'Unblock'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  unblockButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockButtonDisabled: {
    opacity: 0.55,
  },
  unblockText: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
