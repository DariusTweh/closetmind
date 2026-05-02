import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import EmptyFitCheckState from '../components/FitCheck/EmptyFitCheckState';
import FitCheckCreatorCard from '../components/FitCheck/FitCheckCreatorCard';
import FitCheckExploreTile from '../components/FitCheck/FitCheckExploreTile';
import FitCheckPostCard from '../components/FitCheck/FitCheckPostCard';
import FitCheckPromptCard from '../components/FitCheck/FitCheckPromptCard';
import FitCheckReportModal from '../components/FitCheck/FitCheckReportModal';
import RecreateFitModal from '../components/FitCheck/RecreateFitModal';
import FitCheckStoriesRow from '../components/FitCheck/FitCheckStoriesRow';
import LockedFitCheckState from '../components/FitCheck/LockedFitCheckState';
import SearchField from '../components/SavedOutfits/SearchField';
import { getUnreadActivityCount } from '../lib/activityService';
import {
  blockFitCheckUser,
  hideFitCheckPost,
  reportFitCheckPost,
  type FitCheckReportReason,
} from '../lib/fitCheckSafetyService';
import {
  CURRENT_FIT_CHECK_PROFILE_KEY,
  FIT_CHECK_EXPLORE_SECTIONS,
} from '../lib/fitCheckMock';
import {
  buildOptimisticReactionPost,
  loadFitCheckScreenData,
  searchFitCheckProfiles,
  toggleFitCheckReaction,
  toggleFollow,
} from '../lib/fitCheckService';
import { useOptionalBottomTabBarHeight } from '../lib/useOptionalBottomTabBarHeight';
import { colors, shadows, spacing, typography } from '../lib/theme';
import type { FitCheckCreator, FitCheckExploreSection, FitCheckPost, FitCheckReaction } from '../types/fitCheck';
import type { FitCheckDropStory } from '../components/FitCheck/FitCheckStoriesRow';

