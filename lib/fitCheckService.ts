import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { apiPost, readApiResponse } from './api';
import { getFallbackAvatarUrl, resolveProfileAvatarUrl } from './avatar';
import { createActivityEvent } from './activityService';
import {
  filterFitCheckCreatorsForSafety,
  filterFitCheckPostsForSafety,
  loadFitCheckSafetyState,
} from './fitCheckSafetyService';
import { resolvePrivateMediaUrl } from './privateMedia';
import {
  CURRENT_FIT_CHECK_PROFILE_KEY,
  FIT_CHECK_EXPLORE_SECTIONS,
  FIT_CHECK_PROFILE_BOARDS,
  FIT_CHECK_PROFILE_CLOSET_PICKS,
  FIT_CHECK_PROFILE_FITS,
  FIT_CHECK_PROFILE_SOCIAL_STATS,
  getFitCheckFollowState,
  getFitCheckPublicProfile,
  getFitCheckPublicProfileBoards,
  getFitCheckPublicProfilePosts,
  getFitCheckPublicProfileStyle,
} from './fitCheckMock';
import { supabase } from './supabase';
import {
  followUser,
  isRealFollowTarget,
  unfollowUser,
} from '../services/followService';
import { FIT_CHECK_DEMO_SUGGESTED_CREATORS, getExplorePosts } from '../services/fitCheckExploreService';
import type {
  FitCheckBoard,
  FitCheckBoardOption,
  FitCheckCreator,
  FitCheckExploreSection,
  FitCheckItem,
  FitCheckPost,
  FitCheckPublicProfile,
  FitCheckPublicProfileStyle,
  FitCheckReaction,
  FitCheckRecreateResult,
  FitCheckStyleNote,
  FitCheckVisibility,
  ProfileSocialStats,
} from '../types/fitCheck';

const FIT_CHECK_POSTS_BUCKET = 'fit-check-posts';
const FALLBACK_POST_IMAGE =
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_SAVE_BOARD_OPTIONS = ['Saved Fits', 'Campus Fits', 'Date Night', 'Travel Looks'];
const DEFAULT_REACTION_DEFS = [
  { label: 'Hard Fit', emoji: '🔥' },
  { label: 'Clean', emoji: '🧼' },
  { label: 'Wear Again', emoji: '🔁' },
];
const EXTRA_REACTION_EMOJIS: Record<string, string> = {
  'Need This': '⭐',
  Rewear: '♻️',
  'Swap Shoes': '👟',
};

type FitCheckPostRow = {
  id: string;
  user_id: string;
  image_url?: string | null;
  image_path?: string | null;
  caption?: string | null;
  context?: string | null;
  weather_label?: string | null;
  mood?: string | null;
  visibility?: string | null;
  post_date?: string | null;
  items?: unknown;
  created_at: string;
  updated_at?: string | null;
};

type FitCheckReactionRow = {
  post_id: string;
  user_id: string;
  reaction_type: string;
};

type StyleBoardRow = {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  visibility?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
  style_tags?: string[] | null;
  profile_visibility?: string | null;
  public_closet_enabled?: boolean | null;
};

export type FitCheckIdentity = {
  userId: string | null;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  styleTags: string[];
};

export type FitCheckScreenData = {
  currentUserId: string | null;
  currentUsername: string;
  currentAvatarUrl: string;
  hasPostedToday: boolean;
  friendsPosts: FitCheckPost[];
  followingPosts: FitCheckPost[];
  followingCreators: FitCheckCreator[];
  exploreSections: FitCheckExploreSection[];
  suggestedPeople: FitCheckCreator[];
  exploreIsDemo: boolean;
  followState: Record<string, boolean>;
  blockedUserIds: string[];
};

export type PublicFitCheckProfileData = {
  profile: FitCheckPublicProfile | null;
  posts: FitCheckPost[];
  boards: FitCheckBoard[];
  closetPicks: FitCheckItem[];
  style: FitCheckPublicProfileStyle | null;
  isFollowing: boolean;
  isBlocked: boolean;
  isPrivateProfile: boolean;
  resolvedProfileKey: string | null;
};

export type CurrentProfileFitCheckSnapshot = {
  socialStats: ProfileSocialStats;
  fits: FitCheckPost[];
  boards: FitCheckBoard[];
  closetPicks: FitCheckItem[];
};

function isLikelyUuid(value?: string | null) {
  return UUID_RE.test(String(value || '').trim());
}

function isRemoteUrl(value?: string | null) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeReactionType(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Hard Fit';
  const match = [...DEFAULT_REACTION_DEFS, ...Object.entries(EXTRA_REACTION_EMOJIS).map(([label, emoji]) => ({ label, emoji }))].find(
    (entry) => entry.label.toLowerCase() === normalized,
  );
  if (match) return match.label;
  return String(value || '').trim();
}

function getReactionEmoji(label: string) {
  const match = DEFAULT_REACTION_DEFS.find((entry) => entry.label === label);
  if (match) return match.emoji;
  return EXTRA_REACTION_EMOJIS[label] || '✨';
}

function visibilityFromDb(value?: string | null): FitCheckVisibility {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'public') return 'Public';
  if (normalized === 'followers') return 'Followers';
  return 'Friends';
}

function visibilityToDb(value?: FitCheckVisibility | string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'public') return 'public';
  if (normalized === 'followers') return 'followers';
  return 'friends';
}

function formatTimeAgo(value?: string | null) {
  const timestamp = String(value || '').trim();
  if (!timestamp) return 'now';
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return 'now';
  const deltaMs = Date.now() - time;
  if (deltaMs < 60_000) return 'now';
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function hasMissingProfileColumn(message: string, field: string) {
  const normalized = String(message || '').toLowerCase();
  const normalizedField = String(field || '').toLowerCase();
  return normalized.includes(normalizedField) && normalized.includes('profiles');
}

function isMissingSchemaError(message: string, field: string) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes(String(field || '').toLowerCase()) && normalized.includes('profiles');
}

function normalizeFitCheckItem(raw: any): FitCheckItem {
  return {
    id: String(raw?.id || `fit-item-${Math.random().toString(36).slice(2)}`),
    name: String(raw?.name || 'Style Piece'),
    image_url: String(raw?.image_url || '').trim() || null,
    image_path: String(raw?.image_path || '').trim() || null,
    thumbnail_url: String(raw?.thumbnail_url || '').trim() || null,
    display_image_url: String(raw?.display_image_url || '').trim() || null,
    original_image_url: String(raw?.original_image_url || '').trim() || null,
    cutout_image_url: String(raw?.cutout_image_url || '').trim() || null,
    cutout_thumbnail_url: String(raw?.cutout_thumbnail_url || '').trim() || null,
    cutout_display_url: String(raw?.cutout_display_url || '').trim() || null,
    main_category: String(raw?.main_category || '').trim() || null,
    type: String(raw?.type || '').trim() || null,
    source_type:
      raw?.source_type === 'wardrobe' || raw?.source_type === 'external' ? raw.source_type : null,
    source_item_id: String(raw?.source_item_id || '').trim() || null,
    reason: String(raw?.reason || '').trim() || null,
    brand: String(raw?.brand || '').trim() || null,
    retailer: String(raw?.retailer || '').trim() || null,
    product_url: String(raw?.product_url || '').trim() || null,
    price: Number.isFinite(Number(raw?.price)) ? Number(raw.price) : null,
    primary_color: String(raw?.primary_color || '').trim() || null,
    secondary_colors: Array.isArray(raw?.secondary_colors)
      ? raw.secondary_colors.map((entry: any) => String(entry || '').trim()).filter(Boolean)
      : null,
    vibe_tags: Array.isArray(raw?.vibe_tags)
      ? raw.vibe_tags.map((entry: any) => String(entry || '').trim()).filter(Boolean)
      : null,
    pattern_description: String(raw?.pattern_description || '').trim() || null,
    season: Array.isArray(raw?.season)
      ? raw.season.map((entry: any) => String(entry || '').trim()).filter(Boolean)
      : typeof raw?.season === 'string'
        ? raw.season
            .split(/[|,/]+/)
            .map((entry: string) => String(entry || '').trim())
            .filter(Boolean)
        : null,
    silhouette: String(raw?.silhouette || '').trim() || null,
    fit_style: String(raw?.fit_style || '').trim() || null,
    material: String(raw?.material || '').trim() || null,
    formality: String(raw?.formality || '').trim() || null,
    shoe_type: String(raw?.shoe_type || '').trim() || null,
    style_family: String(raw?.style_family || '').trim() || null,
    graphic_intensity: String(raw?.graphic_intensity || '').trim() || null,
  };
}

