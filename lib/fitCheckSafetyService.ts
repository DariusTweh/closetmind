import { resolveProfileAvatarUrl } from './avatar';
import { supabase } from './supabase';
import type { FitCheckCreator, FitCheckPost } from '../types/fitCheck';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const FIT_CHECK_REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Hate or abuse',
  'Nudity or sexual content',
  'Scam',
  'Other',
] as const;

export type FitCheckReportReason = (typeof FIT_CHECK_REPORT_REASONS)[number];

export type FitCheckSafetyState = {
  blockedUserIds: Set<string>;
  hiddenPostIds: Set<string>;
};

export type BlockedFitCheckUser = {
  id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url: string;
  style_tags: string[];
  blocked_at: string;
};

type PublicProfileLookupRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
  style_tags?: string[] | null;
};

function isLikelyUuid(value?: string | null) {
  return UUID_RE.test(String(value || '').trim());
}

async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You need to be signed in to manage Fit Check safety controls.');
  }

  return user;
}

export async function loadFitCheckSafetyState(): Promise<FitCheckSafetyState> {
  try {
    const user = await getCurrentUserOrThrow();
    const [blocksResponse, hiddenResponse] = await Promise.all([
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id),
      supabase.from('hidden_posts').select('post_id').eq('user_id', user.id),
    ]);

    if (blocksResponse.error) {
      console.warn('Loading Fit Check blocks failed:', blocksResponse.error.message);
    }

    if (hiddenResponse.error) {
      console.warn('Loading Fit Check hidden posts failed:', hiddenResponse.error.message);
    }

    return {
      blockedUserIds: new Set(
        (blocksResponse.data || [])
          .map((row: any) => String(row?.blocked_id || '').trim())
          .filter(Boolean),
      ),
      hiddenPostIds: new Set(
        (hiddenResponse.data || [])
          .map((row: any) => String(row?.post_id || '').trim())
          .filter(Boolean),
      ),
    };
  } catch (error) {
    console.warn('Fit Check safety state fallback:', error);
    return {
      blockedUserIds: new Set<string>(),
      hiddenPostIds: new Set<string>(),
    };
  }
}

async function selectProfilesByIds(userIds: string[]) {
  if (!userIds.length) return [] as PublicProfileLookupRow[];

  const directSelect = async (ids: string[]) => {
    const response = await supabase
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url, avatar_path, style_tags')
      .in('id', ids);

    if (response.error) {
      console.warn('Blocked user profile lookup failed:', response.error.message);
      return [] as PublicProfileLookupRow[];
    }

    return (response.data || []) as PublicProfileLookupRow[];
  };

  let response: any = await supabase.rpc('get_public_profiles_by_ids', { profile_ids: userIds });
  if (!response.error) {
    const rpcRows = (response.data || []) as PublicProfileLookupRow[];
    const needsEnrichmentIds = rpcRows
      .filter((row) =>
        row?.id &&
        (
          typeof (row as any)?.avatar_path === 'undefined' ||
          typeof row?.bio === 'undefined' ||
          typeof row?.style_tags === 'undefined'
        ),
      )
      .map((row) => String(row.id || '').trim())
      .filter(Boolean);

    if (!needsEnrichmentIds.length) {
      return rpcRows;
    }

    const enrichedRows = await directSelect(needsEnrichmentIds);
    const enrichedMap = new Map(enrichedRows.map((row) => [String(row.id || '').trim(), row]));

    return rpcRows.map((row) => {
      const enriched = enrichedMap.get(String(row?.id || '').trim());
      return enriched ? { ...row, ...enriched } : row;
    });
  }

  return directSelect(userIds);
}

async function resolveProfileAvatar(profile?: PublicProfileLookupRow | null) {
  return resolveProfileAvatarUrl(profile);
}

export async function loadBlockedFitCheckUsers(): Promise<BlockedFitCheckUser[]> {
  try {
    const user = await getCurrentUserOrThrow();
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data || []) as Array<{ blocked_id: string; created_at: string }>;
    const ids = rows.map((row) => String(row.blocked_id || '').trim()).filter(Boolean);
    const profiles = await selectProfilesByIds(ids);
    const profileMap = new Map<string, PublicProfileLookupRow>(
      profiles.map((profile) => [String(profile.id), profile]),
    );

    const resolved = await Promise.all(
      rows.map(async (row) => {
        const id = String(row.blocked_id || '').trim();
        const profile = profileMap.get(id);
        return {
          id,
          username:
            String(profile?.username || '').trim() ||
            String(profile?.full_name || '').trim() ||
            `member-${id.slice(0, 6)}`,
          full_name: String(profile?.full_name || '').trim() || null,
          bio: String(profile?.bio || '').trim() || null,
          avatar_url: await resolveProfileAvatar(profile),
          style_tags: Array.isArray(profile?.style_tags) ? profile.style_tags.filter(Boolean) : [],
          blocked_at: row.created_at,
        } as BlockedFitCheckUser;
      }),
    );

    return resolved;
  } catch (error) {
    console.warn('Loading blocked Fit Check users failed:', error);
    return [];
  }
}

