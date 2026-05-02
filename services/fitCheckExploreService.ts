import {
  FIT_CHECK_EXPLORE_CREATORS,
  FIT_CHECK_EXPLORE_SECTIONS,
} from '../lib/fitCheckMock';
import {
  filterFitCheckCreatorsForSafety,
  filterFitCheckPostsForSafety,
  loadFitCheckSafetyState,
} from '../lib/fitCheckSafetyService';
import { resolveProfileAvatarUrl } from '../lib/avatar';
import { resolvePrivateMediaUrl } from '../lib/privateMedia';
import { supabase } from '../lib/supabase';
import type {
  FitCheckCreator,
  FitCheckExploreSection,
  FitCheckItem,
  FitCheckPost,
  FitCheckReaction,
  FitCheckVisibility,
} from '../types/fitCheck';

const FIT_CHECK_POSTS_BUCKET = 'fit-check-posts';
const FALLBACK_POST_IMAGE =
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80';
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
const SECTION_LIMIT = 6;

type ExploreSectionType =
  | 'trending'
  | 'style_match'
  | 'recreate_friendly'
  | 'campus'
  | 'streetwear'
  | 'new_creators';

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

type ProfileRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
  style_tags?: string[] | null;
};

type PublicMetricRow = {
  post_id: string;
  reaction_count?: number | string | null;
  save_count?: number | string | null;
  style_note_count?: number | string | null;
  report_count?: number | string | null;
};

type PostScoreMeta = {
  reactionCount: number;
  saveCount: number;
  styleNoteCount: number;
  reportCount: number;
  attachedPiecesCount: number;
  styleTagOverlap: number;
  recencyBoost: number;
  recreateFriendlyBoost: number;
  relationshipBoost: number;
  reportPenalty: number;
  isReported: boolean;
  campusMatch: boolean;
  streetwearMatch: boolean;
};

type ScoredExplorePost = {
  post: FitCheckPost;
  score: number;
  authorFollowerCount: number;
  meta: PostScoreMeta;
};

export type GetExplorePostsOptions = {
  currentUserId?: string | null;
  currentStyleTags?: string[];
  limit?: number;
  sectionType?: ExploreSectionType;
  followingIds?: string[];
};

export type FitCheckExploreDiscoveryResult = {
  sections: FitCheckExploreSection[];
  suggestedPeople: FitCheckCreator[];
  usedDemoFallback: boolean;
};

const CAMPUS_KEYWORDS = ['campus', 'class', 'school', 'college', 'lecture', 'library', 'student'];
const STREETWEAR_KEYWORDS = ['streetwear', 'cargo', 'hoodie', 'sneaker', 'denim', 'graphic', 'editorial'];

function normalizeText(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizeTextArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeText(entry)).filter(Boolean) as string[];
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSectionType(sectionType?: ExploreSectionType) {
  switch (sectionType) {
    case 'style_match':
      return 'style-match';
    case 'recreate_friendly':
      return 'recreate-friendly';
    case 'new_creators':
      return 'new-creators';
    default:
      return sectionType || null;
  }
}

function getReactionEmoji(label: string) {
  const match = DEFAULT_REACTION_DEFS.find((entry) => entry.label === label);
  if (match) return match.emoji;
  return EXTRA_REACTION_EMOJIS[label] || '✨';
}

function normalizeReactionType(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Hard Fit';
  const match = [
    ...DEFAULT_REACTION_DEFS,
    ...Object.entries(EXTRA_REACTION_EMOJIS).map(([label, emoji]) => ({ label, emoji })),
  ].find((entry) => entry.label.toLowerCase() === normalized);
  if (match) return match.label;
  return String(value || '').trim();
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

function visibilityFromDb(value?: string | null): FitCheckVisibility {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'public') return 'Public';
  if (normalized === 'followers') return 'Followers';
  return 'Friends';
}