const FIT_POST_ITEM_SNAPSHOT_FIELDS = [
  'id',
  'name',
  'type',
  'main_category',
  'primary_color',
  'secondary_colors',
  'pattern_description',
  'vibe_tags',
  'season',
  'image_url',
  'cutout_image_url',
  'brand',
  'retailer',
  'product_url',
  'price',
  'silhouette',
  'fit_style',
  'material',
  'formality',
  'shoe_type',
  'style_family',
  'graphic_intensity',
] as const;

function buildFitPostItemRole(item: FitCheckItem) {
  const category = String(item.main_category || item.type || '').trim().toLowerCase();
  if (!category) return null;
  if (category === 'outerwear' || category === 'layer') return 'layer';
  return category;
}

function buildFitPostItemSnapshot(item: FitCheckItem) {
  const normalized = normalizeFitCheckItem(item);
  return FIT_POST_ITEM_SNAPSHOT_FIELDS.reduce<Record<string, any>>((snapshot, field) => {
    const value = normalized[field];
    if (value == null) return snapshot;
    if (Array.isArray(value) && value.length === 0) return snapshot;
    snapshot[field] = value;
    return snapshot;
  }, {});
}

function buildFitPostItemRows(postId: string, items: FitCheckItem[]) {
  return items.map((item, index) => {
    const wardrobeItemId = isLikelyUuid(item.source_item_id)
      ? item.source_item_id
      : isLikelyUuid(item.id)
        ? item.id
        : null;

    return {
      post_id: postId,
      wardrobe_item_id: wardrobeItemId,
      role: buildFitPostItemRole(item),
      item_snapshot: {
        ...buildFitPostItemSnapshot(item),
        id: String(item.source_item_id || item.id || `fit-item-${index + 1}`).trim(),
      },
    };
  });
}

function parseItems(value: unknown): FitCheckItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeFitCheckItem(item));
}

function buildReactionList(
  rows: FitCheckReactionRow[],
  currentUserId?: string | null,
): { reactions: FitCheckReaction[]; activeReactionLabel?: string | null } {
  const counts = new Map<string, number>();
  let activeReactionLabel: string | null = null;

  rows.forEach((row) => {
    const label = normalizeReactionType(row.reaction_type);
    counts.set(label, (counts.get(label) || 0) + 1);
    if (currentUserId && row.user_id === currentUserId) {
      activeReactionLabel = label;
    }
  });

  const orderedLabels = [
    ...DEFAULT_REACTION_DEFS.map((entry) => entry.label),
    ...Array.from(counts.keys()).filter(
      (label) => !DEFAULT_REACTION_DEFS.some((entry) => entry.label === label),
    ),
  ];

  return {
    activeReactionLabel,
    reactions: orderedLabels.map((label) => ({
      label,
      emoji: getReactionEmoji(label),
      count: counts.get(label) || 0,
    })),
  };
}

function buildOptimisticReactions(
  reactions: FitCheckReaction[],
  currentLabel: string | null | undefined,
  nextLabel: string,
) {
  const normalizedCurrent = currentLabel || null;
  const normalizedNext = normalizedCurrent === nextLabel ? null : nextLabel;

  return {
    activeReactionLabel: normalizedNext,
    reactions: reactions.map((reaction) => {
      let nextCount = reaction.count;
      if (normalizedCurrent && reaction.label === normalizedCurrent) {
        nextCount = Math.max(0, nextCount - 1);
      }
      if (normalizedNext && reaction.label === normalizedNext) {
        nextCount += 1;
      }
      return {
        ...reaction,
        count: nextCount,
      };
    }),
  };
}

async function selectProfilesByIds(userIds: string[]) {
  if (!userIds.length) return [] as ProfileRow[];

  const directSelect = async (ids: string[]) => {
    let response: any = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url, avatar_path, style_tags')
      .in('id', ids);

    if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
      response = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url, style_tags')
        .in('id', ids);
    }

    if (response.error && hasMissingProfileColumn(response.error.message, 'bio')) {
      response = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, style_tags')
        .in('id', ids);
    }

    if (response.error) {
      console.warn('Fit Check profile lookup failed:', response.error.message);
      return [] as ProfileRow[];
    }

    return (response.data || []) as ProfileRow[];
  };

  let response: any = await supabase.rpc('get_public_profiles_by_ids', { profile_ids: userIds });

  if (!response.error) {
    const rpcRows = (response.data || []) as ProfileRow[];
    const needsEnrichmentIds = rpcRows
      .filter((row) =>
        row?.id &&
        (
          typeof (row as any)?.avatar_path === 'undefined' ||
          typeof row?.bio === 'undefined' ||
          typeof row?.style_tags === 'undefined' ||
          (!String(row.avatar_url || '').trim() && !String((row as any)?.avatar_path || '').trim())
        ),
      )
      .map((row) => String(row.id).trim())
      .filter(Boolean);

    if (!needsEnrichmentIds.length) {
      return rpcRows;
    }

    const enrichedRows = await directSelect(needsEnrichmentIds);
    const enrichedMap = new Map(enrichedRows.map((row) => [String(row.id).trim(), row]));

    return rpcRows.map((row) => {
      const enriched = enrichedMap.get(String(row?.id || '').trim());
      return enriched ? { ...row, ...enriched } : row;
    });
  }

  return directSelect(userIds);
}

async function selectProfileByKey(profileKey: string) {
  const key = String(profileKey || '').trim();
  if (!key) return null as ProfileRow | null;

  const profileFields = 'id, username, full_name, bio, avatar_url, avatar_path, style_tags, profile_visibility, public_closet_enabled';
  const fallbackFields = 'id, username, full_name, bio, avatar_url, style_tags, profile_visibility, public_closet_enabled';
  const legacyFields = 'id, username, full_name, avatar_url, style_tags, profile_visibility, public_closet_enabled';

  const runLookup = async (field: 'id' | 'username') => {
    let response: any = await supabase.from('profiles').select(profileFields).eq(field, key).maybeSingle();

    if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
      response = await supabase.from('profiles').select(fallbackFields).eq(field, key).maybeSingle();
    }

    if (response.error && hasMissingProfileColumn(response.error.message, 'bio')) {
      response = await supabase.from('profiles').select(legacyFields).eq(field, key).maybeSingle();
    }

    if (response.error) return null;
    return (response.data || null) as ProfileRow | null;
  };

  const rpcResponse: any = await supabase.rpc('get_public_profile_by_key', { profile_key: key });
  if (!rpcResponse.error) {
    const row = (Array.isArray(rpcResponse.data) ? rpcResponse.data[0] : rpcResponse.data) as ProfileRow | null;
    if (!row?.id) {
      const byId = isLikelyUuid(key) ? await runLookup('id') : null;
      if (byId) return byId;
      return runLookup('username');
    }

    const needsEnrichment =
      !String(row.avatar_url || '').trim() ||
      !String((row as any)?.avatar_path || '').trim() ||
      typeof row.profile_visibility === 'undefined' ||
      typeof row.public_closet_enabled === 'undefined' ||
      typeof row.bio === 'undefined';

    if (!needsEnrichment) {
      return row;
    }

    const enriched = await runLookup('id');
    return enriched ? { ...row, ...enriched } : row;
  }

  const byId = isLikelyUuid(key) ? await runLookup('id') : null;
  if (byId) return byId;
  return runLookup('username');
}