export async function getBlockedFitCheckUserCount() {
  try {
    const user = await getCurrentUserOrThrow();
    const { count, error } = await supabase
      .from('user_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('blocker_id', user.id);

    if (error) throw new Error(error.message);
    return Number(count || 0);
  } catch (error) {
    console.warn('Blocked Fit Check user count failed:', error);
    return 0;
  }
}

export function filterFitCheckPostsForSafety(posts: FitCheckPost[], safety: FitCheckSafetyState) {
  return posts.filter((post) => {
    const postId = String(post?.id || '').trim();
    const userId = String(post?.user_id || post?.author_key || '').trim();
    if (postId && safety.hiddenPostIds.has(postId)) return false;
    if (userId && safety.blockedUserIds.has(userId)) return false;
    return true;
  });
}

export function filterFitCheckCreatorsForSafety(
  creators: FitCheckCreator[],
  safety: FitCheckSafetyState,
) {
  return creators.filter((creator) => {
    const creatorId = String(creator?.id || '').trim();
    if (creatorId && safety.blockedUserIds.has(creatorId)) return false;
    return true;
  });
}

export async function isFitCheckUserBlocked(targetUserId: string) {
  const target = String(targetUserId || '').trim();
  if (!isLikelyUuid(target)) return false;

  const user = await getCurrentUserOrThrow();
  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', user.id)
    .eq('blocked_id', target)
    .maybeSingle();

  if (error) {
    console.warn('Checking blocked user failed:', error.message);
    return false;
  }

  return Boolean(data?.id);
}

export async function hideFitCheckPost(postId: string) {
  const normalizedPostId = String(postId || '').trim();
  if (!normalizedPostId) {
    throw new Error('Missing post id.');
  }

  const user = await getCurrentUserOrThrow();
  const { error } = await supabase.from('hidden_posts').upsert(
    {
      user_id: user.id,
      post_id: normalizedPostId,
    },
    { onConflict: 'user_id,post_id' },
  );

  if (error) throw new Error(error.message);
  return true;
}

export async function blockFitCheckUser(targetUserId: string) {
  const target = String(targetUserId || '').trim();
  if (!isLikelyUuid(target)) {
    throw new Error('Only real users can be blocked right now.');
  }

  const user = await getCurrentUserOrThrow();
  if (target === user.id) {
    throw new Error('You can’t block yourself.');
  }

  const { error } = await supabase.from('user_blocks').upsert(
    {
      blocker_id: user.id,
      blocked_id: target,
    },
    { onConflict: 'blocker_id,blocked_id' },
  );

  if (error) throw new Error(error.message);

  const followDeletes = await Promise.allSettled([
    supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', target),
    supabase.from('follows').delete().eq('follower_id', target).eq('following_id', user.id),
  ]);

  followDeletes.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.error) {
      console.warn('Removing blocked follow relationship failed:', result.value.error.message);
    }
  });

  return true;
}

export async function unblockFitCheckUser(targetUserId: string) {
  const target = String(targetUserId || '').trim();
  if (!isLikelyUuid(target)) {
    throw new Error('Only real users can be unblocked right now.');
  }

  const user = await getCurrentUserOrThrow();
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', target);

  if (error) throw new Error(error.message);
  return true;
}

export async function reportFitCheckPost({
  postId,
  reportedUserId,
  reason,
  details,
}: {
  postId: string;
  reportedUserId: string;
  reason: FitCheckReportReason;
  details?: string | null;
}) {
  const normalizedPostId = String(postId || '').trim();
  const normalizedReportedUserId = String(reportedUserId || '').trim();
  if (!normalizedPostId || !isLikelyUuid(normalizedReportedUserId)) {
    throw new Error('A real Fit Check post is required to report.');
  }

  const user = await getCurrentUserOrThrow();
  const { error } = await supabase.from('post_reports').insert({
    reporter_id: user.id,
    post_id: normalizedPostId,
    reported_user_id: normalizedReportedUserId,
    reason,
    details: String(details || '').trim() || null,
  });

  if (error) throw new Error(error.message);
  return true;
}

export async function reportFitCheckProfile({
  reportedUserId,
  reason,
  details,
}: {
  reportedUserId: string;
  reason: FitCheckReportReason;
  details?: string | null;
}) {
  const normalizedReportedUserId = String(reportedUserId || '').trim();
  if (!isLikelyUuid(normalizedReportedUserId)) {
    throw new Error('Only real users can be reported right now.');
  }

  const user = await getCurrentUserOrThrow();
  const { error } = await supabase.from('profile_reports').insert({
    reporter_id: user.id,
    reported_user_id: normalizedReportedUserId,
    reason,
    details: String(details || '').trim() || null,
  });

  if (error) throw new Error(error.message);
  return true;
}