function hasMissingProfileColumn(message: string, field: string) {
  const normalized = String(message || '').toLowerCase();
  const normalizedField = String(field || '').toLowerCase();
  return normalized.includes(normalizedField) && normalized.includes('profiles');
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

function normalizeFitCheckItem(raw: any): FitCheckItem {
  return {
    id: String(raw?.id || `fit-item-${Math.random().toString(36).slice(2)}`),
    name: String(raw?.name || 'Style Piece'),
    image_url: normalizeText(raw?.image_url),
    image_path: normalizeText(raw?.image_path),
    thumbnail_url: normalizeText(raw?.thumbnail_url),
    display_image_url: normalizeText(raw?.display_image_url),
    original_image_url: normalizeText(raw?.original_image_url),
    cutout_image_url: normalizeText(raw?.cutout_image_url),
    cutout_thumbnail_url: normalizeText(raw?.cutout_thumbnail_url),
    cutout_display_url: normalizeText(raw?.cutout_display_url),
    main_category: normalizeText(raw?.main_category),
    type: normalizeText(raw?.type),
    source_type:
      raw?.source_type === 'wardrobe' || raw?.source_type === 'external' ? raw.source_type : null,
    source_item_id: normalizeText(raw?.source_item_id),
    reason: normalizeText(raw?.reason),
    brand: normalizeText(raw?.brand),
    retailer: normalizeText(raw?.retailer),
    product_url: normalizeText(raw?.product_url),
    price: Number.isFinite(Number(raw?.price)) ? Number(raw.price) : null,
    primary_color: normalizeText(raw?.primary_color),
    secondary_colors: Array.isArray(raw?.secondary_colors)
      ? raw.secondary_colors.map((entry: any) => String(entry || '').trim()).filter(Boolean)
      : null,
    vibe_tags: Array.isArray(raw?.vibe_tags)
      ? raw.vibe_tags.map((entry: any) => String(entry || '').trim()).filter(Boolean)
      : null,
  };
}

function parseItems(value: unknown): FitCheckItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeFitCheckItem(item));
}

function overlapScore(values: string[], targets: string[]) {
  if (!values.length || !targets.length) return 0;
  const targetSet = new Set(targets.map((value) => value.toLowerCase()));
  return values.reduce((score, value) => score + Number(targetSet.has(value.toLowerCase())), 0);
}

function matchesKeywords(values: Array<string | null | undefined>, keywords: string[]) {
  const haystack = values
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
  if (!haystack) return false;
  return keywords.some((keyword) => haystack.includes(keyword));
}

function postSearchValues(post: FitCheckPost) {
  return [
    post.context,
    post.caption,
    post.weather,
    post.mood,
    ...(post.style_tags || []),
  ];
}

function getRecencyBoost(createdAt: string) {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return 0;
  const ageMs = Date.now() - createdMs;
  if (ageMs <= 24 * 60 * 60 * 1000) return 10;
  if (ageMs <= 72 * 60 * 60 * 1000) return 5;
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 2;
  return 0;
}

function getBaseScore(meta: PostScoreMeta) {
  return (
    meta.recencyBoost +
    meta.reactionCount * 2 +
    meta.saveCount * 3 +
    meta.styleNoteCount * 1 +
    meta.attachedPiecesCount * 1 +
    meta.styleTagOverlap * 5 +
    meta.recreateFriendlyBoost +
    meta.relationshipBoost -
    meta.reportPenalty
  );
}

function buildDemoExploreSections() {
  return FIT_CHECK_EXPLORE_SECTIONS.map((section) => ({
    ...section,
    subtitle: `${section.subtitle} Demo inspiration while real Explore fills in.`,
    creators: (section.creators || []).map((creator) => ({
      ...creator,
      label: 'Demo inspiration',
    })),
  }));
}

async function selectProfilesByIds(userIds: string[]) {
  if (!userIds.length) return [] as ProfileRow[];

  let response: any = await supabase.rpc('get_public_profiles_by_ids', { profile_ids: userIds });
  if (!response.error) {
    return (response.data || []) as ProfileRow[];
  }

  response = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url, avatar_path, style_tags')
    .in('id', userIds);

  if (response.error && hasMissingProfileColumn(response.error.message, 'avatar_path')) {
    response = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url, style_tags')
      .in('id', userIds);
  }

  if (response.error && hasMissingProfileColumn(response.error.message, 'bio')) {
    response = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, style_tags')
      .in('id', userIds);
  }

  if (response.error) {
    console.warn('Explore profile lookup failed:', response.error.message);
    return [] as ProfileRow[];
  }

  return (response.data || []) as ProfileRow[];
}

async function resolveProfileAvatar(profile?: ProfileRow | null) {
  return resolveProfileAvatarUrl(profile);
}