async function selectProfilePrivacyByKey(profileKey: string) {
  const key = String(profileKey || '').trim();
  if (!key) return null as { id: string; profile_visibility?: string | null; public_closet_enabled?: boolean | null } | null;

  const runLookup = async (field: 'id' | 'username') => {
    let response: any = await supabase
      .from('profiles')
      .select('id, profile_visibility, public_closet_enabled')
      .eq(field, key)
      .maybeSingle();

    if (response.error && hasMissingProfileColumn(response.error.message, 'public_closet_enabled')) {
      response = await supabase
        .from('profiles')
        .select('id, profile_visibility')
        .eq(field, key)
        .maybeSingle();
    }

    if (response.error && hasMissingProfileColumn(response.error.message, 'profile_visibility')) {
      response = await supabase
        .from('profiles')
        .select('id')
        .eq(field, key)
        .maybeSingle();
    }

    if (response.error) return null;
    return response.data || null;
  };

  const byId = isLikelyUuid(key) ? await runLookup('id') : null;
  if (byId) return byId;
  return runLookup('username');
}

async function loadPublicClosetPicks(userId: string): Promise<FitCheckItem[]> {
  const profileSelect =
    'id, name, type, main_category, image_url, image_path, thumbnail_url, display_image_url, original_image_url, cutout_image_url, cutout_thumbnail_url, cutout_display_url, primary_color, secondary_colors, vibe_tags, pattern_description, season, retailer, brand, product_url, price';
  const fallbackSelect =
    'id, name, type, main_category, image_url, image_path, cutout_image_url, primary_color, secondary_colors, vibe_tags, pattern_description, season, retailer, brand, product_url, price';

  let response: any = await supabase
    .from('wardrobe')
    .select(profileSelect)
    .eq('user_id', userId)
    .neq('wardrobe_status', 'scanned_candidate')
    .order('created_at', { ascending: false })
    .limit(18);

  if (response.error && hasMissingProfileColumn(response.error.message, 'cutout_display_url')) {
    response = await supabase
      .from('wardrobe')
      .select(fallbackSelect)
      .eq('user_id', userId)
      .neq('wardrobe_status', 'scanned_candidate')
      .order('created_at', { ascending: false })
      .limit(18);
  }

  if (response.error) {
    console.warn('Public closet picks load failed:', response.error.message);
    return [];
  }

  return ((response.data || []) as any[]).map((item) => ({
    id: String(item.id || ''),
    name: String(item.name || item.type || 'Closet item').trim(),
    image_url: String(item.image_url || '').trim() || null,
    image_path: String(item.image_path || '').trim() || null,
    thumbnail_url: String(item.thumbnail_url || '').trim() || null,
    display_image_url: String(item.display_image_url || '').trim() || null,
    original_image_url: String(item.original_image_url || '').trim() || null,
    cutout_image_url: String(item.cutout_image_url || '').trim() || null,
    cutout_thumbnail_url: String(item.cutout_thumbnail_url || '').trim() || null,
    cutout_display_url: String(item.cutout_display_url || '').trim() || null,
    main_category: String(item.main_category || '').trim() || null,
    type: String(item.type || '').trim() || null,
    brand: String(item.brand || '').trim() || null,
    retailer: String(item.retailer || '').trim() || null,
    product_url: String(item.product_url || '').trim() || null,
    price: item.price == null ? null : Number(item.price),
    primary_color: String(item.primary_color || '').trim() || null,
    secondary_colors: Array.isArray(item.secondary_colors) ? item.secondary_colors.filter(Boolean) : [],
    vibe_tags: Array.isArray(item.vibe_tags) ? item.vibe_tags.filter(Boolean) : [],
    pattern_description: String(item.pattern_description || '').trim() || null,
    season: Array.isArray(item.season)
      ? item.season.filter(Boolean)
      : String(item.season || '').trim()
        ? [String(item.season).trim()]
        : null,
  })) as FitCheckItem[];
}

async function runProfileSearchQuery(
  configure: (fields: string) => PromiseLike<any>,
) {
  let response: any = await configure('id, username, full_name, bio, avatar_url, avatar_path, style_tags');

  if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
    response = await configure('id, username, full_name, bio, avatar_url, style_tags');
  }

  if (response.error && hasMissingProfileColumn(response.error.message, 'bio')) {
    response = await configure('id, username, full_name, avatar_url, style_tags');
  }

  if (response.error && isMissingSchemaError(response.error.message, 'style_tags')) {
    response = await configure('id, username, full_name, bio, avatar_url');
  }

  if (response.error) {
    console.warn('Fit Check profile search failed:', response.error.message);
    return [] as ProfileRow[];
  }

  return (response.data || []) as ProfileRow[];
}

async function resolveProfileAvatar(profile?: ProfileRow | null) {
  return resolveProfileAvatarUrl(profile);
}

