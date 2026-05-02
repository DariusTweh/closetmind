import { resolveProfileAvatarUrl } from '../lib/avatar';
import { supabase } from '../lib/supabase';
import { createActivityEvent } from '../lib/activityService';
import { isFitCheckUserBlocked } from '../lib/fitCheckSafetyService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type FollowerEntry = {
  id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  style_tags: string[];
  followed_at: string;
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

export function isRealFollowTarget(targetUserId?: string | null) {
  return UUID_RE.test(String(targetUserId || '').trim());
}

async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You need to be signed in to follow people.');
  }

  return user;
}

async function selectProfilesByIds(userIds: string[]) {
  if (!userIds.length) return [] as PublicProfileLookupRow[];

  let response: any = await supabase.rpc('get_public_profiles_by_ids', { profile_ids: userIds });
  if (!response.error) {
    return (response.data || []) as PublicProfileLookupRow[];
  }

  response = await supabase
    .from('profiles')
    .select('id, username, full_name, bio, avatar_url, avatar_path, style_tags')
    .in('id', userIds);

  if (response.error) {
    console.warn('Follower profile lookup failed:', response.error.message);
    return [] as PublicProfileLookupRow[];
  }

  return (response.data || []) as PublicProfileLookupRow[];
}

async function resolveProfileAvatar(profile?: PublicProfileLookupRow | null) {
  return resolveProfileAvatarUrl(profile);
}

export async function getFollowerCount() {
  const user = await getCurrentUserOrThrow();
  const { count, error } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', user.id);

  if (error) throw new Error(error.message);
  return Number(count || 0);
}

export async function loadFollowersForCurrentUser(): Promise<FollowerEntry[]> {
  const user = await getCurrentUserOrThrow();
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data || []) as Array<{ follower_id: string; created_at: string }>;
  const ids = rows.map((row) => String(row.follower_id || '').trim()).filter(Boolean);
  const profiles = await selectProfilesByIds(ids);
  const profileMap = new Map<string, PublicProfileLookupRow>(
    profiles.map((profile) => [String(profile.id), profile]),
  );

  return Promise.all(
    rows.map(async (row) => {
      const id = String(row.follower_id || '').trim();
      const profile = profileMap.get(id);
      return {
        id,
        username:
          String(profile?.username || '').trim() ||
          String(profile?.full_name || '').trim() ||
          `member-${id.slice(0, 6)}`,
        full_name: String(profile?.full_name || '').trim() || null,
        bio: String(profile?.bio || '').trim() || null,
        avatar_url: (await resolveProfileAvatar(profile)) || null,
        style_tags: Array.isArray(profile?.style_tags) ? profile.style_tags.filter(Boolean) : [],
        followed_at: row.created_at,
      } as FollowerEntry;
    }),
  );
}

export async function removeFollower(targetUserId: string) {
  const target = String(targetUserId || '').trim();
  if (!isRealFollowTarget(target)) {
    throw new Error('Only real users can be removed.');
  }

  const user = await getCurrentUserOrThrow();
  if (target === user.id) {
    throw new Error('You can’t remove yourself.');
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', target)
    .eq('following_id', user.id);

  if (error) throw new Error(error.message);
  return true;
}

export async function getFollowState(targetUserId: string) {
  const target = String(targetUserId || '').trim();
  if (!isRealFollowTarget(target)) return false;

  const user = await getCurrentUserOrThrow();
  if (target === user.id) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', target)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export async function followUser(targetUserId: string) {
  const target = String(targetUserId || '').trim();
  if (!isRealFollowTarget(target)) {
    throw new Error('Demo profiles can’t be followed yet.');
  }

  const user = await getCurrentUserOrThrow();
  if (target === user.id) {
    throw new Error('You can’t follow yourself.');
  }

  if (await isFitCheckUserBlocked(target)) {
    throw new Error('Unblock this user before following again.');
  }

  const existingFollowResponse = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', target)
    .maybeSingle();

  if (existingFollowResponse.error) {
    throw new Error(existingFollowResponse.error.message);
  }

  if (existingFollowResponse.data?.id) {
    return true;
  }

  const { error } = await supabase.from('follows').upsert(
    {
      follower_id: user.id,
      following_id: target,
    },
    { onConflict: 'follower_id,following_id' },
  );

  if (error) throw new Error(error.message);
  await createActivityEvent({
    recipientId: target,
    eventType: 'follow',
  });

  return true;
}

export async function unfollowUser(targetUserId: string) {
  const target = String(targetUserId || '').trim();
  if (!isRealFollowTarget(target)) {
    throw new Error('Demo profiles can’t be followed yet.');
  }

  const user = await getCurrentUserOrThrow();
  if (target === user.id) {
    throw new Error('You can’t unfollow yourself.');
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', target);

  if (error) throw new Error(error.message);
  return false;
}

export async function toggleFollow(targetUserId: string) {
  const isFollowing = await getFollowState(targetUserId);
  return isFollowing ? unfollowUser(targetUserId) : followUser(targetUserId);
}
