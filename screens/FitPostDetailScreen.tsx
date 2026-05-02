import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { useNavigation, useRoute } from '@react-navigation/native';
import FitReactionChips from '../components/FitCheck/FitReactionChips';
import FitCheckPostEditModal from '../components/FitCheck/FitCheckPostEditModal';
import FitCheckPostVisibilityModal from '../components/FitCheck/FitCheckPostVisibilityModal';
import FitCheckReportModal from '../components/FitCheck/FitCheckReportModal';
import RecreateFitModal from '../components/FitCheck/RecreateFitModal';
import SaveFitModal from '../components/FitCheck/SaveFitModal';
import StyleNotesModal from '../components/FitCheck/StyleNotesModal';
import VerdictModal from '../components/FitCheck/VerdictModal';
import WardrobeItemImage from '../components/Closet/WardrobeItemImage';
import {
  blockFitCheckUser,
  hideFitCheckPost,
  reportFitCheckPost,
  type FitCheckReportReason,
} from '../lib/fitCheckSafetyService';
import {
  addStyleNote,
  buildOptimisticReactionPost,
  deleteFitCheckPost,
  loadStyleBoards,
  loadStyleNotes,
  saveFitCheckPost,
  toggleFitCheckReaction,
  updateFitCheckPostDetails,
  updateFitCheckPostVisibility,
} from '../lib/fitCheckService';
import { useOptionalBottomTabBarHeight } from '../lib/useOptionalBottomTabBarHeight';
import { colors, radii, shadows, spacing, typography } from '../lib/theme';
import type { FitCheckBoardOption, FitCheckItem, FitCheckPost, FitCheckReaction, FitCheckStyleNote } from '../types/fitCheck';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOCK_STYLE_NOTES: FitCheckStyleNote[] = [
  {
    id: 'mock-note-1',
    note: 'Shoes work crazy with this.',
    user_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    username: 'stylefriend',
  },
  {
    id: 'mock-note-2',
    note: 'Layer makes the fit cleaner.',
    user_id: 'mock-user-2',
    created_at: new Date().toISOString(),
    username: 'stylefriend',
  },
];

