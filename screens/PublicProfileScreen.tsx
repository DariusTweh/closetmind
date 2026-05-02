import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import FitCheckExploreTile from '../components/FitCheck/FitCheckExploreTile';
import FitItemStrip from '../components/FitCheck/FitItemStrip';
import FitCheckReportModal from '../components/FitCheck/FitCheckReportModal';
import RecreateFitModal from '../components/FitCheck/RecreateFitModal';
import ProfileEmptyModule from '../components/Profile/ProfileEmptyModule';
import ProfileSectionCard from '../components/Profile/ProfileSectionCard';
import ProfileStatGrid from '../components/Profile/ProfileStatGrid';
import PublicProfileHeroCard from '../components/Profile/PublicProfileHeroCard';
import {
  blockFitCheckUser,
  reportFitCheckProfile,
  type FitCheckReportReason,
} from '../lib/fitCheckSafetyService';
import {
  loadPublicProfileData,
  toggleFollow,
} from '../lib/fitCheckService';
import { colors, spacing, typography } from '../lib/theme';
import type {
  FitCheckBoard,
  FitCheckItem,
  FitCheckPost,
  FitCheckPublicProfile,
  FitCheckPublicProfileStyle,
} from '../types/fitCheck';

const PUBLIC_PROFILE_BASE_TABS = ['Fits', 'Boards', 'Style'] as const;
type PublicProfileTab = 'Fits' | 'Boards' | 'Style' | 'Closet';

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const profileKey = String(route.params?.userId || route.params?.profileKey || '').trim();
  const [activeTab, setActiveTab] = useState<PublicProfileTab>('Fits');
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [resolvedProfileKey, setResolvedProfileKey] = useState<string | null>(profileKey || null);
  const [profile, setProfile] = useState<FitCheckPublicProfile | null>(null);
  const [fitPosts, setFitPosts] = useState<FitCheckPost[]>([]);
  const [boards, setBoards] = useState<FitCheckBoard[]>([]);
  const [style, setStyle] = useState<FitCheckPublicProfileStyle | null>(null);
  const [closetPicks, setClosetPicks] = useState<FitCheckItem[]>([]);
  const [recreatePost, setRecreatePost] = useState<FitCheckPost | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const isDemoProfile = !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(resolvedProfileKey || profileKey).trim());

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadProfile = async () => {
        setLoading(true);
        const snapshot = await loadPublicProfileData(profileKey);
        if (!active) return;
        setProfile(snapshot.profile);
        setFitPosts(snapshot.posts);
        setBoards(snapshot.boards);
        setStyle(snapshot.style);
        setClosetPicks(snapshot.closetPicks || []);
        setIsFollowing(snapshot.isFollowing);
        setIsBlocked(snapshot.isBlocked);
        setIsPrivateProfile(snapshot.isPrivateProfile);
        setResolvedProfileKey(snapshot.resolvedProfileKey);
        setLoading(false);
      };

      void loadProfile();

      return () => {
        active = false;
      };
    }, [profileKey]),
  );

  const publicStats = useMemo(
    () =>
      profile
        ? [
            { key: 'fits', label: 'Fits', value: profile.social_stats.fits },
            { key: 'followers', label: 'Followers', value: profile.social_stats.followers },
            { key: 'following', label: 'Following', value: profile.social_stats.following },
            { key: 'boards', label: 'Boards', value: profile.social_stats.boards },
          ]
        : [],
    [profile],
  );

  const publicProfileTabs = useMemo(() => {
    const tabs: PublicProfileTab[] = [...PUBLIC_PROFILE_BASE_TABS];
    if (profile?.public_closet_enabled) {
      tabs.push('Closet');
    }
    return tabs;
  }, [profile?.public_closet_enabled]);

  useEffect(() => {
    if (!publicProfileTabs.includes(activeTab)) {
      setActiveTab(publicProfileTabs[0] || 'Fits');
    }
  }, [activeTab, publicProfileTabs]);

  const handleToggleFollow = useCallback(() => {
    if (isBlocked) {
      Alert.alert('Blocked profile', 'Unblock this user before following again.');
      return;
    }

    const nextValue = !isFollowing;
    setIsFollowing(nextValue);
    setProfile((current) =>
      current
        ? {
            ...current,
            social_stats: {
              ...current.social_stats,
              followers: Math.max(0, current.social_stats.followers + (nextValue ? 1 : -1)),
            },
          }
        : current,
    );

    void toggleFollow(resolvedProfileKey || profileKey, nextValue).catch((error) => {
      console.error('Public profile follow toggle failed:', error);
      setIsFollowing(!nextValue);
      setProfile((current) =>
        current
          ? {
              ...current,
              social_stats: {
                ...current.social_stats,
                followers: Math.max(0, current.social_stats.followers + (nextValue ? -1 : 1)),
              },
            }
          : current,
      );
      Alert.alert('Could not update follow', 'Try again in a moment.');
    });
  }, [isBlocked, isFollowing, profileKey, resolvedProfileKey]);

  const handleOpenProfileMenu = useCallback(() => {
    const targetUserId = String(resolvedProfileKey || profileKey).trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
      Alert.alert('Demo profile', 'Demo profiles can’t be blocked or reported yet.');
      return;
    }

    Alert.alert('Profile options', 'Choose what you want to do with this profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Block this user?',
            'You won’t see their posts, and they won’t be able to interact with you.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: () => {
                  void blockFitCheckUser(targetUserId)
                    .then(() => {
                      setIsBlocked(true);
                      navigation.goBack();
                    })
                    .catch((error) => {
                      console.error('Block profile failed:', error);
                      Alert.alert('Could not block user', String(error?.message || 'Try again in a moment.'));
                    });
                },
              },
            ],
          );
        },
      },
      {
        text: 'Report Profile',
        onPress: () => setReportModalVisible(true),
      },
    ]);
  }, [navigation, profileKey, resolvedProfileKey]);

  const handleRecreate = useCallback((post: FitCheckPost) => {
    setRecreatePost(post);
  }, []);

  const handleOpenPostDetail = useCallback(
    (post: FitCheckPost) => {
      navigation.navigate('FitPostDetail', { post });
    },
    [navigation],
  );

  if (!loading && !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, styles.sidePadding]}>
          <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarLabel}>Public profile</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={[styles.sidePadding, styles.missingStateWrap]}>
          <ProfileSectionCard
            eyebrow="Profile"
            title={isPrivateProfile ? 'This profile is private' : 'Couldn’t find that profile'}
            subtitle={isPrivateProfile ? 'This account is still discoverable, but its profile activity is private.' : 'This mock profile isn’t available yet.'}
          >
            <ProfileEmptyModule
              title={isPrivateProfile ? 'Private profile' : 'No public profile data'}
              description={isPrivateProfile ? 'You can open the profile, but its fits, boards, and style details are hidden.' : 'Go back to Fit Check and pick another creator or fit.'}
            />
          </ProfileSectionCard>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.topBar, styles.sidePadding]}>
          <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarLabel}>Public profile</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <View style={[styles.sidePadding, styles.missingStateWrap]}>
          <ProfileSectionCard
            eyebrow="Profile"
            title="Loading public profile"
            subtitle="Pulling the latest Fit Check identity and posts."
          >
            <ProfileEmptyModule
              title="Loading profile"
              description="This will populate once the latest public profile data comes back."
            />
          </ProfileSectionCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <RecreateFitModal
        visible={Boolean(recreatePost)}
        post={recreatePost}
        onClose={() => setRecreatePost(null)}
      />
      <FitCheckReportModal
        visible={reportModalVisible}
        loading={reporting}
        targetLabel="profile"
        onClose={() => setReportModalVisible(false)}
        onSubmit={({ reason, details }: { reason: FitCheckReportReason; details: string }) => {
          const targetUserId = String(resolvedProfileKey || profileKey).trim();
          setReporting(true);
          void reportFitCheckProfile({
            reportedUserId: targetUserId,
            reason,
            details,
          })
            .then(() => {
              setReportModalVisible(false);
              Alert.alert('Report submitted');
            })
            .catch((error) => {
              console.error('Report profile failed:', error);
              Alert.alert('Could not submit report', String(error?.message || 'Try again in a moment.'));
            })
            .finally(() => {
              setReporting(false);
            });
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) + spacing.xl }]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarLabel}>Public profile</Text>
          {isDemoProfile ? <View style={styles.topBarSpacer} /> : (
            <TouchableOpacity activeOpacity={0.84} onPress={handleOpenProfileMenu} style={styles.backButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <PublicProfileHeroCard
          displayName={profile.display_name}
          username={profile.username}
          bio={profile.bio}
          avatarUrl={profile.avatar_url}
          styleTags={profile.style_tags}
          isFollowing={isFollowing}
          isBlocked={isBlocked}
          isDemoProfile={isDemoProfile}
          onToggleFollow={handleToggleFollow}
        />

        <View style={styles.sectionSpacing}>
          <Text style={styles.sectionLabel}>Public stats</Text>
          <ProfileStatGrid items={publicStats} />
        </View>

        <View style={styles.sectionSpacing}>
          <View style={styles.tabSwitch}>
            {publicProfileTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.88}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                >
                  <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === 'Fits' ? (
            isPrivateProfile ? (
              <ProfileSectionCard
                compact
                eyebrow="Fits"
                title="Private profile"
                subtitle="This account keeps fit posts private."
              >
                <ProfileEmptyModule
                  title="Fits are private"
                  description="You can still discover the profile, but fit posts are hidden."
                />
              </ProfileSectionCard>
            ) : fitPosts.length ? (
              <View style={styles.tabContent}>
                <FitCheckExploreTile
                  post={fitPosts[0]}
                  eyebrow="Fit Check"
                  style={styles.featuredFitTile}
                  onPress={handleOpenPostDetail}
                  onPressRecreate={handleRecreate}
                />
                {fitPosts.length > 1 ? (
                  <View style={styles.fitGrid}>
                    {fitPosts.slice(1).map((post) => (
                      <FitCheckExploreTile
                        key={post.id}
                        post={post}
                        eyebrow="Fit Check"
                        style={styles.fitTile}
                        onPress={handleOpenPostDetail}
                        onPressRecreate={handleRecreate}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <ProfileSectionCard
                compact
                eyebrow="Fits"
                title="No visible fits yet"
                subtitle="This profile hasn’t shared a Fit Check you can view yet."
              >
                <ProfileEmptyModule
                  title="No visible fits to show"
                  description="When this user posts a Fit Check you can access, it will show up here."
                />
              </ProfileSectionCard>
            )
          ) : null}

          {activeTab === 'Boards' ? (
            isPrivateProfile ? (
              <ProfileSectionCard
                compact
                eyebrow="Boards"
                title="Private profile"
                subtitle="This account keeps boards private."
              >
                <ProfileEmptyModule
                  title="Boards are private"
                  description="Board collections are hidden on this profile."
                />
              </ProfileSectionCard>
            ) : boards.length ? (
              <View style={styles.tabContent}>
                {boards.map((board) => (
                  <ProfileSectionCard
                    key={board.id}
                    compact
                    eyebrow="Board"
                    title={board.title}
                    subtitle={board.subtitle}
                  >
                    {board.description ? (
                      <Text style={styles.cardDescription}>{board.description}</Text>
                    ) : null}
                  </ProfileSectionCard>
                ))}
              </View>
            ) : (
              <ProfileSectionCard
                compact
                eyebrow="Boards"
                title="No boards yet"
                subtitle="This profile has not surfaced any public boards."
              >
                <ProfileEmptyModule
                  title="No public boards"
                  description="Saved-style boards will land here when this profile starts sharing them."
                />
              </ProfileSectionCard>
            )
          ) : null}

          {activeTab === 'Style' ? (
            isPrivateProfile ? (
              <ProfileSectionCard
                compact
                eyebrow="Style"
                title="Private profile"
                subtitle="This account keeps style signals private."
              >
                <ProfileEmptyModule
                  title="Style is private"
                  description="Public style summaries are hidden on this profile."
                />
              </ProfileSectionCard>
            ) : (
              <View style={styles.tabContent}>
                <ProfileSectionCard
                  eyebrow="Style identity"
                  title={style?.headline || 'Style notes'}
                  subtitle={style?.identity_note || profile.bio || 'Public style signals for this profile.'}
                >
                  {profile.style_tags.length ? (
                    <View style={styles.tagWrap}>
                      {profile.style_tags.map((tag) => (
                        <View key={tag} style={styles.tagChip}>
                          <Text style={styles.tagChipText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </ProfileSectionCard>

                <ProfileSectionCard
                  compact
                  eyebrow="Known for"
                  title="Signature vibes"
                  subtitle="Signals this profile keeps repeating in public fits."
                >
                  {style?.signature_vibes?.length ? (
                    <View style={styles.signalWrap}>
                      {style.signature_vibes.map((value) => (
                        <View key={value} style={styles.signalChip}>
                          <Text style={styles.signalChipText}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ProfileEmptyModule
                      title="No public vibe data yet"
                      description="Signature vibes will show here once more public fits exist."
                    />
                  )}
                </ProfileSectionCard>

                <ProfileSectionCard
                  compact
                  eyebrow="Usually wearing"
                  title="Signature contexts"
                  subtitle="Places and moods this person shows up in most."
                >
                  {style?.signature_contexts?.length ? (
                    <View style={styles.signalWrap}>
                      {style.signature_contexts.map((value) => (
                        <View key={value} style={styles.signalChip}>
                          <Text style={styles.signalChipText}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ProfileEmptyModule
                      title="No public context data yet"
                      description="Context signals will show once this profile has more shared fits."
                    />
                  )}
                </ProfileSectionCard>
              </View>
            )
          ) : null}

          {activeTab === 'Closet' ? (
            closetPicks.length ? (
              <ProfileSectionCard
                compact
                eyebrow="Public Closet"
                title="Closet picks"
                subtitle="Pieces this profile chose to surface."
              >
                <FitItemStrip items={closetPicks} />
              </ProfileSectionCard>
            ) : (
              <ProfileSectionCard
                compact
                eyebrow="Public Closet"
                title="No public closet items yet"
                subtitle="This profile has not surfaced any pieces."
              >
                <ProfileEmptyModule
                  title="No public closet items"
                  description="When public closet items are enabled, they will appear here."
                />
              </ProfileSectionCard>
            )
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sidePadding: {
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  topBarLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  topBarSpacer: {
    width: 48,
  },
  missingStateWrap: {
    paddingTop: spacing.xl,
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
    marginTop: 14,
    gap: 12,
  },
  featuredFitTile: {
    width: '100%',
  },
  fitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fitTile: {
    width: '48.3%',
    marginBottom: 14,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
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
  signalWrap: {
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
});