async function hydrateExplorePosts(
  rows: FitCheckPostRow[],
  currentUserId: string | null,
): Promise<FitCheckPost[]> {
  if (!rows.length) return [];

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const postIds = rows.map((row) => row.id);

  const [profiles, reactionRows, savedRows] = await Promise.all([
    selectProfilesByIds(userIds),
    supabase
      .from('fit_check_reactions')
      .select('post_id, user_id, reaction_type')
      .in('post_id', postIds)
      .then(({ data, error }) => {
        if (error) {
          console.warn('Explore reaction hydration failed:', error.message);
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
              console.warn('Explore save hydration failed:', error.message);
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
  reactionRows.forEach((row) => {
    const current = reactionsByPost.get(row.post_id) || [];
    current.push(row);
    reactionsByPost.set(row.post_id, current);
  });
  const savedPostIds = new Set(savedRows.map((row) => String(row.post_id || '').trim()));

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

async function loadCurrentUserReportedPostIds(currentUserId: string | null, postIds: string[]) {
  if (!currentUserId || !postIds.length) return new Set<string>();

  const { data, error } = await supabase
    .from('post_reports')
    .select('post_id')
    .eq('reporter_id', currentUserId)
    .in('post_id', postIds);

  if (error) {
    console.warn('Explore reported-post lookup failed:', error.message);
    return new Set<string>();
  }

  return new Set(
    (data || []).map((row: any) => String(row?.post_id || '').trim()).filter(Boolean),
  );
}

async function loadFollowerCounts(userIds: string[]) {
  if (!userIds.length) return new Map<string, number>();

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .in('following_id', userIds);

  if (error) {
    console.warn('Explore follower-count lookup failed:', error.message);
    return new Map<string, number>();
  }

  const counts = new Map<string, number>();
  (data || []).forEach((row: any) => {
    const key = String(row?.following_id || '').trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

async function loadPublicMetricCounts(postIds: string[]) {
  const metrics = new Map<string, PublicMetricRow>();
  if (!postIds.length) return metrics;

  const rpcResponse: any = await supabase.rpc('get_fit_check_public_post_metrics', {
    post_ids: postIds,
  });

  if (!rpcResponse.error) {
    ((rpcResponse.data || []) as PublicMetricRow[]).forEach((row) => {
      const key = String(row?.post_id || '').trim();
      if (!key) return;
      metrics.set(key, row);
    });
    return metrics;
  }

  const [reactionRows, styleNoteRows] = await Promise.all([
    supabase
      .from('fit_check_reactions')
      .select('post_id')
      .in('post_id', postIds)
      .then(({ data, error }) => {
        if (error) return [] as Array<{ post_id: string }>;
        return data || [];
      }),
    supabase
      .from('style_notes')
      .select('post_id')
      .in('post_id', postIds)
      .then(({ data, error }) => {
        if (error) return [] as Array<{ post_id: string }>;
        return data || [];
      }),
  ]);

  const reactionCounts = new Map<string, number>();
  reactionRows.forEach((row: any) => {
    const key = String(row?.post_id || '').trim();
    if (!key) return;
    reactionCounts.set(key, (reactionCounts.get(key) || 0) + 1);
  });

  const styleNoteCounts = new Map<string, number>();
  styleNoteRows.forEach((row: any) => {
    const key = String(row?.post_id || '').trim();
    if (!key) return;
    styleNoteCounts.set(key, (styleNoteCounts.get(key) || 0) + 1);
  });

  postIds.forEach((postId) => {
    metrics.set(postId, {
      post_id: postId,
      reaction_count: reactionCounts.get(postId) || 0,
      save_count: 0,
      style_note_count: styleNoteCounts.get(postId) || 0,
      report_count: 0,
    });
  });

  return metrics;
}

function buildCreatorFromPost(post: FitCheckPost, followerCount: number, label: string): FitCheckCreator {
  return {
    id: String(post.user_id || post.author_key || post.username),
    username: post.username,
    display_name: post.username,
    avatar_url: post.avatar_url,
    style_tags: post.style_tags || [],
    label,
    bio: post.caption,
    follower_count: followerCount,
  } as FitCheckCreator & { follower_count?: number };
}

function rankPostForSection(
  entry: ScoredExplorePost,
  sectionKey: string,
  currentStyleTags: string[],
) {
  if (entry.meta.isReported) {
    return entry.score;
  }

  let sectionBoost = 0;
  if (sectionKey === 'style-match' && entry.meta.styleTagOverlap > 0) {
    sectionBoost += 4 + entry.meta.styleTagOverlap * 2;
  }
  if (sectionKey === 'recreate-friendly' && entry.meta.attachedPiecesCount >= 3) {
    sectionBoost += 4;
  }
  if (sectionKey === 'campus' && entry.meta.campusMatch) {
    sectionBoost += 4;
  }
  if (sectionKey === 'streetwear' && entry.meta.streetwearMatch) {
    sectionBoost += 4;
  }
  return entry.score + sectionBoost;
}

function sortPostsForSection(
  posts: ScoredExplorePost[],
  sectionKey: string,
  currentStyleTags: string[],
) {
  return [...posts].sort((left, right) => {
    const scoreDelta =
      rankPostForSection(right, sectionKey, currentStyleTags) -
      rankPostForSection(left, sectionKey, currentStyleTags);
    if (scoreDelta !== 0) return scoreDelta;
    return new Date(right.post.created_at).getTime() - new Date(left.post.created_at).getTime();
  });
}

function filterScoredPostsForSection(posts: ScoredExplorePost[], sectionKey: string) {
  switch (sectionKey) {
    case 'style-match':
      return posts.filter((entry) => entry.meta.styleTagOverlap > 0);
    case 'recreate-friendly':
      return posts.filter((entry) => entry.meta.attachedPiecesCount >= 3);
    case 'campus':
      return posts.filter((entry) => entry.meta.campusMatch);
    case 'streetwear':
      return posts.filter((entry) => entry.meta.streetwearMatch);
    default:
      return posts;
  }
}

export async function getExplorePosts(
  options: GetExplorePostsOptions,
): Promise<FitCheckExploreDiscoveryResult> {
  const currentUserId = String(options.currentUserId || '').trim() || null;
  const currentStyleTags = normalizeTextArray(options.currentStyleTags);
  const limit = Math.max(12, Math.min(Number(options.limit || 50), 80));
  const requestedSectionKey = normalizeSectionType(options.sectionType);
  const safety = await loadFitCheckSafetyState();

  const [postsResponse, followingRows] = await Promise.all([
    supabase
      .from('fit_check_posts')
      .select(
        'id, user_id, image_url, image_path, caption, context, weather_label, mood, visibility, post_date, items, created_at, updated_at',
      )
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit),
    currentUserId && !options.followingIds?.length
      ? supabase.from('follows').select('following_id').eq('follower_id', currentUserId)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (postsResponse.error) {
    console.warn('Explore public posts query failed:', postsResponse.error.message);
    return {
      sections: buildDemoExploreSections(),
      suggestedPeople: [],
      usedDemoFallback: true,
    };
  }

  const rawPosts = (postsResponse.data || []) as FitCheckPostRow[];
  if (!rawPosts.length) {
    return {
      sections: buildDemoExploreSections(),
      suggestedPeople: FIT_CHECK_DEMO_SUGGESTED_CREATORS,
      usedDemoFallback: true,
    };
  }

  const postIds = rawPosts.map((row) => String(row.id || '').trim()).filter(Boolean);
  const followingIds = new Set(
    (options.followingIds?.length
      ? options.followingIds
      : (followingRows as any)?.data || []
    )
      .map((value: any) =>
        typeof value === 'string' ? value : String(value?.following_id || '').trim(),
      )
      .filter(Boolean),
  );

  const blockedByCurrentUserIds = new Set(
    currentUserId
      ? await supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', currentUserId)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Explore blocked-user lookup failed:', error.message);
              return [] as string[];
            }
            return (data || [])
              .map((row: any) => String(row?.blocked_id || '').trim())
              .filter(Boolean);
          })
      : [],
  );
  const blockedCurrentUserIds = new Set(
    currentUserId
      ? await supabase
          .from('user_blocks')
          .select('blocker_id')
          .eq('blocked_id', currentUserId)
          .then(({ data, error }) => {
            if (error) {
              console.warn('Explore blocked-by lookup failed:', error.message);
              return [] as string[];
            }
            return (data || [])
              .map((row: any) => String(row?.blocker_id || '').trim())
              .filter(Boolean);
          })
      : [],
  );
  const reportedPostIds = currentUserId
    ? await loadCurrentUserReportedPostIds(currentUserId, postIds)
    : new Set<string>();

  const hydratedPosts = await hydrateExplorePosts(rawPosts, currentUserId);
  const visiblePosts = filterFitCheckPostsForSafety(
    hydratedPosts
      .filter((post) => !currentUserId || String(post.user_id || '').trim() !== currentUserId)
      .filter((post) => {
        const authorId = String(post.user_id || post.author_key || '').trim();
        if (!authorId) return true;
        if (blockedByCurrentUserIds.has(authorId)) return false;
        if (blockedCurrentUserIds.has(authorId)) return false;
        return true;
      })
      .filter((post) => !reportedPostIds.has(String(post.id || '').trim())),
    safety,
  );

  if (visiblePosts.length < 4) {
    return {
      sections: buildDemoExploreSections(),
      suggestedPeople: FIT_CHECK_DEMO_SUGGESTED_CREATORS,
      usedDemoFallback: true,
    };
  }

  const visiblePostIds = visiblePosts.map((post) => post.id);
  const authorIds = Array.from(
    new Set(
      visiblePosts
        .map((post) => String(post.user_id || post.author_key || '').trim())
        .filter(Boolean),
    ),
  );

  const [publicMetrics, followerCounts] = await Promise.all([
    loadPublicMetricCounts(visiblePostIds),
    loadFollowerCounts(authorIds),
  ]);

  const scoredPosts = visiblePosts.map((post) => {
    const metrics = publicMetrics.get(post.id);
    const attachedPiecesCount = Array.isArray(post.items) ? post.items.length : 0;
    const postValues = postSearchValues(post);
    const reportCount = toNumber(metrics?.report_count);
    const isReported = reportCount > 0;
    const meta: PostScoreMeta = {
      reactionCount: Math.max(
        toNumber(metrics?.reaction_count),
        post.reactions.reduce((sum, reaction) => sum + Number(reaction.count || 0), 0),
      ),
      saveCount: toNumber(metrics?.save_count),
      styleNoteCount: toNumber(metrics?.style_note_count),
      reportCount,
      attachedPiecesCount,
      styleTagOverlap: overlapScore(post.style_tags || [], currentStyleTags),
      recencyBoost: isReported ? 0 : getRecencyBoost(post.created_at),
      recreateFriendlyBoost: !isReported && attachedPiecesCount >= 3 ? 6 : 0,
      relationshipBoost:
        !isReported && followingIds.has(String(post.user_id || post.author_key || '').trim()) ? 4 : 0,
      reportPenalty: isReported ? Math.min(12, reportCount * 4) : 0,
      isReported,
      campusMatch: matchesKeywords(postValues, CAMPUS_KEYWORDS),
      streetwearMatch: matchesKeywords(postValues, STREETWEAR_KEYWORDS),
    };

    return {
      post,
      score: getBaseScore(meta),
      authorFollowerCount: followerCounts.get(String(post.user_id || post.author_key || '').trim()) || 0,
      meta,
    } satisfies ScoredExplorePost;
  });

  const styleMatchPosts = sortPostsForSection(
    filterScoredPostsForSection(scoredPosts, 'style-match'),
    'style-match',
    currentStyleTags,
  )
    .slice(0, SECTION_LIMIT)
    .map((entry) => entry.post);

  const recreateFriendlyPosts = sortPostsForSection(
    filterScoredPostsForSection(scoredPosts, 'recreate-friendly'),
    'recreate-friendly',
    currentStyleTags,
  )
    .slice(0, SECTION_LIMIT)
    .map((entry) => entry.post);

  const campusPosts = sortPostsForSection(
    filterScoredPostsForSection(scoredPosts, 'campus'),
    'campus',
    currentStyleTags,
  )
    .slice(0, SECTION_LIMIT)
    .map((entry) => entry.post);

  const streetwearPosts = sortPostsForSection(
    filterScoredPostsForSection(scoredPosts, 'streetwear'),
    'streetwear',
    currentStyleTags,
  )
    .slice(0, SECTION_LIMIT)
    .map((entry) => entry.post);

  const trendingPosts = sortPostsForSection(scoredPosts, 'trending', currentStyleTags)
    .slice(0, SECTION_LIMIT)
    .map((entry) => entry.post);

  const authorTopPost = new Map<string, ScoredExplorePost>();
  scoredPosts.forEach((entry) => {
    const key = String(entry.post.user_id || entry.post.author_key || '').trim();
    if (!key) return;
    const existing = authorTopPost.get(key);
    if (!existing || entry.score > existing.score) {
      authorTopPost.set(key, entry);
    }
  });

  const authorPostCounts = new Map<string, number>();
  visiblePosts.forEach((post) => {
    const key = String(post.user_id || post.author_key || '').trim();
    if (!key) return;
    authorPostCounts.set(key, (authorPostCounts.get(key) || 0) + 1);
  });

  const candidateCreators = Array.from(authorTopPost.values())
    .filter((entry) => {
      const creatorId = String(entry.post.user_id || entry.post.author_key || '').trim();
      return creatorId && !followingIds.has(creatorId);
    })
    .map((entry) =>
      buildCreatorFromPost(
        entry.post,
        followerCounts.get(String(entry.post.user_id || entry.post.author_key || '').trim()) || 0,
        'Suggested',
      ),
    );

  const suggestedPeople = filterFitCheckCreatorsForSafety(
    candidateCreators
      .filter((creator) => {
        const creatorId = String(creator.id || '').trim();
        return !blockedByCurrentUserIds.has(creatorId) && !blockedCurrentUserIds.has(creatorId);
      })
      .sort((left, right) => {
        const styleDelta =
          overlapScore(right.style_tags || [], currentStyleTags) -
          overlapScore(left.style_tags || [], currentStyleTags);
        if (styleDelta !== 0) return styleDelta;
        const followerDelta = toNumber((left as any).follower_count) - toNumber((right as any).follower_count);
        if (followerDelta !== 0) return followerDelta;
        return left.username.localeCompare(right.username);
      })
      .slice(0, 8),
    safety,
  );

  const newCreators = filterFitCheckCreatorsForSafety(
    candidateCreators
      .sort((left, right) => {
        const leftFollowers = toNumber((left as any).follower_count);
        const rightFollowers = toNumber((right as any).follower_count);
        if (leftFollowers !== rightFollowers) return leftFollowers - rightFollowers;
        const leftPosts = authorPostCounts.get(String(left.id || '').trim()) || 0;
        const rightPosts = authorPostCounts.get(String(right.id || '').trim()) || 0;
        if (rightPosts !== leftPosts) return rightPosts - leftPosts;
        return left.username.localeCompare(right.username);
      })
      .slice(0, SECTION_LIMIT)
      .map((creator) => ({
        ...creator,
        label: 'New creator',
      })),
    safety,
  );

  let sections: FitCheckExploreSection[] = [
    {
      key: 'trending',
      title: 'Trending Today',
      subtitle: 'Recent public fits with the strongest reaction, save, and note pull.',
      posts: trendingPosts,
      creators: [],
    },
    {
      key: 'style-match',
      title: 'People With Your Style',
      subtitle: 'Public looks whose style tags line up with the signals on your profile.',
      posts: styleMatchPosts,
      creators: [],
    },
    {
      key: 'recreate-friendly',
      title: 'Recreate-Friendly Fits',
      subtitle: 'Fits with enough attached pieces to actually turn into something wearable.',
      posts: recreateFriendlyPosts,
      creators: [],
    },
    {
      key: 'campus',
      title: 'Campus Fits',
      subtitle: 'Class-day outfits with enough context to feel useful, not random.',
      posts: campusPosts,
      creators: [],
    },
    {
      key: 'streetwear',
      title: 'Streetwear',
      subtitle: 'Stronger silhouettes, texture, and sneaker-led public drops.',
      posts: streetwearPosts,
      creators: [],
    },
    {
      key: 'new-creators',
      title: 'New Creators',
      subtitle: 'Real public profiles starting to post consistently without already being saturated.',
      posts: [],
      creators: newCreators,
    },
  ].filter((section) => (section.posts?.length || 0) > 0 || (section.creators?.length || 0) > 0);

  if (requestedSectionKey) {
    sections = sections.filter((section) => section.key === requestedSectionKey);
  }

  if (!sections.length) {
    return {
      sections: buildDemoExploreSections(),
      suggestedPeople: FIT_CHECK_DEMO_SUGGESTED_CREATORS,
      usedDemoFallback: true,
    };
  }

  return {
    sections,
    suggestedPeople,
    usedDemoFallback: false,
  };
}

export const FIT_CHECK_DEMO_SUGGESTED_CREATORS = FIT_CHECK_EXPLORE_CREATORS.map((creator) => ({
  ...creator,
  label: 'Demo inspiration',
}));