const FEED_TABS = ['Friends', 'Following', 'Explore'] as const;
type FeedTab = (typeof FEED_TABS)[number];
const EXPLORE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'style-match', label: 'Style Match' },
  { key: 'recreate-friendly', label: 'Recreate' },
  { key: 'campus', label: 'Campus' },
  { key: 'streetwear', label: 'Streetwear' },
  { key: 'new-creators', label: 'New Creators' },
] as const;
type ExploreFilter = (typeof EXPLORE_FILTERS)[number]['key'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ExplorePostEntry = FitCheckPost & { sectionKeys: string[] };
type ExploreCreatorEntry = FitCheckCreator & { sectionKeys: string[] };

const SECTION_EYEBROW_BY_KEY: Record<string, string> = {
  trending: 'Trending Today',
  'style-match': 'People With Your Style',
  'recreate-friendly': 'Recreate-Friendly Fits',
  campus: 'Campus Fits',
  streetwear: 'Streetwear',
  'new-creators': 'New Creators',
};

function countLabel(section: { creators?: FitCheckCreator[]; posts?: FitCheckPost[] }) {
  if (section.creators?.length) {
    return `${section.creators.length} ${section.creators.length === 1 ? 'creator' : 'creators'}`;
  }
  const total = section.posts?.length || 0;
  return `${total} ${total === 1 ? 'look' : 'looks'}`;
}

export default function FitCheckScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const consumedPostActionRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>('Friends');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [posts, setPosts] = useState<FitCheckPost[]>([]);
  const [followingPosts, setFollowingPosts] = useState<FitCheckPost[]>([]);
  const [followingCreators, setFollowingCreators] = useState<FitCheckCreator[]>([]);
  const [exploreSections, setExploreSections] = useState<FitCheckExploreSection[]>(FIT_CHECK_EXPLORE_SECTIONS);
  const [suggestedPeople, setSuggestedPeople] = useState<FitCheckCreator[]>([]);
  const [exploreIsDemo, setExploreIsDemo] = useState(false);
  const [exploreQuery, setExploreQuery] = useState('');
  const [activeExploreFilter, setActiveExploreFilter] = useState<ExploreFilter>('all');
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [searchedProfiles, setSearchedProfiles] = useState<FitCheckCreator[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [unreadActivityCount, setUnreadActivityCount] = useState(0);
  const [recreatePost, setRecreatePost] = useState<FitCheckPost | null>(null);
  const [reportTarget, setReportTarget] = useState<{ postId: string; userId: string } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [viewedDropIds, setViewedDropIds] = useState<string[]>([]);
  const bottomInset = Math.max(insets.bottom + 220, tabBarHeight + 180);
  const exploreQueryValue = exploreQuery.trim().toLowerCase();

  const applyUpdatedPostEverywhere = useCallback((updatedPost: FitCheckPost) => {
    setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
    setFollowingPosts((current) =>
      current.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
    );
    setExploreSections((current) =>
      current.map((section) => ({
        ...section,
        posts: section.posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
      })),
    );
  }, []);

  const reloadScreenData = useCallback(async () => {
    const snapshot = await loadFitCheckScreenData();
    const unreadCount = await getUnreadActivityCount();
    setCurrentUserId(snapshot.currentUserId);
    setCurrentAvatarUrl(snapshot.currentAvatarUrl);
    setPosts(snapshot.friendsPosts);
    setFollowingPosts(snapshot.followingPosts);
    setFollowingCreators(snapshot.followingCreators);
    setExploreSections(snapshot.exploreSections);
    setSuggestedPeople(snapshot.suggestedPeople);
    setExploreIsDemo(snapshot.exploreIsDemo);
    setFollowState(snapshot.followState);
    setBlockedUserIds(snapshot.blockedUserIds);
    setHasPostedToday(snapshot.hasPostedToday);
    setUnreadActivityCount(unreadCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadScreen = async () => {
        if (!active) return;
        await reloadScreenData();
      };

      void loadScreen();

      return () => {
        active = false;
      };
    }, [reloadScreenData]),
  );

  useEffect(() => {
    let active = true;

    if (activeTab !== 'Explore') return () => {
      active = false;
    };

    if (!exploreQueryValue) {
      setSearchedProfiles([]);
      setSearchingProfiles(false);
      return () => {
        active = false;
      };
    }

    if (exploreQueryValue.length < 2) {
      setSearchedProfiles([]);
      setSearchingProfiles(false);
      return () => {
        active = false;
      };
    }

    setSearchingProfiles(true);
    const timeout = setTimeout(() => {
      void searchFitCheckProfiles(exploreQueryValue)
        .then((results) => {
          if (!active) return;
          setSearchedProfiles(results);
        })
        .catch((error) => {
          console.error('Fit Check profile search failed:', error);
          if (!active) return;
          setSearchedProfiles([]);
        })
        .finally(() => {
          if (!active) return;
          setSearchingProfiles(false);
        });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [activeTab, exploreQueryValue]);

  useEffect(() => {
    const actionNonce = Number(route.params?.postActionNonce || 0);
    if (!actionNonce || consumedPostActionRef.current === actionNonce) return;

    consumedPostActionRef.current = actionNonce;

    if (route.params?.postedToday) {
      setHasPostedToday(true);
    }

    if (route.params?.newPost) {
      const incomingPost = route.params.newPost as FitCheckPost;
      setPosts((current) =>
        current.some((post) => post.id === incomingPost.id)
          ? current
          : [incomingPost, ...current],
      );
    }

    navigation.setParams({
      postedToday: undefined,
      newPost: undefined,
      postActionNonce: undefined,
    });
  }, [navigation, route.params?.newPost, route.params?.postActionNonce, route.params?.postedToday]);

  const allExploreCreators = useMemo(() => {
    const creatorMap = new Map<string, ExploreCreatorEntry>();

    exploreSections.forEach((section) => {
      section.creators?.forEach((creator) => {
        const existing = creatorMap.get(creator.id);
        creatorMap.set(creator.id, {
          ...(existing || creator),
          ...creator,
          sectionKeys: Array.from(new Set([...(existing?.sectionKeys || []), section.key])),
        });
      });

      section.posts?.forEach((post) => {
        const key = String(post.author_key || post.username);
        const existing = creatorMap.get(key);
        creatorMap.set(key, {
          id: key,
          username: post.username,
          display_name: existing?.display_name || post.username,
          avatar_url: post.avatar_url,
          style_tags: existing?.style_tags?.length ? existing.style_tags : (post.style_tags || []),
          label: existing?.label || SECTION_EYEBROW_BY_KEY[section.key] || 'Fit Check',
          bio: existing?.bio || post.caption,
          sectionKeys: Array.from(new Set([...(existing?.sectionKeys || []), section.key])),
        });
      });
    });

    return Array.from(creatorMap.values());
  }, [exploreSections]);

  const allExplorePosts = useMemo(() => {
    const postMap = new Map<string, ExplorePostEntry>();

    exploreSections.forEach((section) => {
      section.posts?.forEach((post) => {
        const existing = postMap.get(post.id);
        postMap.set(post.id, {
          ...(existing || post),
          ...post,
          sectionKeys: Array.from(new Set([...(existing?.sectionKeys || []), section.key])),
        });
      });
    });

    return Array.from(postMap.values());
  }, [exploreSections]);

  const matchesExploreFilter = useCallback(
    (sectionKeys: string[], values: Array<string | undefined>) => {
      if (activeExploreFilter === 'all') return true;
      const filter = activeExploreFilter.toLowerCase();
      return (
        sectionKeys.includes(filter) ||
        values.some((value) => String(value || '').toLowerCase().includes(filter))
      );
    },
    [activeExploreFilter],
  );

  const filteredExploreSections = useMemo(
    () =>
      exploreSections.map((section) => ({
        ...section,
        creators: (section.creators || []).filter((creator) =>
          matchesExploreFilter([section.key], [
            creator.username,
            creator.label,
            creator.bio,
            ...creator.style_tags,
          ]),
        ),
        posts: (section.posts || []).filter((post) =>
          matchesExploreFilter([section.key], [
            post.username,
            post.context,
            post.caption,
            post.weather,
            post.mood,
            ...(post.style_tags || []),
          ]),
        ),
      }))
        .filter((section) => section.creators.length || section.posts.length)
        .filter((section) => activeExploreFilter === 'all' || section.key === activeExploreFilter),
    [activeExploreFilter, exploreSections, matchesExploreFilter],
  );

  const getPostScore = useCallback(
    (post: ExplorePostEntry) => {
      if (!exploreQueryValue) return Number(Boolean(followState[String(post.author_key || post.username)]));
      let score = 0;
      const username = post.username.toLowerCase();
      if (username === exploreQueryValue) score += 70;
      else if (username.startsWith(exploreQueryValue)) score += 45;
      else if (username.includes(exploreQueryValue)) score += 20;
      if (post.context.toLowerCase().includes(exploreQueryValue)) score += 18;
      if (post.caption.toLowerCase().includes(exploreQueryValue)) score += 10;
      if (post.style_tags?.some((tag) => tag.toLowerCase().includes(exploreQueryValue))) score += 14;
      return score;
    },
    [exploreQueryValue, followState],
  );

  const filteredExplorePosts = useMemo(
    () =>
      allExplorePosts
        .filter((post) => {
          const queryMatches =
            !exploreQueryValue ||
            [
              post.username,
              post.context,
              post.caption,
              post.weather,
              post.mood,
              ...(post.style_tags || []),
            ].some((value) => String(value || '').toLowerCase().includes(exploreQueryValue));

          return (
            queryMatches &&
            matchesExploreFilter(post.sectionKeys, [
              post.username,
              post.context,
              post.caption,
              post.weather,
              post.mood,
              ...(post.style_tags || []),
            ])
          );
        })
        .sort((left, right) => {
          const scoreDelta = getPostScore(right) - getPostScore(left);
          if (scoreDelta !== 0) return scoreDelta;
          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        }),
    [allExplorePosts, exploreQueryValue, getPostScore, matchesExploreFilter],
  );

  const currentUsersTodaysPost = useMemo(
    () =>
      posts.find(
        (post) =>
          post.isCurrentUser ||
          post.is_own_post ||
          (currentUserId && String(post.user_id || '').trim() === currentUserId),
      ) || null,
    [currentUserId, posts],
  );

  const followingCount = useMemo(
    () => Object.values(followState).filter(Boolean).length,
    [followState],
  );

  const dropStories = useMemo(() => {
    const postByUserId = new Map<string, FitCheckPost>();
    posts.forEach((post) => {
      const userId = String(post.user_id || post.author_key || '').trim();
      if (userId && !postByUserId.has(userId)) {
        postByUserId.set(userId, post);
      }
    });

    return followingCreators.map((creator) => {
      const userId = String(creator.id || '').trim();
      const post = postByUserId.get(userId);
      return {
        id: userId,
        username: creator.username,
        avatar_url: creator.avatar_url,
        posted: Boolean(post),
        seen: viewedDropIds.includes(userId),
        isRealUser: UUID_RE.test(userId),
      } as FitCheckDropStory;
    });
  }, [followingCreators, posts, viewedDropIds]);

  const handlePostFit = useCallback(() => {
    navigation.navigate('PostFitCheck');
  }, [navigation]);

  const handleRecreate = useCallback((post: FitCheckPost) => {
    setRecreatePost(post);
  }, []);

  const removePostFromLocalState = useCallback((postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setFollowingPosts((current) => current.filter((post) => post.id !== postId));
    setExploreSections((current) =>
      current.map((section) => ({
        ...section,
        posts: (section.posts || []).filter((post) => post.id !== postId),
      })),
    );
  }, []);

  const removeUserFromLocalState = useCallback((userId: string) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;

    setBlockedUserIds((current) =>
      current.includes(normalizedUserId) ? current : [...current, normalizedUserId],
    );
    setPosts((current) =>
      current.filter((post) => String(post.user_id || post.author_key || '').trim() !== normalizedUserId),
    );
    setFollowingPosts((current) =>
      current.filter((post) => String(post.user_id || post.author_key || '').trim() !== normalizedUserId),
    );
    setExploreSections((current) =>
      current.map((section) => ({
        ...section,
        creators: (section.creators || []).filter(
          (creator) => String(creator.id || '').trim() !== normalizedUserId,
        ),
        posts: (section.posts || []).filter(
          (post) => String(post.user_id || post.author_key || '').trim() !== normalizedUserId,
        ),
      })),
    );
    setSearchedProfiles((current) =>
      current.filter((creator) => String(creator.id || '').trim() !== normalizedUserId),
    );
    setFollowState((current) => {
      const next = { ...current };
      delete next[normalizedUserId];
      return next;
    });
  }, []);

  const handleOpenPostDetail = useCallback(
    (post: FitCheckPost, options?: { openStyleNotes?: boolean }) => {
      navigation.navigate('FitPostDetail', {
        post,
        openStyleNotes: Boolean(options?.openStyleNotes),
      });
    },
    [navigation],
  );

  const handleOpenStyleNotes = useCallback(
    (post: FitCheckPost) => {
      handleOpenPostDetail(post, { openStyleNotes: true });
    },
    [handleOpenPostDetail],
  );

  const handleSubmitReport = useCallback(
    ({ reason, details }: { reason: FitCheckReportReason; details: string }) => {
      if (!reportTarget) return;

      const { postId, userId } = reportTarget;
      setReporting(true);

      void reportFitCheckPost({
        postId,
        reportedUserId: userId,
        reason,
        details,
      })
        .then(() => {
          removePostFromLocalState(postId);
          setReportTarget(null);
          Alert.alert('Report submitted');
          return reloadScreenData();
        })
        .catch((error) => {
          console.error('Fit Check post report failed:', error);
          Alert.alert('Could not submit report', String(error?.message || 'Try again in a moment.'));
        })
        .finally(() => {
          setReporting(false);
        });
    },
    [reloadScreenData, removePostFromLocalState, reportTarget],
  );

  const handleOpenPostMenu = useCallback(
    (post: FitCheckPost) => {
      if (post.isCurrentUser || post.is_own_post) {
        handleOpenPostDetail(post);
        return;
      }

      Alert.alert('Post options', 'Choose what you want to do with this Fit Check.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide Post',
          onPress: () => {
            const postId = String(post.id || '').trim();
            if (!UUID_RE.test(postId)) {
              removePostFromLocalState(postId);
              Alert.alert('Post hidden');
              return;
            }

            void hideFitCheckPost(postId)
              .then(() => {
                removePostFromLocalState(postId);
                Alert.alert('Post hidden');
                return reloadScreenData();
              })
              .catch((error) => {
                console.error('Hide Fit Check post failed:', error);
                Alert.alert('Could not hide post', String(error?.message || 'Try again in a moment.'));
              });
          },
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => {
            const userId = String(post.user_id || post.author_key || '').trim();
            if (!UUID_RE.test(userId)) {
              Alert.alert('Demo profile', 'Demo profiles can’t be blocked yet.');
              return;
            }

            Alert.alert(
              'Block this user?',
              'You won’t see their posts, and they won’t be able to interact with you.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => {
                    void blockFitCheckUser(userId)
                      .then(() => {
                        removeUserFromLocalState(userId);
                        Alert.alert('User blocked');
                        return reloadScreenData();
                      })
                      .catch((error) => {
                        console.error('Block Fit Check user failed:', error);
                        Alert.alert('Could not block user', String(error?.message || 'Try again in a moment.'));
                      });
                  },
                },
              ],
            );
          },
        },
        {
          text: 'Report Post',
          onPress: () => {
            const userId = String(post.user_id || post.author_key || '').trim();
            if (!UUID_RE.test(userId) || !UUID_RE.test(String(post.id || '').trim())) {
              Alert.alert('Demo post', 'Demo posts can’t be reported yet.');
              return;
            }
            setReportTarget({
              postId: String(post.id).trim(),
              userId,
            });
          },
        },
      ]);
    },
    [handleOpenPostDetail, reloadScreenData, removePostFromLocalState, removeUserFromLocalState],
  );

  const handleToggleFollow = useCallback(
    (key: string) => {
      if (blockedUserIds.includes(String(key || '').trim())) {
        Alert.alert('Blocked profile', 'Unblock this user before following again.');
        return;
      }

      if (!UUID_RE.test(String(key || '').trim())) {
        Alert.alert('Demo profile', 'Demo profiles can’t be followed yet.');
        return;
      }

      const nextValue = !followState[key];
      setFollowState((current) => ({ ...current, [key]: nextValue }));

      void toggleFollow(key, nextValue)
        .then((nextState) => {
          setFollowState((current) => ({ ...current, ...nextState }));
          if (!nextValue) {
            setFollowingPosts((current) =>
              current.filter((post) => String(post.author_key || post.username) !== key),
            );
          }
          void reloadScreenData().catch((error) => {
            console.error('Fit Check refresh after follow failed:', error);
          });
        })
        .catch((error) => {
          console.error('Fit Check follow toggle failed:', error);
          setFollowState((current) => ({ ...current, [key]: !nextValue }));
          Alert.alert('Could not update follow', String(error?.message || 'Try again in a moment.'));
        });
    },
    [blockedUserIds, followState, reloadScreenData],
  );

  const handlePressReaction = useCallback(
    (post: FitCheckPost, reaction: FitCheckReaction) => {
      const optimisticPost = buildOptimisticReactionPost(post, reaction.label);
      applyUpdatedPostEverywhere(optimisticPost);

      void toggleFitCheckReaction({
        postId: post.id,
        nextReactionLabel: optimisticPost.active_reaction_label || null,
      }).catch((error) => {
        console.error('Fit Check reaction toggle failed:', error);
        applyUpdatedPostEverywhere(post);
        Alert.alert('Could not save reaction', 'Try again in a moment.');
      });
    },
    [applyUpdatedPostEverywhere],
  );

  const handleOpenProfile = useCallback(
    (profileKey: string | undefined, source: string) => {
      const key = String(profileKey || '').trim();
      if (!key) return;

      if (key === CURRENT_FIT_CHECK_PROFILE_KEY || (currentUserId && key === currentUserId)) {
        navigation.navigate('Profile');
        return;
      }

      navigation.navigate('PublicProfile', UUID_RE.test(key)
        ? {
            userId: key,
            source,
          }
        : {
            profileKey: key,
            source,
          });
    },
    [currentUserId, navigation],
  );

  const handleViewOwnFit = useCallback(() => {
    if (currentUsersTodaysPost) {
      handleOpenPostDetail(currentUsersTodaysPost);
      return;
    }
    handlePostFit();
  }, [currentUsersTodaysPost, handleOpenPostDetail, handlePostFit]);

  const handlePressDropStory = useCallback(
    (story: FitCheckDropStory) => {
      if (!story.posted) {
        Alert.alert('No drop yet.', 'This friend has not posted today yet.');
        return;
      }

      if (!hasPostedToday) {
        Alert.alert('Post your fit to unlock today’s drops.');
        return;
      }

      const targetPost = posts.find((post) => String(post.user_id || post.author_key || '').trim() === story.id);
      if (!targetPost) {
        Alert.alert('Drop unavailable', 'Could not open this drop right now.');
        return;
      }

      setViewedDropIds((current) => (current.includes(story.id) ? current : [...current, story.id]));
      handleOpenPostDetail(targetPost);
    },
    [handleOpenPostDetail, hasPostedToday, posts],
  );

  const handleLongPressDropStory = useCallback(
    (story: FitCheckDropStory) => {
      if (!story.isRealUser) return;
      handleOpenProfile(story.id, 'fitcheck_drop_story');
    },
    [handleOpenProfile],
  );

  const renderTabSwitch = () => (
    <View style={styles.tabSwitch}>
      {FEED_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            activeOpacity={0.9}
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
  );

  const renderTitleBlock = () => (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>Social Loop</Text>
        <Text style={styles.title}>Fit Check</Text>
        <Text style={styles.subtitle}>Your daily fit drop</Text>
      </View>
      <TouchableOpacity
        hitSlop={10}
        onPress={() => navigation.navigate('Activity')}
        style={styles.bellButton}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
        {unreadActivityCount > 0 ? (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>{unreadActivityCount > 9 ? '9+' : unreadActivityCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );

  const renderFriendsHeader = () => (
    <View style={styles.headerBlock}>
      {renderTitleBlock()}
      {renderTabSwitch()}
      <FitCheckStoriesRow
        stories={dropStories}
        hasPostedToday={hasPostedToday}
        currentUserAvatarUrl={currentAvatarUrl}
        emptyState={
          followingCount
            ? null
            : {
                title: 'No friend drops yet',
                buttonLabel: 'Find people',
                onPress: () => {
                  setActiveTab('Explore');
                  setExploreQuery('');
                },
              }
        }
        onPressYourTurn={hasPostedToday ? handleViewOwnFit : handlePostFit}
        onPressStory={handlePressDropStory}
        onLongPressStory={handleLongPressDropStory}
      />
      {!hasPostedToday ? <FitCheckPromptCard onPress={handlePostFit} /> : null}
      {hasPostedToday ? (
        <View style={styles.postedInlineBanner}>
          <View style={styles.postedInlineStatus}>
            <View style={styles.postedInlineDot} />
            <Text style={styles.postedInlineStatusText}>Posted</Text>
          </View>
          <View style={styles.postedInlineCopy}>
            <Text style={styles.postedInlineTitle}>You posted today</Text>
            <Text style={styles.postedInlineSubtitle}>Today&apos;s drops are unlocked.</Text>
          </View>
          <View style={styles.postedInlineActions}>
            <TouchableOpacity activeOpacity={0.85} onPress={handleViewOwnFit}>
              <Text style={styles.postedInlinePrimaryAction}>View Your Fit</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={handlePostFit}>
              <Text style={styles.postedInlineSecondaryAction}>Post Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {hasPostedToday ? (
        <View style={styles.feedHeading}>
          <Text style={styles.feedTitle}>Today&apos;s Feed</Text>
          <Text style={styles.feedMeta}>{posts.length} drops</Text>
        </View>
      ) : null}
    </View>
  );

  const renderFollowingHeader = () => (
    <View style={styles.headerBlock}>
      {renderTitleBlock()}
      {renderTabSwitch()}
      <View style={styles.sectionIntro}>
        <Text style={styles.sectionIntroTitle}>Following</Text>
        <Text style={styles.sectionIntroCopy}>Recent drops from people you follow.</Text>
      </View>
    </View>
  );

  const renderExploreSections = () => (
    <>
      {!exploreQueryValue && exploreIsDemo ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>Demo inspiration</Text>
          <Text style={styles.emptyStateCopy}>
            Explore will switch to real ranked public fits as more people post publicly. Post publicly to help build Explore.
          </Text>
        </View>
      ) : null}

      {!exploreQueryValue && suggestedPeople.length ? (
        <View style={styles.exploreSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>Suggested People</Text>
            <Text style={styles.sectionMeta}>
              {suggestedPeople.length} {suggestedPeople.length === 1 ? 'profile' : 'profiles'}
            </Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Real public profiles worth following before you scan the fits underneath.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.creatorRow}
          >
            {suggestedPeople.map((creator) => (
              <FitCheckCreatorCard
                key={creator.id}
                creator={creator}
                isFollowing={Boolean(followState[creator.id])}
                onToggleFollow={() => handleToggleFollow(creator.id)}
                onPressProfile={() => handleOpenProfile(creator.id, 'fitcheck_suggested')}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {filteredExploreSections.map((section) => (
        <View key={section.key} style={styles.exploreSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>
              {SECTION_EYEBROW_BY_KEY[section.key] || section.title}
            </Text>
            <Text style={styles.sectionMeta}>{countLabel(section)}</Text>
          </View>
          {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}

          {section.creators.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creatorRow}
            >
              {section.creators.map((creator) => (
                <FitCheckCreatorCard
                  key={creator.id}
                  creator={creator}
                  isFollowing={Boolean(followState[creator.id])}
                  onToggleFollow={() => handleToggleFollow(creator.id)}
                  onPressProfile={() => handleOpenProfile(creator.id, 'fitcheck_creator')}
                />
              ))}
            </ScrollView>
          ) : null}

          {section.posts.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exploreRow}
            >
              {section.posts.map((post) => (
                <FitCheckExploreTile
                  key={post.id}
                  post={post}
                  style={styles.horizontalExploreTile}
                  eyebrow={SECTION_EYEBROW_BY_KEY[section.key] || 'Explore'}
                  onPress={handleOpenPostDetail}
                  onPressProfile={(entry) =>
                    handleOpenProfile(String(entry.author_key || entry.username), 'explore_tile')
                  }
                  onPressRecreate={handleRecreate}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ))}
    </>
  );

  const renderExploreSearchResults = () => (
    <>
      {exploreQueryValue.length < 2 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>Search usernames, creators, or style tags.</Text>
          <Text style={styles.emptyStateCopy}>
            Type at least two characters to search real Fit Check profiles.
          </Text>
        </View>
      ) : null}

      {exploreQueryValue.length >= 2 && searchingProfiles ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>Searching…</Text>
          <Text style={styles.emptyStateCopy}>
            Looking up matching profiles from Fit Check.
          </Text>
        </View>
      ) : null}

      {exploreQueryValue.length >= 2 && !searchingProfiles && searchedProfiles.length ? (
        <View style={styles.exploreSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>Profiles</Text>
            <Text style={styles.sectionMeta}>{searchedProfiles.length} matches</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Profiles show first, then the fit results underneath.
          </Text>
          <View style={styles.creatorList}>
            {searchedProfiles.map((creator) => (
              <FitCheckCreatorCard
                key={creator.id}
                creator={creator}
                fullWidth
                isFollowing={Boolean(followState[creator.id])}
                onToggleFollow={() => handleToggleFollow(creator.id)}
                onPressProfile={() => handleOpenProfile(creator.id, 'fitcheck_creator')}
              />
            ))}
          </View>
        </View>
      ) : null}

      {exploreQueryValue.length >= 2 && !searchingProfiles && !searchedProfiles.length ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No users found.</Text>
          <Text style={styles.emptyStateCopy}>
            Try another username, full name, or style tag.
          </Text>
        </View>
      ) : null}

      {filteredExplorePosts.length ? (
        <View style={styles.exploreSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionLabel}>Fits</Text>
            <Text style={styles.sectionMeta}>{filteredExplorePosts.length} looks</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Discovery stays actionable here with recreate and follow still in reach.
          </Text>
          <View style={styles.gridWrap}>
            {filteredExplorePosts.map((post) => (
              <FitCheckExploreTile
                key={post.id}
                post={post}
                style={styles.gridTile}
                eyebrow={SECTION_EYEBROW_BY_KEY[post.sectionKeys[0]] || 'Explore'}
                onPress={handleOpenPostDetail}
                onPressProfile={(entry) =>
                  handleOpenProfile(String(entry.author_key || entry.username), 'explore_tile')
                }
                onPressRecreate={handleRecreate}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!searchingProfiles && !searchedProfiles.length && !filteredExplorePosts.length && exploreQueryValue.length >= 2 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No results yet</Text>
          <Text style={styles.emptyStateCopy}>
            Try a creator name, vibe, or style signal like minimal, campus, or streetwear.
          </Text>
        </View>
      ) : null}
    </>
  );

  const renderExploreScreen = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
    >
      <View style={styles.headerBlock}>
        {renderTitleBlock()}
        {renderTabSwitch()}
        <View style={styles.searchWrap}>
          <SearchField
            value={exploreQuery}
            onChangeText={setExploreQuery}
            placeholder="Search creators, styles, moods, and fits"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {EXPLORE_FILTERS.map((filter) => {
            const isActive = activeExploreFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.88}
                onPress={() => setActiveExploreFilter(filter.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {exploreQueryValue ? renderExploreSearchResults() : renderExploreSections()}
    </ScrollView>
  );

  if (activeTab === 'Explore') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <RecreateFitModal
          visible={Boolean(recreatePost)}
          post={recreatePost}
          onClose={() => setRecreatePost(null)}
        />
        <FitCheckReportModal
          visible={Boolean(reportTarget)}
          loading={reporting}
          targetLabel="post"
          onClose={() => setReportTarget(null)}
          onSubmit={handleSubmitReport}
        />
        {renderExploreScreen()}
      </SafeAreaView>
    );
  }

  const isFriendsTab = activeTab === 'Friends';
  const friendFeedUnlocked = isFriendsTab && hasPostedToday;
  const feedData = isFriendsTab ? (friendFeedUnlocked ? posts : []) : followingPosts;
  const listHeader = isFriendsTab ? renderFriendsHeader : renderFollowingHeader;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <RecreateFitModal
        visible={Boolean(recreatePost)}
        post={recreatePost}
        onClose={() => setRecreatePost(null)}
      />
      <FitCheckReportModal
        visible={Boolean(reportTarget)}
        loading={reporting}
        targetLabel="post"
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
      />
      <FlatList
        data={feedData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FitCheckPostCard
            post={item}
            eyebrow={activeTab === 'Following' ? 'Following' : undefined}
            showFollowButton={activeTab === 'Following'}
            isFollowing={Boolean(followState[String(item.author_key || item.username)])}
            onToggleFollow={
              activeTab === 'Following'
                ? () => handleToggleFollow(String(item.author_key || item.username))
                : undefined
            }
            onPressProfile={(post) =>
              handleOpenProfile(String(post.author_key || post.username), 'fitcheck_post')
            }
            onPressReaction={handlePressReaction}
            onPressComment={handleOpenStyleNotes}
            activeReactionLabels={item.active_reaction_label ? [item.active_reaction_label] : []}
            onPress={handleOpenPostDetail}
            onPressMenu={handleOpenPostMenu}
            onPressRecreate={handleRecreate}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          isFriendsTab ? (
            hasPostedToday ? (
              <EmptyFitCheckState onPressPost={handlePostFit} />
            ) : (
              <LockedFitCheckState onPressPost={handlePostFit} />
            )
          ) : (
            <View style={styles.emptyStateStack}>
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateTitle}>No following posts yet</Text>
                <Text style={styles.emptyStateCopy}>
                  Follow real users from Explore or search to see their drops here.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setActiveTab('Explore');
                    setExploreQuery('');
                  }}
                  style={styles.emptyStateButton}
                >
                  <Text style={styles.emptyStateButtonText}>Find people to follow</Text>
                </TouchableOpacity>
              </View>
              {allExploreCreators.length ? (
                <View style={styles.creatorList}>
                  {allExploreCreators.slice(0, 2).map((creator) => (
                    <FitCheckCreatorCard
                      key={creator.id}
                      creator={creator}
                      fullWidth
                      isFollowing={Boolean(followState[creator.id])}
                      onToggleFollow={() => handleToggleFollow(creator.id)}
                      onPressProfile={() => handleOpenProfile(creator.id, 'fitcheck_creator')}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
  },
  headerBlock: {
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
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
    fontSize: 38,
    lineHeight: 42,
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
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  tabSwitch: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
  },
  tabButtonText: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  tabButtonTextActive: {
    color: colors.textOnAccent,
  },
  searchWrap: {
    marginTop: 16,
  },
  filterRow: {
    paddingTop: 18,
    paddingLeft: spacing.xs,
    paddingRight: spacing.xxl,
    gap: 10,
  },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  filterChipTextActive: {
    color: colors.textOnAccent,
  },
  postedInlineBanner: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,30,30,0.08)',
  },
  postedInlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(237,235,227,0.9)',
  },
  postedInlineDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#ba7f54',
  },
  postedInlineStatusText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  postedInlineCopy: {
    flex: 1,
    minWidth: 0,
  },
  postedInlineTitle: {
    fontSize: 15,
    lineHeight: 19,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  postedInlineSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  postedInlineActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  postedInlinePrimaryAction: {
    fontSize: 13,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  postedInlineSecondaryAction: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  feedHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 14,
  },
  feedTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  feedMeta: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  sectionIntro: {
    marginTop: 24,
    marginBottom: 18,
  },
  sectionIntroTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  sectionIntroCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  exploreSection: {
    marginBottom: 28,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  sectionMeta: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  sectionSubtitle: {
    marginTop: 8,
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  creatorRow: {
    paddingRight: spacing.xl,
    gap: 12,
    paddingBottom: 8,
  },
  creatorList: {
    gap: 12,
  },
  exploreRow: {
    paddingRight: spacing.xl,
    gap: 12,
    paddingBottom: 8,
  },
  horizontalExploreTile: {
    width: 276,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridTile: {
    width: '48.3%',
    marginBottom: 14,
  },
  emptyStateCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 24,
    marginTop: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  emptyStateCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  emptyStateButton: {
    alignSelf: 'flex-start',
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  emptyStateStack: {
    gap: 16,
  },
  bottomSpacer: {
    height: 160,
  },
});