function formatDetailDate(value?: string) {
  const timestamp = String(value || '').trim();
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatItemMetaLabel(item: FitCheckItem) {
  const raw = String(item.type || item.main_category || '').trim();
  if (!raw) return null;

  return raw
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export default function FitPostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const initialPost = route.params?.post as FitCheckPost | undefined;
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [recreateModalVisible, setRecreateModalVisible] = useState(false);
  const [verdictModalVisible, setVerdictModalVisible] = useState(false);
  const [styleNotesModalVisible, setStyleNotesModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [updatingPost, setUpdatingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [savedCollection, setSavedCollection] = useState<string | null>(null);
  const [post, setPost] = useState<FitCheckPost | undefined>(initialPost);
  const [styleNotes, setStyleNotes] = useState<FitCheckStyleNote[]>(MOCK_STYLE_NOTES);
  const [boardOptions, setBoardOptions] = useState<FitCheckBoardOption[]>([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reporting, setReporting] = useState(false);

  const detailDate = useMemo(() => formatDetailDate(post?.created_at), [post?.created_at]);
  const bottomPadding = Math.max(insets.bottom + spacing.xl, tabBarHeight + 40);
  const isCurrentUser = Boolean(post?.isCurrentUser || post?.is_own_post);
  const verdictButtonLabel = isCurrentUser ? 'Ask Verdict' : 'Break Down';
  const totalReactionCount = useMemo(
    () => (post?.reactions || []).reduce((total, reaction) => total + Number(reaction.count || 0), 0),
    [post?.reactions],
  );
  const hardFitReaction = useMemo(
    () =>
      post?.reactions?.find((reaction) => reaction.label === 'Hard Fit') || {
        label: 'Hard Fit',
        emoji: '🔥',
        count: 0,
      },
    [post?.reactions],
  );

  const navigateToFitProfile = (profileKey?: string | null, options?: { isCurrentUser?: boolean; source?: string }) => {
    const key = String(profileKey || '').trim();

    if (options?.isCurrentUser || (post?.isCurrentUser && key && key === String(post?.user_id || post?.author_key || '').trim())) {
      navigation.navigate('Profile');
      return;
    }

    if (!key) return;

    navigation.navigate(
      'PublicProfile',
      UUID_RE.test(key)
        ? {
            userId: key,
            source: options?.source || 'fit_detail',
          }
        : {
            profileKey: key,
            source: options?.source || 'fit_detail',
          },
    );
  };

  const handleDeletePost = () => {
    if (!post?.id || deletingPost) return;

    Alert.alert(
      'Delete this Fit Check?',
      'This removes the post, reactions, saves, and style notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeletingPost(true);
            void deleteFitCheckPost(post.id)
              .then(() => {
                navigation.goBack();
              })
              .catch((error) => {
                console.error('Fit Check delete failed:', error);
                Alert.alert('Could not delete post', String(error?.message || 'Try again in a moment.'));
              })
              .finally(() => {
                setDeletingPost(false);
              });
          },
        },
      ],
    );
  };

  const handleOpenOwnerMenu = () => {
    if (!isCurrentUser) return;

    Alert.alert('Post options', 'Choose what you want to change.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit Details',
        onPress: () => setEditModalVisible(true),
      },
      {
        text: 'Change Visibility',
        onPress: () => setVisibilityModalVisible(true),
      },
      {
        text: deletingPost ? 'Deleting…' : 'Delete Post',
        style: 'destructive',
        onPress: handleDeletePost,
      },
    ]);
  };

  const handleOpenViewerMenu = () => {
    const userId = String(post?.user_id || post?.author_key || '').trim();
    const postId = String(post?.id || '').trim();

    Alert.alert('Post options', 'Choose what you want to do with this Fit Check.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hide Post',
        onPress: () => {
          if (!postId) return;
          if (!/^[0-9a-f-]{36}$/i.test(postId)) {
            navigation.goBack();
            Alert.alert('Post hidden');
            return;
          }

          void hideFitCheckPost(postId)
            .then(() => {
              navigation.goBack();
              Alert.alert('Post hidden');
            })
            .catch((error) => {
              console.error('Hide post failed:', error);
              Alert.alert('Could not hide post', String(error?.message || 'Try again in a moment.'));
            });
        },
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => {
          if (!/^[0-9a-f-]{36}$/i.test(userId)) {
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
                      navigation.goBack();
                    })
                    .catch((error) => {
                      console.error('Block user failed:', error);
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
          if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}$/i.test(postId)) {
            Alert.alert('Demo post', 'Demo posts can’t be reported yet.');
            return;
          }
          setReportModalVisible(true);
        },
      },
    ]);
  };

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    if (!route.params?.openStyleNotes) return;
    setStyleNotesModalVisible(true);
    navigation.setParams({ openStyleNotes: undefined });
  }, [navigation, route.params?.openStyleNotes]);

  useEffect(() => {
    let active = true;

    const loadDetailData = async () => {
      if (!post?.id) return;

      const [notes, boards] = await Promise.all([
        loadStyleNotes(post.id),
        loadStyleBoards(),
      ]);

      if (!active) return;
      setBoardOptions(boards);
      setStyleNotes(notes.length ? notes : MOCK_STYLE_NOTES);
    };

    void loadDetailData();

    return () => {
      active = false;
    };
  }, [post?.id]);

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Fit Detail</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <View style={styles.missingWrap}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No fit detail found</Text>
            <Text style={styles.emptyCopy}>Go back to Fit Check and open another post.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <SaveFitModal
        visible={saveModalVisible}
        initialSelection={savedCollection}
        options={boardOptions}
        onClose={() => setSaveModalVisible(false)}
        onSave={(collection) => {
          void saveFitCheckPost({
            postId: post.id,
            boardId: collection.id || null,
            boardTitle: collection.title,
          })
            .then((result) => {
              setSavedCollection(result.boardTitle || collection.title);
              setPost((current) => (current ? { ...current, is_saved: true } : current));
              setSaveModalVisible(false);
            })
            .catch((error) => {
              console.error('Fit Check save failed:', error);
              Alert.alert('Could not save fit', 'Try again in a moment.');
            });
        }}
      />
      <FitCheckReportModal
        visible={reportModalVisible}
        loading={reporting}
        targetLabel="post"
        onClose={() => setReportModalVisible(false)}
        onSubmit={({ reason, details }: { reason: FitCheckReportReason; details: string }) => {
          const postId = String(post?.id || '').trim();
          const userId = String(post?.user_id || post?.author_key || '').trim();
          setReporting(true);
          void reportFitCheckPost({
            postId,
            reportedUserId: userId,
            reason,
            details,
          })
            .then(() => {
              setReportModalVisible(false);
              Alert.alert('Report submitted');
            })
            .catch((error) => {
              console.error('Fit Check report failed:', error);
              Alert.alert('Could not submit report', String(error?.message || 'Try again in a moment.'));
            })
            .finally(() => {
              setReporting(false);
            });
        }}
      />
      <FitCheckPostEditModal
        visible={editModalVisible}
        loading={updatingPost}
        initialValues={{
          caption: post.caption || '',
          context: post.context || '',
          weatherLabel: post.weather || '',
          mood: post.mood || '',
        }}
        onClose={() => setEditModalVisible(false)}
        onSave={(values) => {
          if (!post?.id) return;
          setUpdatingPost(true);
          void updateFitCheckPostDetails({
            postId: post.id,
            caption: values.caption,
            context: values.context,
            weatherLabel: values.weatherLabel,
            mood: values.mood,
          })
            .then((updatedPost) => {
              if (updatedPost) {
                setPost(updatedPost);
              }
              setEditModalVisible(false);
            })
            .catch((error) => {
              console.error('Fit Check detail edit failed:', error);
              Alert.alert('Could not update fit', String(error?.message || 'Try again in a moment.'));
            })
            .finally(() => {
              setUpdatingPost(false);
            });
        }}
      />
      <FitCheckPostVisibilityModal
        visible={visibilityModalVisible}
        loading={updatingPost}
        selected={post.visibility || 'Friends'}
        onClose={() => setVisibilityModalVisible(false)}
        onSave={(visibility) => {
          if (!post?.id) return;
          setUpdatingPost(true);
          void updateFitCheckPostVisibility({
            postId: post.id,
            visibility,
          })
            .then((updatedPost) => {
              if (updatedPost) {
                setPost(updatedPost);
              }
              setVisibilityModalVisible(false);
            })
            .catch((error) => {
              console.error('Fit Check visibility update failed:', error);
              Alert.alert('Could not change visibility', String(error?.message || 'Try again in a moment.'));
            })
            .finally(() => {
              setUpdatingPost(false);
            });
        }}
      />
      <RecreateFitModal
        visible={recreateModalVisible}
        post={post}
        onClose={() => setRecreateModalVisible(false)}
      />
      <VerdictModal
        visible={verdictModalVisible}
        postId={post.id}
        isCurrentUser={isCurrentUser}
        onClose={() => setVerdictModalVisible(false)}
      />
      <StyleNotesModal
        visible={styleNotesModalVisible}
        onClose={() => setStyleNotesModalVisible(false)}
        onAdd={(note) => {
          void addStyleNote(post.id, note)
            .then((createdNote) => {
              setStyleNotes((current) => [createdNote, ...current]);
              setStyleNotesModalVisible(false);
            })
            .catch((error) => {
              console.error('Fit Check style note add failed:', error);
              Alert.alert('Could not add style note', 'Try again in a moment.');
            });
        }}
      />

      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Fit Detail</Text>
        {isCurrentUser ? (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleOpenOwnerMenu}
            style={styles.iconButton}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleOpenViewerMenu}
            style={styles.iconButton}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() =>
            navigateToFitProfile(String(post.user_id || post.author_key || post.username || '').trim(), {
              isCurrentUser: isCurrentUser,
              source: 'fit_detail_author',
            })
          }
          style={styles.identityRow}
        >
          {post.avatar_url ? (
            <Image source={{ uri: post.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={styles.identityCopy}>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.timeAgo}>{post.time_ago}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{post.context || 'Fit Check'}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{post.mood || 'Daily'}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{post.weather || 'Weather'}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.heroShell}>
          {post.image_url ? (
            <Image source={{ uri: post.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="image-outline" size={34} color={colors.textMuted} />
            </View>
          )}

          {post.weather ? (
            <View style={styles.weatherPill}>
              <Text style={styles.weatherText}>{post.weather}</Text>
            </View>
          ) : null}

          <View style={styles.heroShade} />
          <View style={styles.heroOverlayCopy}>
            <Text style={styles.heroContext}>{post.context || 'Fit Check'}</Text>
            <Text style={styles.heroMood}>{post.mood || 'Daily fit'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.caption}>{post.caption || 'No caption yet.'}</Text>
          <View style={styles.captionMetaRow}>
            {detailDate ? <Text style={styles.captionMeta}>{detailDate}</Text> : null}
            {post.visibility ? (
              <View style={styles.visibilityPill}>
                <Text style={styles.visibilityText}>{post.visibility}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.quickActionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const previousPost = post;
                const optimistic = buildOptimisticReactionPost(post, hardFitReaction.label);
                setPost(optimistic);

                void toggleFitCheckReaction({
                  postId: post.id,
                  nextReactionLabel: optimistic.active_reaction_label || null,
                }).catch((error) => {
                  console.error('Fit Check detail quick reaction failed:', error);
                  setPost(previousPost);
                  Alert.alert('Could not save reaction', 'Try again in a moment.');
                });
              }}
              style={[
                styles.quickActionButton,
                post.active_reaction_label === hardFitReaction.label && styles.quickActionButtonActive,
              ]}
            >
              <Ionicons
                name={post.active_reaction_label === hardFitReaction.label ? 'heart' : 'heart-outline'}
                size={18}
                color={
                  post.active_reaction_label === hardFitReaction.label
                    ? colors.textOnAccent
                    : colors.textPrimary
                }
              />
              <Text
                style={[
                  styles.quickActionText,
                  post.active_reaction_label === hardFitReaction.label && styles.quickActionTextActive,
                ]}
              >
                {totalReactionCount ? `${totalReactionCount} likes` : 'Like'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setStyleNotesModalVisible(true)}
              style={styles.quickActionButton}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.quickActionText}>
                {styleNotes.length ? `${styleNotes.length} style notes` : 'Style Notes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSaveModalVisible(true)}
              style={[styles.quickActionButton, savedCollection && styles.quickActionButtonActive]}
            >
              <Ionicons
                name={savedCollection ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={savedCollection ? colors.textOnAccent : colors.textPrimary}
              />
              <Text
                style={[
                  styles.quickActionText,
                  savedCollection && styles.quickActionTextActive,
                ]}
              >
                {savedCollection ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pieces in this fit</Text>
          {post.items?.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.piecesRow}
            >
              {post.items?.map((item) => (
                <View key={item.id} style={styles.pieceCard}>
                  <WardrobeItemImage item={item} style={styles.pieceImage} imagePreference="display" />
                  <Text style={styles.pieceName} numberOfLines={1}>
                    {item.name || 'Style Piece'}
                  </Text>
                  {formatItemMetaLabel(item) ? (
                    <Text style={styles.pieceType} numberOfLines={1}>
                      {formatItemMetaLabel(item)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyPiecesCard}>
              <Text style={styles.emptyPiecesTitle}>No pieces attached</Text>
              <Text style={styles.emptyPiecesCopy}>
                This fit was posted without a closet breakdown.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reactions</Text>
          <FitReactionChips
            reactions={post.reactions}
            activeReactionLabels={post.active_reaction_label ? [post.active_reaction_label] : []}
            onPressReaction={(reaction: FitCheckReaction) => {
              const previousPost = post;
              const optimistic = buildOptimisticReactionPost(post, reaction.label);
              setPost(optimistic);

              void toggleFitCheckReaction({
                postId: post.id,
                nextReactionLabel: optimistic.active_reaction_label || null,
              }).catch((error) => {
                console.error('Fit Check detail reaction failed:', error);
                setPost(previousPost);
                Alert.alert('Could not save reaction', 'Try again in a moment.');
              });
            }}
          />
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSaveModalVisible(true)}
            style={[styles.primaryAction, savedCollection && styles.primaryActionSaved]}
          >
            <Ionicons
              name={savedCollection ? 'checkmark-circle' : 'bookmark-outline'}
              size={18}
              color={colors.textOnAccent}
            />
            <Text style={styles.primaryActionText} numberOfLines={1}>
              {savedCollection ? `Saved to ${savedCollection}` : 'Save Fit'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setRecreateModalVisible(true)}
            style={styles.secondaryAction}
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryActionText}>Recreate With My Closet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setVerdictModalVisible(true)}
            style={styles.secondaryAction}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.secondaryActionText}>{verdictButtonLabel}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Style notes</Text>
          <View style={styles.notesCard}>
            {styleNotes.map((note, index) => (
              <View key={`${note.id}-${index}`} style={styles.noteEntry}>
                <View style={styles.noteHeaderRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      navigateToFitProfile(
                        String(note.user_id || note.username || '').trim(),
                        {
                          isCurrentUser: Boolean(note.isCurrentUser),
                          source: 'fit_detail_style_note',
                        },
                      )
                    }
                    style={styles.noteUsernameButton}
                  >
                    <Text style={styles.noteUsername}>
                      @{String(note.username || 'member').trim() || 'member'}
                    </Text>
                  </TouchableOpacity>
                  {formatDetailDate(note.created_at) ? (
                    <Text style={styles.noteTimestamp}>{formatDetailDate(note.created_at)}</Text>
                  ) : null}
                </View>
                <Text style={styles.noteText}>{note.note}</Text>
              </View>
            ))}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setStyleNotesModalVisible(true)}
              style={styles.notesButton}
            >
              <Text style={styles.notesButtonText}>Add Style Note</Text>
            </TouchableOpacity>
          </View>
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
  topBar: {
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  missingWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.textPrimary,
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  emptyCopy: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainer,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  identityCopy: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  timeAgo: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
  },
  metaPillText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  heroShell: {
    height: 520,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    ...shadows.card,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherPill: {
    position: 'absolute',
    top: 18,
    right: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(250, 250, 255, 0.92)',
  },
  weatherText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    top: '54%',
    backgroundColor: 'rgba(10, 10, 10, 0.28)',
  },
  heroOverlayCopy: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  heroContext: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  heroMood: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(250, 250, 255, 0.88)',
    fontFamily: typography.fontFamily,
  },
  section: {
    gap: 14,
  },
  caption: {
    fontSize: 24,
    lineHeight: 34,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  captionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  quickActionRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  quickActionText: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  quickActionTextActive: {
    color: colors.textOnAccent,
  },
  captionMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  visibilityPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  visibilityText: {
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  piecesRow: {
    paddingRight: spacing.lg,
    gap: 12,
  },
  pieceCard: {
    width: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 12,
    ...shadows.card,
  },
  pieceImage: {
    width: '100%',
    height: 108,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
  },
  piecePlaceholder: {
    width: '100%',
    height: 108,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceName: {
    marginTop: 12,
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  pieceType: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  emptyPiecesCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: 16,
    gap: 6,
  },
  emptyPiecesTitle: {
    fontSize: 15,
    lineHeight: 19,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  emptyPiecesCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  primaryAction: {
    minHeight: 60,
    borderRadius: 22,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryActionSaved: {
    opacity: 0.92,
  },
  primaryActionText: {
    fontSize: 15,
    lineHeight: 18,
    color: colors.textOnAccent,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  secondaryAction: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryActionText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  notesCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    gap: 14,
  },
  noteEntry: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  noteUsernameButton: {
    alignSelf: 'flex-start',
  },
  noteUsername: {
    fontSize: 12.5,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  noteTimestamp: {
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  notesButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  notesButtonText: {
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