async function uploadPostImage(uri: string, userId: string) {
  let uploadUri = String(uri || '').trim();

  try {
    const normalized = await ImageManipulator.manipulateAsync(uploadUri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    uploadUri = String(normalized?.uri || '').trim() || uploadUri;
  } catch (error) {
    console.warn('Fit Check image normalization skipped:', error);
  }

  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const imagePath = `${userId}/${fileName}`;
  const fileData = await FileSystem.readAsStringAsync(uploadUri, {
    encoding: 'base64' as any,
  });

  const { error } = await supabase.storage.from(FIT_CHECK_POSTS_BUCKET).upload(imagePath, decode(fileData), {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return imagePath;
}

async function uploadRemotePostImage(remoteUrl: string, userId: string) {
  const baseDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDirectory) {
    throw new Error('No local cache directory is available for Fit Check uploads.');
  }

  const tempUri = `${baseDirectory}fit-check-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const download = await FileSystem.downloadAsync(remoteUrl, tempUri);
  if (download.status < 200 || download.status >= 300) {
    throw new Error(`Could not prepare this image for Fit Check (${download.status}).`);
  }

  try {
    return await uploadPostImage(download.uri, userId);
  } finally {
    await FileSystem.deleteAsync(download.uri, { idempotent: true }).catch(() => undefined);
  }
}

async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('You need to be signed in to use Fit Check.');
  }

  return user;
}

async function hydratePosts(rows: FitCheckPostRow[], currentUserId?: string | null) {
  if (!rows.length) return [] as FitCheckPost[];

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const postIds = rows.map((row) => row.id);

  const [profiles, reactionResponse, saveResponse] = await Promise.all([
    selectProfilesByIds(userIds),
    supabase
      .from('fit_check_reactions')
      .select('post_id, user_id, reaction_type')
      .in('post_id', postIds)
      .then(({ data, error }) => {
        if (error) {
          console.warn('Fit Check reaction hydration failed:', error.message);
          return [] as FitCheckReactionRow[];
        }
        return (data || []) as FitCheckReactionRow[];
      }),
    currentUserId
      ? supabase
          .from('fit_check_saves')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Fit Check save hydration failed:', error.message);
              return [] as Array<{ post_id: string }>;
            }
            return data || [];
          })
      : Promise.resolve([] as Array<{ post_id: string }>),
  ]);

  const profileMap = new Map<string, ProfileRow>();
  const avatarMap = new Map<string, string>();
  await Promise.all(
    profiles.map(async (profile) => {
      profileMap.set(profile.id, profile);
      avatarMap.set(profile.id, await resolveProfileAvatar(profile));
    }),
  );

  const reactionsByPost = new Map<string, FitCheckReactionRow[]>();
  reactionResponse.forEach((row) => {
    const current = reactionsByPost.get(row.post_id) || [];
    current.push(row);
    reactionsByPost.set(row.post_id, current);
  });

  const savedPostIds = new Set(saveResponse.map((row) => row.post_id));

  const hydrated = await Promise.all(
    rows.map(async (row) => {
      const profile = profileMap.get(row.user_id);
      const reactionData = buildReactionList(reactionsByPost.get(row.id) || [], currentUserId);
      const imageUrl = row.image_path
        ? await resolvePrivateMediaUrl({
            path: row.image_path,
            bucket: FIT_CHECK_POSTS_BUCKET,
          }).catch(() => row.image_url || null)
        : String(row.image_url || '').trim() || null;

      return {
        id: row.id,
        user_id: row.user_id,
        username:
          String(profile?.username || '').trim() ||
          String(profile?.full_name || '').trim() ||
          `member-${row.user_id.slice(0, 6)}`,
        avatar_url: avatarMap.get(row.user_id) || null,
        author_key: row.user_id,
        image_url: imageUrl || FALLBACK_POST_IMAGE,
        image_path: row.image_path || null,
        time_ago: formatTimeAgo(row.created_at),
        context: String(row.context || '').trim() || 'Fit Check',
        caption: String(row.caption || '').trim() || 'No caption yet.',
        weather: String(row.weather_label || '').trim() || 'Weather',
        visibility: visibilityFromDb(row.visibility),
        mood: String(row.mood || '').trim() || 'Daily',
        reactions: reactionData.reactions,
        active_reaction_label: reactionData.activeReactionLabel,
        items: parseItems(row.items),
        created_at: row.created_at,
        isCurrentUser: currentUserId === row.user_id,
        is_own_post: currentUserId === row.user_id,
        style_tags: Array.isArray(profile?.style_tags) ? profile.style_tags.filter(Boolean) : [],
        is_saved: savedPostIds.has(row.id),
      } as FitCheckPost;
    }),
  );

  return hydrated.sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

function groupPostsByAuthor(posts: FitCheckPost[]) {
  const grouped = new Map<string, FitCheckPost[]>();
  posts.forEach((post) => {
    const key = String(post.author_key || post.user_id || post.username);
    const current = grouped.get(key) || [];
    current.push(post);
    grouped.set(key, current);
  });
  return grouped;
}

function overlapScore(values: string[], targets: string[]) {
  const targetSet = new Set(targets.map((value) => value.toLowerCase()));
  return values.reduce((score, value) => score + Number(targetSet.has(value.toLowerCase())), 0);
}

function matchesKeyword(post: FitCheckPost, keywords: string[]) {
  const haystack = [
    post.context,
    post.caption,
    post.weather,
    post.mood,
    ...(post.style_tags || []),
  ]
    .join(' ')
    .toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword));
}

function buildCreatorsFromPosts(posts: FitCheckPost[]) {
  const creators = new Map<string, FitCheckCreator>();
  posts.forEach((post) => {
    const key = String(post.author_key || post.user_id || post.username);
    if (!creators.has(key)) {
      creators.set(key, {
        id: key,
        username: post.username,
        display_name: post.username,
        avatar_url: post.avatar_url,
        style_tags: post.style_tags || [],
        label: 'Fit Check',
        bio: post.caption,
      });
    }
  });
  return Array.from(creators.values());
}

function buildExploreSections(posts: FitCheckPost[], currentStyleTags: string[]) {
  if (posts.length < 5) {
    return FIT_CHECK_EXPLORE_SECTIONS;
  }

  const byAuthor = groupPostsByAuthor(posts);
  const creators = buildCreatorsFromPosts(posts);
  const trendingPosts = [...posts]
    .sort((left, right) => {
      const leftScore = left.reactions.reduce((total, reaction) => total + reaction.count, 0);
      const rightScore = right.reactions.reduce((total, reaction) => total + reaction.count, 0);
      return rightScore - leftScore;
    })
    .slice(0, 6);
  const campusPosts = posts.filter((post) =>
    matchesKeyword(post, ['campus', 'lecture', 'class', 'library', 'school']),
  );
  const streetwearPosts = posts.filter((post) =>
    matchesKeyword(post, ['streetwear', 'sneaker', 'cargo', 'denim', 'editorial']),
  );
  const creatorPosts = posts.filter((post) => {
    const authorCount = byAuthor.get(String(post.author_key || post.user_id || post.username))?.length || 0;
    return authorCount > 1 || matchesKeyword(post, ['creator', 'editorial', 'drop']);
  });
  const styleMatchCreators = [...creators]
    .sort((left, right) => {
      const scoreDelta =
        overlapScore(right.style_tags || [], currentStyleTags) -
        overlapScore(left.style_tags || [], currentStyleTags);
      if (scoreDelta !== 0) return scoreDelta;
      return left.username.localeCompare(right.username);
    })
    .slice(0, 6);

  return [
    {
      key: 'trending',
      title: 'Trending today',
      subtitle: 'The fits getting the strongest fashion reactions right now.',
      posts: trendingPosts.length ? trendingPosts : posts.slice(0, 6),
      creators: [],
    },
    {
      key: 'campus',
      title: 'Campus fits',
      subtitle: 'Daily looks built for moving fast without looking flat.',
      posts: campusPosts.length ? campusPosts.slice(0, 6) : posts.slice(0, 6),
      creators: [],
    },
    {
      key: 'streetwear',
      title: 'Streetwear',
      subtitle: 'Heavier silhouettes, stronger texture, easier layers.',
      posts: streetwearPosts.length ? streetwearPosts.slice(0, 6) : posts.slice(0, 6),
      creators: [],
    },
    {
      key: 'style-match',
      title: 'People with your style',
      subtitle: 'Creators and dressers with signals that overlap your profile.',
      posts: [],
      creators: styleMatchCreators.length ? styleMatchCreators : creators.slice(0, 6),
    },
    {
      key: 'creators',
      title: 'Influencer drops',
      subtitle: 'Higher-signal creator looks worth saving or recreating.',
      posts: creatorPosts.length ? creatorPosts.slice(0, 6) : posts.slice(0, 6),
      creators: [],
    },
  ];
}

async function fetchCurrentUserIdentity(): Promise<FitCheckIdentity> {
  const user = await getCurrentUserOrThrow();
  const profile = await selectProfileByKey(user.id);
  return {
    userId: user.id,
    username: String(profile?.username || '').trim() || 'you',
    displayName:
      String(profile?.full_name || '').trim() ||
      String(profile?.username || '').trim() ||
      'You',
    avatarUrl: await resolveProfileAvatar(profile),
    bio: String(profile?.bio || '').trim() || undefined,
    styleTags: Array.isArray(profile?.style_tags) ? profile.style_tags.filter(Boolean) : [],
  };
}

export async function searchFitCheckProfiles(query: string): Promise<FitCheckCreator[]> {
  const trimmedQuery = String(query || '').trim();
  if (trimmedQuery.length < 2) return [];

  const normalizedTagQuery = trimmedQuery.toLowerCase();
  const queryLower = trimmedQuery.toLowerCase();
  const currentUser = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as any));
  const currentUserId = currentUser?.data?.user?.id || null;
  const safety = await loadFitCheckSafetyState();

  const scoreProfileMatch = (profile: Pick<ProfileRow, 'username' | 'full_name' | 'style_tags' | 'bio'>) => {
    const username = String(profile.username || '').trim();
    const fullName = String(profile.full_name || '').trim();
    const styleTags = Array.isArray(profile.style_tags) ? profile.style_tags.filter(Boolean) : [];
    const bio = String(profile.bio || '').trim();
    let score = 0;

    if (username.toLowerCase() === queryLower) score += 100;
    else if (username.toLowerCase().startsWith(queryLower)) score += 60;
    else if (username.toLowerCase().includes(queryLower)) score += 40;
    if (fullName.toLowerCase() === queryLower) score += 90;
    else if (fullName.toLowerCase().startsWith(queryLower)) score += 55;
    else if (fullName.toLowerCase().includes(queryLower)) score += 30;
    if (styleTags.some((tag) => String(tag).toLowerCase() === queryLower)) score += 24;
    else if (styleTags.some((tag) => String(tag).toLowerCase().includes(queryLower))) score += 12;
    if (bio.toLowerCase().includes(queryLower)) score += 8;

    return score;
  };

  let mergedProfiles: ProfileRow[] = [];
  const rpcResponse: any = await supabase.rpc('search_public_profiles', {
    search_query: trimmedQuery,
    result_limit: 20,
  });

  if (!rpcResponse.error && Array.isArray(rpcResponse.data) && rpcResponse.data.length) {
    mergedProfiles = ((rpcResponse.data || []) as ProfileRow[])
      .filter((profile) => String(profile?.id || '').trim())
      .filter((profile) => !currentUserId || String(profile.id) !== currentUserId);
  } else {
    const buildQuery = (
      fields: string,
      callback: (queryBuilder: any) => any,
    ) => {
      let queryBuilder = supabase.from('profiles').select(fields).limit(20);
      if (currentUserId) {
        queryBuilder = queryBuilder.neq('id', currentUserId);
      }
      return callback(queryBuilder);
    };

    const [usernameRows, fullNameRows, styleTagRows] = await Promise.all([
      runProfileSearchQuery((fields) =>
        buildQuery(fields, (queryBuilder) => queryBuilder.ilike('username', `%${trimmedQuery}%`)),
      ),
      runProfileSearchQuery((fields) =>
        buildQuery(fields, (queryBuilder) => queryBuilder.ilike('full_name', `%${trimmedQuery}%`)),
      ),
      runProfileSearchQuery((fields) =>
        buildQuery(fields, (queryBuilder) =>
          queryBuilder.contains('style_tags', [normalizedTagQuery]),
        ),
      ).catch(() => [] as ProfileRow[]),
    ]);

    mergedProfiles = Array.from(
      new Map(
        [...usernameRows, ...fullNameRows, ...styleTagRows]
          .filter((profile) => String(profile?.id || '').trim())
          .map((profile) => [String(profile.id), profile]),
      ).values(),
    );
  }

  if (mergedProfiles.length) {
    const enrichedProfiles = await selectProfilesByIds(
      mergedProfiles.map((profile) => String(profile?.id || '').trim()).filter(Boolean),
    );

    if (enrichedProfiles.length) {
      const enrichedMap = new Map(
        enrichedProfiles.map((profile) => [String(profile.id || '').trim(), profile]),
      );

      mergedProfiles = mergedProfiles.map((profile) => {
        const enriched = enrichedMap.get(String(profile?.id || '').trim());
        return enriched ? { ...profile, ...enriched } : profile;
      });
    }
  }

  const scoredProfiles = await Promise.all(
    mergedProfiles.map(async (profile) => {
      const username = String(profile.username || '').trim();
      const fullName = String(profile.full_name || '').trim();
      const styleTags = Array.isArray(profile.style_tags) ? profile.style_tags.filter(Boolean) : [];
      const bio = String(profile.bio || '').trim();
      const score = scoreProfileMatch(profile);

      return {
        id: profile.id,
        username: username || `member-${profile.id.slice(0, 6)}`,
        display_name: fullName || username || 'Fit Check member',
        avatar_url: await resolveProfileAvatar(profile),
        style_tags: styleTags,
        label: 'Profile',
        bio: bio || (styleTags.length ? styleTags.slice(0, 3).join(' • ') : undefined),
        score,
      } as FitCheckCreator & { score: number };
    }),
  );

  const sortedProfiles = scoredProfiles
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.username.localeCompare(right.username);
    })
    .slice(0, 20)
    .map(({ score: _score, ...creator }) => creator)
    .filter((creator) => !safety.blockedUserIds.has(String(creator.id || '').trim()));

  if (!currentUserId) {
    return sortedProfiles;
  }

  try {
    const currentProfile = await selectProfileByKey(currentUserId);
    if (!currentProfile?.id) {
      return sortedProfiles;
    }

    const selfScore = scoreProfileMatch(currentProfile);
    if (selfScore <= 0) {
      return sortedProfiles;
    }

    const selfCreator: FitCheckCreator = {
      id: currentProfile.id,
      username:
        String(currentProfile.username || '').trim() ||
        `member-${String(currentProfile.id || '').slice(0, 6)}`,
      display_name:
        String(currentProfile.full_name || '').trim() ||
        String(currentProfile.username || '').trim() ||
        'You',
      avatar_url: await resolveProfileAvatar(currentProfile),
      style_tags: Array.isArray(currentProfile.style_tags) ? currentProfile.style_tags.filter(Boolean) : [],
      label: 'You',
      bio: String(currentProfile.bio || '').trim() || undefined,
    };

    return [
      selfCreator,
      ...sortedProfiles.filter((creator) => String(creator.id || '').trim() !== currentUserId),
    ].slice(0, 20);
  } catch (error) {
    console.warn('Could not prepend self to Fit Check profile search:', error);
    return sortedProfiles;
  }
}

export async function createFitCheckPost({
  source,
  imageUri,
  caption,
  context,
  weatherLabel,
  mood,
  visibility,
  items,
}: {
  source: string;
  imageUri?: string | null;
  caption?: string | null;
  context?: string | null;
  weatherLabel?: string | null;
  mood?: string | null;
  visibility?: FitCheckVisibility | string | null;
  items?: FitCheckItem[];
}) {
  const user = await getCurrentUserOrThrow();
  const normalizedImageUri = String(imageUri || '').trim();
  const normalizedItems = Array.isArray(items) ? items.map((item) => normalizeFitCheckItem(item)) : [];

  let imagePath: string | null = null;
  let imageUrl: string | null = null;

  if (normalizedImageUri && !isRemoteUrl(normalizedImageUri)) {
    try {
      imagePath = await uploadPostImage(normalizedImageUri, user.id);
    } catch (error: any) {
      throw new Error(
        `Could not upload the selected fit image${String(error?.message || '').trim() ? `: ${String(error.message).trim()}` : '.'}`,
      );
    }
  } else if (normalizedImageUri) {
    try {
      imagePath = await uploadRemotePostImage(normalizedImageUri, user.id);
    } catch (error: any) {
      throw new Error(
        `Could not prepare the selected fit image${String(error?.message || '').trim() ? `: ${String(error.message).trim()}` : '.'}`,
      );
    }
  } else if (!normalizedImageUri) {
    imageUrl = __DEV__ ? FALLBACK_POST_IMAGE : null;
  }

  const payload = {
    user_id: user.id,
    image_url: imageUrl,
    image_path: imagePath,
    caption: String(caption || '').trim() || 'Simple fit for class today',
    context: String(context || '').trim() || 'Campus',
    weather_label: String(weatherLabel || '').trim() || '72°F Sunny',
    mood: String(mood || '').trim() || 'Chill',
    visibility: visibilityToDb(visibility),
    post_date: toLocalDateString(),
    items: normalizedItems,
  };

  const { data, error } = await supabase
    .from('fit_check_posts')
    .insert(payload)
    .select('id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (normalizedItems.length && data?.id) {
    const snapshotRows = buildFitPostItemRows(data.id, normalizedItems);
    const { error: snapshotError } = await supabase.from('fit_post_items').insert(snapshotRows);

    if (snapshotError) {
      console.warn('fit_post_items snapshot insert skipped:', snapshotError.message);
    }
  }

  let hydratedPost: FitCheckPost | null = null;
  try {
    const hydratedPosts = await hydratePosts([(data || null) as FitCheckPostRow].filter(Boolean), user.id);
    hydratedPost = hydratedPosts[0] || null;
  } catch (error) {
    console.warn('Fit Check post hydration failed:', error);
  }

  const fallbackResolvedImageUrl =
    hydratedPost?.image_url ||
    (imagePath
      ? await resolvePrivateMediaUrl({
          path: imagePath,
          bucket: FIT_CHECK_POSTS_BUCKET,
        }).catch(() => null)
      : null) ||
    imageUrl ||
    null;

  void createActivityEvent({
    recipientId: user.id,
    eventType: 'fit_check_posted',
    postId: data.id,
    metadata: {
      context: payload.context,
      visibility: visibilityFromDb(payload.visibility),
      source,
    },
  }).catch((error) => {
    console.warn('Fit Check post activity event failed:', error);
  });

  return (
    hydratedPost || {
      id: data.id,
      user_id: user.id,
      username: 'you',
      avatar_url: null,
      author_key: user.id,
      image_url: fallbackResolvedImageUrl || FALLBACK_POST_IMAGE,
      image_path: imagePath,
      time_ago: 'now',
      context: payload.context,
      caption: payload.caption,
      weather: payload.weather_label,
      visibility: visibilityFromDb(payload.visibility),
      mood: payload.mood,
      reactions: [],
      items: normalizedItems,
      created_at: String(data.created_at || new Date().toISOString()),
      isCurrentUser: true,
      is_own_post: true,
      style_tags: [],
      is_saved: false,
    }
  );
}

export async function recreateFitCheckPost({
  postId,
  contextOverride,
  variationIndex,
}: {
  postId: string;
  contextOverride?: string | null;
  variationIndex?: number | null;
}): Promise<FitCheckRecreateResult> {
  const response = await apiPost('/fit-check/recreate', {
    post_id: postId,
    ...(String(contextOverride || '').trim() ? { context_override: String(contextOverride).trim() } : {}),
    ...(Number.isFinite(Number(variationIndex)) ? { variation_index: Number(variationIndex) } : {}),
  });
  const payload = await readApiResponse<any>(response);

  if (!response.ok) {
    throw new Error(String((payload as any)?.error || `Request failed with status ${response.status}`));
  }

  return {
    title: String((payload as any)?.title || 'Your closet version').trim() || 'Your closet version',
    summary:
      String((payload as any)?.summary || '').trim() ||
      'This keeps the overall vibe but uses pieces you already own.',
    outfit: Array.isArray((payload as any)?.outfit)
      ? (payload as any).outfit.map((item: any) => normalizeFitCheckItem(item))
      : [],
    missing_piece_suggestions: Array.isArray((payload as any)?.missing_piece_suggestions)
      ? (payload as any).missing_piece_suggestions.map((entry: any) => String(entry || '').trim()).filter(Boolean)
      : [],
    recreate_quality:
      (payload as any)?.recreate_quality === 'strong' ||
      (payload as any)?.recreate_quality === 'decent' ||
      (payload as any)?.recreate_quality === 'weak'
        ? (payload as any).recreate_quality
        : undefined,
    recreate_score: Number.isFinite(Number((payload as any)?.recreate_score))
      ? Number((payload as any).recreate_score)
      : undefined,
    recreate_issues: Array.isArray((payload as any)?.recreate_issues)
      ? (payload as any).recreate_issues.map((entry: any) => String(entry || '').trim()).filter(Boolean)
      : [],
    variation_index: Number.isFinite(Number((payload as any)?.variation_index))
      ? Number((payload as any).variation_index)
      : undefined,
    variation_count: Number.isFinite(Number((payload as any)?.variation_count))
      ? Number((payload as any).variation_count)
      : undefined,
    has_more_variations: Boolean((payload as any)?.has_more_variations),
  };
}

async function updateFitCheckPostRow(
  postId: string,
  payload: Record<string, any>,
): Promise<FitCheckPost | null> {
  const user = await getCurrentUserOrThrow();
  if (!isLikelyUuid(postId)) {
    throw new Error('Only saved Fit Check posts can be edited.');
  }

  const { data, error } = await supabase
    .from('fit_check_posts')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('user_id', user.id)
    .select('id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const hydrated = await hydratePosts([(data || null) as FitCheckPostRow].filter(Boolean), user.id);
  return hydrated[0] || null;
}

async function loadFitCheckPostMeta(postId: string) {
  if (!postId || postId.startsWith('local-') || postId.startsWith('fitcheck-local-')) {
    return null as { id: string; user_id: string; visibility?: string | null } | null;
  }

  const { data, error } = await supabase
    .from('fit_check_posts')
    .select('id, user_id, visibility')
    .eq('id', postId)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data as { id: string; user_id: string; visibility?: string | null };
}

export async function loadFitCheckPostById(postId: string) {
  const user = await getCurrentUserOrThrow();
  if (!postId || postId.startsWith('local-') || postId.startsWith('fitcheck-local-')) {
    return null;
  }

  const { data, error } = await supabase
    .from('fit_check_posts')
    .select('id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at')
    .eq('id', postId)
    .maybeSingle();

  if (error || !data?.id) {
    if (error) {
      console.warn('Fit Check post lookup failed:', error.message);
    }
    return null;
  }

  const hydrated = await hydratePosts([(data || null) as FitCheckPostRow].filter(Boolean), user.id);
  const safety = await loadFitCheckSafetyState();
  return filterFitCheckPostsForSafety(hydrated, safety)[0] || null;
}

export async function updateFitCheckPostDetails(args: {
  postId: string;
  caption: string;
  context: string;
  weatherLabel: string;
  mood: string;
}) {
  return updateFitCheckPostRow(args.postId, {
    caption: String(args.caption || '').trim() || 'No caption yet.',
    context: String(args.context || '').trim() || 'Fit Check',
    weather_label: String(args.weatherLabel || '').trim() || 'Weather',
    mood: String(args.mood || '').trim() || 'Daily',
  });
}

export async function updateFitCheckPostVisibility(args: {
  postId: string;
  visibility: FitCheckVisibility | string;
}) {
  return updateFitCheckPostRow(args.postId, {
    visibility: visibilityToDb(args.visibility),
  });
}

export async function deleteFitCheckPost(postId: string) {
  const user = await getCurrentUserOrThrow();
  if (!isLikelyUuid(postId)) {
    throw new Error('Only saved Fit Check posts can be deleted.');
  }

  const { error } = await supabase
    .from('fit_check_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadFitCheckScreenData(): Promise<FitCheckScreenData> {
  try {
    const identity = await fetchCurrentUserIdentity();
    const today = toLocalDateString();
    const safety = await loadFitCheckSafetyState();

    const [hasPostedTodayResult, friendsResponse, followRows] = await Promise.all([
      supabase
        .from('fit_check_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', identity.userId)
        .eq('post_date', today),
      supabase
        .from('fit_check_posts')
        .select('id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at')
        .eq('post_date', today)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', identity.userId),
    ]);

    const followIds = (followRows.data || []).map((row: any) => String(row.following_id));
    const followingProfiles = await selectProfilesByIds(followIds);
    const followingCreators = await Promise.all(
      followingProfiles.map(async (profile) => ({
        id: profile.id,
        username:
          String(profile.username || '').trim() ||
          String(profile.full_name || '').trim() ||
          `member-${String(profile.id || '').slice(0, 6)}`,
        display_name:
          String(profile.full_name || '').trim() ||
          String(profile.username || '').trim() ||
          'Fit Check member',
        avatar_url: await resolveProfileAvatar(profile),
        style_tags: Array.isArray(profile.style_tags) ? profile.style_tags.filter(Boolean) : [],
        bio: String(profile.bio || '').trim() || undefined,
        label: 'Following',
      })),
    );
    const followingPostsResponse = followIds.length
      ? await supabase
          .from('fit_check_posts')
          .select('id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at')
          .in('user_id', followIds)
          .order('created_at', { ascending: false })
          .limit(30)
      : { data: [], error: null } as any;

    const [friendsPostsRaw, followingPostsRaw, exploreData] = await Promise.all([
      hydratePosts((friendsResponse.data || []) as FitCheckPostRow[], identity.userId),
      hydratePosts((followingPostsResponse.data || []) as FitCheckPostRow[], identity.userId),
      getExplorePosts({
        currentUserId: identity.userId,
        currentStyleTags: identity.styleTags,
        limit: 50,
        followingIds: followIds,
      }),
    ]);

    const friendsPosts = filterFitCheckPostsForSafety(friendsPostsRaw, safety);
    const followingPosts = filterFitCheckPostsForSafety(followingPostsRaw, safety);
    const safeExploreSections = exploreData.sections.map((section) => ({
      ...section,
      creators: filterFitCheckCreatorsForSafety(section.creators || [], safety),
      posts: filterFitCheckPostsForSafety(section.posts || [], safety),
    }));
    const safeSuggestedPeople = filterFitCheckCreatorsForSafety(
      exploreData.suggestedPeople || [],
      safety,
    );

    return {
      currentUserId: identity.userId,
      currentUsername: identity.username,
      currentAvatarUrl: identity.avatarUrl,
      hasPostedToday: Number(hasPostedTodayResult.count || 0) > 0,
      friendsPosts,
      followingPosts,
      followingCreators,
      exploreSections: safeExploreSections,
      suggestedPeople: safeSuggestedPeople,
      exploreIsDemo: Boolean(exploreData.usedDemoFallback),
      followState: followIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = true;
        return acc;
      }, {}),
      blockedUserIds: Array.from(safety.blockedUserIds),
    };
  } catch (error) {
    console.warn('Fit Check screen data fallback:', error);
    return {
      currentUserId: null,
      currentUsername: 'you',
      currentAvatarUrl: null,
      hasPostedToday: false,
      friendsPosts: [],
      followingPosts: [],
      followingCreators: [],
      exploreSections: FIT_CHECK_EXPLORE_SECTIONS,
      suggestedPeople: FIT_CHECK_DEMO_SUGGESTED_CREATORS,
      exploreIsDemo: true,
      followState: getFitCheckFollowState(),
      blockedUserIds: [],
    };
  }
}

export async function toggleFitCheckReaction({
  postId,
  nextReactionLabel,
}: {
  postId: string;
  nextReactionLabel: string | null;
}) {
  const user = await getCurrentUserOrThrow();
  if (!postId || postId.startsWith('local-') || postId.startsWith('fitcheck-local-')) {
    return;
  }

  if (!nextReactionLabel) {
    const { error } = await supabase
      .from('fit_check_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    if (error) throw new Error(error.message);
    return;
  }

  const existingReactionResponse = await supabase
    .from('fit_check_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingReactionResponse.error) {
    throw new Error(existingReactionResponse.error.message);
  }

  const hadExistingReaction = Boolean(existingReactionResponse.data?.id);

  const { error } = await supabase
    .from('fit_check_reactions')
    .upsert(
      {
        post_id: postId,
        user_id: user.id,
        reaction_type: normalizeReactionType(nextReactionLabel),
      },
      { onConflict: 'post_id,user_id' },
    );

  if (error) throw new Error(error.message);

  const postMeta = await loadFitCheckPostMeta(postId);
  if (!hadExistingReaction && postMeta?.user_id && postMeta.user_id !== user.id) {
    await createActivityEvent({
      recipientId: postMeta.user_id,
      eventType: 'reaction',
      postId,
      metadata: {
        reaction_label: nextReactionLabel,
      },
    });
  }
}

export function buildOptimisticReactionPost(post: FitCheckPost, reactionLabel: string) {
  const next = buildOptimisticReactions(post.reactions || [], post.active_reaction_label || null, reactionLabel);
  return {
    ...post,
    reactions: next.reactions,
    active_reaction_label: next.activeReactionLabel,
  };
}

export async function loadStyleBoards() {
  try {
    const user = await getCurrentUserOrThrow();
    const { data, error } = await supabase
      .from('style_boards')
      .select('id, user_id, title, description, visibility, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const rows = (data || []) as StyleBoardRow[];
    const options = rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.description || undefined,
      visibility: visibilityFromDb(row.visibility),
    })) as FitCheckBoardOption[];

    if (options.length) {
      return options;
    }
  } catch (error) {
    console.warn('Loading style boards failed, using defaults:', error);
  }

  return DEFAULT_SAVE_BOARD_OPTIONS.map((title) => ({ title })) as FitCheckBoardOption[];
}

async function ensureStyleBoard({
  userId,
  boardId,
  boardTitle,
}: {
  userId: string;
  boardId?: string | null;
  boardTitle: string;
}) {
  if (boardId) {
    const { data, error } = await supabase
      .from('style_boards')
      .select('id, title')
      .eq('id', boardId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data?.id) return data;
  }

  const existing = await supabase
    .from('style_boards')
    .select('id, title')
    .eq('user_id', userId)
    .ilike('title', boardTitle)
    .maybeSingle();

  if (!existing.error && existing.data?.id) {
    return existing.data;
  }

  const { data, error } = await supabase
    .from('style_boards')
    .insert({
      user_id: userId,
      title: boardTitle,
      visibility: 'private',
    })
    .select('id, title')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveFitCheckPost({
  postId,
  boardId,
  boardTitle,
}: {
  postId: string;
  boardId?: string | null;
  boardTitle: string;
}) {
  const user = await getCurrentUserOrThrow();
  if (!postId || postId.startsWith('local-') || postId.startsWith('fitcheck-local-')) {
    return { boardTitle };
  }

  const board = await ensureStyleBoard({
    userId: user.id,
    boardId: boardId || null,
    boardTitle,
  });

  const existingSaveResponse = await supabase
    .from('fit_check_saves')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingSaveResponse.error) {
    throw new Error(existingSaveResponse.error.message);
  }

  const hadExistingSave = Boolean(existingSaveResponse.data?.id);

  const { error: saveError } = await supabase
    .from('fit_check_saves')
    .upsert(
      {
        post_id: postId,
        user_id: user.id,
        board_id: board?.id || null,
      },
      { onConflict: 'post_id,user_id' },
    );

  if (saveError) throw new Error(saveError.message);

  if (board?.id) {
    const { error: boardPostError } = await supabase
      .from('style_board_posts')
      .upsert(
        {
          board_id: board.id,
          post_id: postId,
        },
        { onConflict: 'board_id,post_id' },
      );

    if (boardPostError) throw new Error(boardPostError.message);
  }

  const postMeta = await loadFitCheckPostMeta(postId);
  if (!hadExistingSave && postMeta?.user_id && postMeta.user_id !== user.id && visibilityFromDb(postMeta.visibility) === 'Public') {
    await createActivityEvent({
      recipientId: postMeta.user_id,
      eventType: 'save',
      postId,
      metadata: {
        board_title: board?.title || boardTitle,
      },
    });
  }

  return {
    boardId: board?.id || null,
    boardTitle: board?.title || boardTitle,
  };
}

export async function loadStyleNotes(postId: string) {
  if (!postId || postId.startsWith('local-') || postId.startsWith('fitcheck-local-')) {
    return [] as FitCheckStyleNote[];
  }

  const user = await getCurrentUserOrThrow();
  const { data, error } = await supabase
    .from('style_notes')
    .select('id, post_id, user_id, note, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Loading style notes failed:', error.message);
    return [] as FitCheckStyleNote[];
  }

  const rows = (data || []) as Array<{ id: string; post_id: string; user_id: string; note: string; created_at: string }>;
  const profiles = await selectProfilesByIds(Array.from(new Set(rows.map((row) => row.user_id))));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows.map((row) => ({
    id: row.id,
    note: row.note,
    user_id: row.user_id,
    created_at: row.created_at,
    username:
      String(profileMap.get(row.user_id)?.username || '').trim() ||
      `member-${row.user_id.slice(0, 6)}`,
    isCurrentUser: row.user_id === user.id,
  }));
}

export async function addStyleNote(postId: string, note: string) {
  const user = await getCurrentUserOrThrow();
  if (!postId || postId.startsWith('local-') || postId.startsWith('fitcheck-local-')) {
    return {
      id: `local-note-${Date.now()}`,
      note,
      user_id: user.id,
      created_at: new Date().toISOString(),
      username: 'you',
      isCurrentUser: true,
    } as FitCheckStyleNote;
  }

  const { data, error } = await supabase
    .from('style_notes')
    .insert({
      post_id: postId,
      user_id: user.id,
      note,
    })
    .select('id, post_id, user_id, note, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const postMeta = await loadFitCheckPostMeta(postId);
  if (postMeta?.user_id && postMeta.user_id !== user.id) {
    await createActivityEvent({
      recipientId: postMeta.user_id,
      eventType: 'style_note',
      postId,
      metadata: {
        note_preview: note.slice(0, 120),
      },
    });
  }

  const profile = await selectProfileByKey(user.id);
  return {
    id: data.id,
    note: data.note,
    user_id: data.user_id,
    created_at: data.created_at,
    username: String(profile?.username || '').trim() || 'you',
    isCurrentUser: true,
  } as FitCheckStyleNote;
}

export async function toggleFollow(profileKey: string, nextValue: boolean) {
  const key = String(profileKey || '').trim();
  if (!key) return getFitCheckFollowState();

  if (!isRealFollowTarget(key)) {
    throw new Error('Demo profiles can’t be followed yet.');
  }

  const user = await getCurrentUserOrThrow();
  if (key === user.id) {
    return getFitCheckFollowState();
  }

  if (nextValue) {
    await followUser(key);
  } else {
    await unfollowUser(key);
  }

  return {
    [key]: nextValue,
  };
}

export async function loadPublicProfileData(profileKey: string): Promise<PublicFitCheckProfileData> {
  const key = String(profileKey || '').trim();
  if (!key) {
    return {
      profile: null,
      posts: [],
      boards: [],
      closetPicks: [],
      style: null,
      isFollowing: false,
      isBlocked: false,
      isPrivateProfile: false,
      resolvedProfileKey: null,
    };
  }

  try {
    const identity = await fetchCurrentUserIdentity();
    const baseProfile = await selectProfileByKey(key);
    const safety = await loadFitCheckSafetyState();
    if (!baseProfile?.id) {
      const privacyRow = await selectProfilePrivacyByKey(key).catch(() => null);
      if (privacyRow?.id && String(privacyRow.profile_visibility || 'public').trim().toLowerCase() === 'private') {
        return {
          profile: null,
          posts: [],
          boards: [],
          closetPicks: [],
          style: null,
          isFollowing: false,
          isBlocked: false,
          isPrivateProfile: true,
          resolvedProfileKey: String(privacyRow.id || key).trim(),
        };
      }

      const fallbackProfile = getFitCheckPublicProfile(key);
      return {
        profile: fallbackProfile,
        posts: getFitCheckPublicProfilePosts(key),
        boards: getFitCheckPublicProfileBoards(key),
        closetPicks: [],
        style: getFitCheckPublicProfileStyle(key),
        isFollowing: Boolean(getFitCheckFollowState()[key]),
        isBlocked: safety.blockedUserIds.has(String(fallbackProfile?.id || key).trim()),
        isPrivateProfile: false,
        resolvedProfileKey: fallbackProfile?.id || key,
      };
    }

    const resolvedProfileKey = baseProfile.id;
    const isPrivateProfile = String(baseProfile.profile_visibility || 'public').trim().toLowerCase() === 'private';
    const publicClosetEnabled = Boolean(baseProfile.public_closet_enabled);
    if (safety.blockedUserIds.has(resolvedProfileKey)) {
      return {
        profile: null,
        posts: [],
        boards: [],
        closetPicks: [],
        style: null,
        isFollowing: false,
        isBlocked: true,
        isPrivateProfile: false,
        resolvedProfileKey,
      };
    }

    const [postsCount, followersCount, followingCount, boardsCount, followMatch, postsResponse, boardsResponse, closetPicks] =
      await Promise.all([
        supabase.from('fit_check_posts').select('id', { count: 'exact', head: true }).eq('user_id', resolvedProfileKey),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', resolvedProfileKey),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', resolvedProfileKey),
        supabase.from('style_boards').select('id', { count: 'exact', head: true }).eq('user_id', resolvedProfileKey),
        supabase
          .from('follows')
          .select('id')
          .eq('follower_id', identity.userId)
          .eq('following_id', resolvedProfileKey)
          .maybeSingle(),
        supabase
          .from('fit_check_posts')
          .select('id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at')
          .eq('user_id', resolvedProfileKey)
          .order('created_at', { ascending: false }),
        supabase
          .from('style_boards')
          .select('id, user_id, title, description, visibility, created_at, updated_at')
          .eq('user_id', resolvedProfileKey)
          .order('updated_at', { ascending: false }),
        publicClosetEnabled ? loadPublicClosetPicks(resolvedProfileKey) : Promise.resolve([]),
      ]);

    const posts = isPrivateProfile
      ? []
      : filterFitCheckPostsForSafety(
          await hydratePosts((postsResponse.data || []) as FitCheckPostRow[], identity.userId),
          safety,
        );
    const boards = isPrivateProfile
      ? []
      : ((boardsResponse.data || []) as StyleBoardRow[]).map((board) => ({
          id: board.id,
          title: board.title,
          subtitle: board.description || undefined,
          description: board.description || undefined,
        }));

    const signatureContexts = Array.from(
      new Set(posts.map((post) => post.context).filter(Boolean)),
    ).slice(0, 6);
    const signatureVibes = Array.from(
      new Set(
        posts.flatMap((post) => [post.mood, ...(post.style_tags || [])]).filter(Boolean),
      ),
    ).slice(0, 6);

    return {
      profile: {
        id: resolvedProfileKey,
        display_name:
          String(baseProfile.full_name || '').trim() ||
          String(baseProfile.username || '').trim() ||
          'Fit Check member',
        username: String(baseProfile.username || '').trim() || 'member',
        avatar_url: (await resolveProfileAvatar(baseProfile)) || getFallbackAvatarUrl(resolvedProfileKey),
        bio: String(baseProfile.bio || '').trim() || undefined,
        style_tags: Array.isArray(baseProfile.style_tags) ? baseProfile.style_tags.filter(Boolean) : [],
        public_closet_enabled: publicClosetEnabled,
        social_stats: {
          fits: isPrivateProfile ? 0 : Number(postsCount.count || posts.length || 0),
          followers: Number(followersCount.count || 0),
          following: Number(followingCount.count || 0),
          boards: isPrivateProfile ? 0 : Number(boardsCount.count || boards.length || 0),
        },
        boards,
        style: {
          headline:
            signatureVibes.length
              ? `${signatureVibes.slice(0, 3).join(', ')} style signals.`
              : 'Fit Check member',
          identity_note:
            String(baseProfile.bio || '').trim() ||
            posts[0]?.caption ||
            'Public style signals for this profile.',
          signature_vibes: signatureVibes,
          signature_contexts: signatureContexts,
        },
      },
      closetPicks,
      posts: isPrivateProfile ? [] : (posts.length ? posts : getFitCheckPublicProfilePosts(key)),
      boards: isPrivateProfile ? [] : (boards.length ? boards : getFitCheckPublicProfileBoards(key)),
      style: isPrivateProfile
        ? null
        : {
            headline:
              signatureVibes.length
                ? `${signatureVibes.slice(0, 3).join(', ')} style signals.`
                : 'Fit Check member',
            identity_note:
              String(baseProfile.bio || '').trim() ||
              posts[0]?.caption ||
              'Public style signals for this profile.',
            signature_vibes: signatureVibes,
            signature_contexts: signatureContexts,
          },
      isFollowing: Boolean(followMatch.data?.id),
      isBlocked: false,
      isPrivateProfile,
      resolvedProfileKey,
    };
  } catch (error) {
    console.warn('Public profile fallback:', error);
    const fallbackProfile = getFitCheckPublicProfile(key);
    return {
      profile: fallbackProfile,
      posts: getFitCheckPublicProfilePosts(key),
      boards: getFitCheckPublicProfileBoards(key),
      closetPicks: [],
      style: getFitCheckPublicProfileStyle(key),
      isFollowing: Boolean(getFitCheckFollowState()[key]),
      isBlocked: false,
      isPrivateProfile: false,
      resolvedProfileKey: fallbackProfile?.id || key,
    };
  }
}

export async function loadCurrentProfileFitCheckSnapshot(userId: string): Promise<CurrentProfileFitCheckSnapshot> {
  try {
    const [fitsCount, followersCount, followingCount, boardsCount, postsResponse, boardsResponse] =
      await Promise.all([
        supabase.from('fit_check_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('style_boards').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('fit_check_posts')
          .select('id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('style_boards')
          .select('id, user_id, title, description, visibility, created_at, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(20),
      ]);

    const fits = await hydratePosts((postsResponse.data || []) as FitCheckPostRow[], userId);
    const boards = ((boardsResponse.data || []) as StyleBoardRow[]).map((board) => ({
      id: board.id,
      title: board.title,
      subtitle: board.description || undefined,
      description: board.description || undefined,
    }));

    return {
      socialStats: {
        fits: Number(fitsCount.count || fits.length || 0),
        followers: Number(followersCount.count || 0),
        following: Number(followingCount.count || 0),
        boards: Number(boardsCount.count || boards.length || 0),
      },
      fits: fits.length ? fits : FIT_CHECK_PROFILE_FITS,
      boards: boards.length ? boards : FIT_CHECK_PROFILE_BOARDS,
      closetPicks: FIT_CHECK_PROFILE_CLOSET_PICKS,
    };
  } catch (error) {
    console.warn('Current profile Fit Check fallback:', error);
    return {
      socialStats: FIT_CHECK_PROFILE_SOCIAL_STATS,
      fits: FIT_CHECK_PROFILE_FITS,
      boards: FIT_CHECK_PROFILE_BOARDS,
      closetPicks: FIT_CHECK_PROFILE_CLOSET_PICKS,
    };
  }
}
