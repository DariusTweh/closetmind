import { resolveProfileAvatarUrl } from './avatar';
import { resolvePrivateMediaUrl } from './privateMedia';
import { processActivityNotification } from './fitCheckNotifications';
import { supabase } from './supabase';
import type { FitCheckActivityEvent, FitCheckActivityEventType } from '../types/fitCheck';

const FIT_CHECK_POSTS_BUCKET = 'fit-check-posts';
type RawActivityRow = {
  id: string;
  recipient_id: string;
  actor_id: string;
  event_type: FitCheckActivityEventType;
  post_id: string | null;
  metadata: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  avatar_path?: string | null;
};

type PostThumbRow = {
  id: string;
  image_url?: string | null;
  image_path?: string | null;
};

function isMissingSchemaError(message: string | null | undefined, columnName?: string) {
  const normalized = String(message || '').toLowerCase();
  if (!normalized) return false;
  if (columnName && normalized.includes(`column`) && normalized.includes(columnName.toLowerCase())) return true;
  return normalized.includes('could not find the table') || normalized.includes('does not exist');
}

function formatTimeAgo(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return 'now';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'now';
  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You need to be signed in.');
  }

  return user;
}

async function loadProfilesByIds(userIds: string[]) {
  if (!userIds.length) return [] as ProfileRow[];

  const directSelect = async (ids: string[]) => {
    const response = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, avatar_path')
      .in('id', ids);

    if (response.error) {
      console.warn('Activity profile lookup failed:', response.error.message);
      return [] as ProfileRow[];
    }

    return (response.data || []) as ProfileRow[];
  };

  let response: any = await supabase.rpc('get_public_profiles_by_ids', { profile_ids: userIds });
  if (!response.error) {
    const rpcRows = (response.data || []) as ProfileRow[];
    const needsEnrichmentIds = rpcRows
      .filter((row) => row?.id && typeof (row as any)?.avatar_path === 'undefined')
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

async function resolveAvatar(profile?: ProfileRow | null) {
  return resolveProfileAvatarUrl(profile);
}

async function resolvePostThumbnail(post?: PostThumbRow | null) {
  const imagePath = String(post?.image_path || '').trim();
  const imageUrl = String(post?.image_url || '').trim();
  if (!imagePath && !imageUrl) return null;
  const resolved = await resolvePrivateMediaUrl({
    path: imagePath || null,
    legacyUrl: imageUrl || null,
    bucket: FIT_CHECK_POSTS_BUCKET,
    preferBackendSigner: false,
  }).catch(() => null);
  return resolved || imageUrl || null;
}

export async function createActivityEvent({
  recipientId,
  eventType,
  postId,
  metadata,
}: {
  recipientId: string;
  eventType: FitCheckActivityEventType;
  postId?: string | null;
  metadata?: Record<string, any> | null;
}) {
  try {
    const user = await getCurrentUserOrThrow();
    const normalizedRecipientId = String(recipientId || '').trim();
    if (!normalizedRecipientId || normalizedRecipientId === user.id) return null;

    const { data, error } = await supabase
      .from('activity_events')
      .insert({
        recipient_id: normalizedRecipientId,
        actor_id: user.id,
        event_type: eventType,
        post_id: String(postId || '').trim() || null,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      if (!isMissingSchemaError(error.message)) {
        console.warn('Activity event insert failed:', error.message);
      }
      return null;
    }

    if (data?.id) {
      void processActivityNotification(data.id).catch((notificationError) => {
        console.warn('Activity push processing failed:', notificationError);
      });
    }

    return true;
  } catch (error) {
    console.warn('Activity event insert skipped:', error);
    return null;
  }
}

export async function getUnreadActivityCount() {
  try {
    const user = await getCurrentUserOrThrow();
    const { count, error } = await supabase
      .from('activity_events')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null);

    if (error) {
      if (!isMissingSchemaError(error.message)) {
        console.warn('Unread activity count failed:', error.message);
      }
      return 0;
    }

    return Number(count || 0);
  } catch {
    return 0;
  }
}

export async function markActivityEventsRead(eventIds: string[]) {
  const ids = Array.from(new Set(eventIds.map((id) => String(id || '').trim()).filter(Boolean)));
  if (!ids.length) return;

  try {
    const user = await getCurrentUserOrThrow();
    const { error } = await supabase
      .from('activity_events')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .in('id', ids)
      .is('read_at', null);

    if (error && !isMissingSchemaError(error.message)) {
      console.warn('Mark activity read failed:', error.message);
    }
  } catch (error) {
    console.warn('Mark activity read skipped:', error);
  }
}

export async function loadActivityEvents() {
  try {
    const user = await getCurrentUserOrThrow();
    const { data, error } = await supabase
      .from('activity_events')
      .select('id, recipient_id, actor_id, event_type, post_id, metadata, read_at, created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) {
      if (!isMissingSchemaError(error.message)) {
        console.warn('Load activity failed:', error.message);
      }
      return [] as FitCheckActivityEvent[];
    }

    const rows = (data || []) as RawActivityRow[];
    const actorIds = Array.from(new Set(rows.map((row) => row.actor_id).filter(Boolean)));
    const postIds = Array.from(new Set(rows.map((row) => row.post_id).filter(Boolean))) as string[];

    const [profiles, postsResponse] = await Promise.all([
      loadProfilesByIds(actorIds),
      postIds.length
        ? supabase
            .from('fit_check_posts')
            .select('id, image_url, image_path')
            .in('id', postIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    const avatarMap = new Map<string, string>();
    await Promise.all(
      profiles.map(async (profile) => {
        profileMap.set(profile.id, profile);
        avatarMap.set(profile.id, await resolveAvatar(profile));
      }),
    );

    const postMap = new Map<string, PostThumbRow>();
    const thumbMap = new Map<string, string | null>();
    await Promise.all(
      (((postsResponse as any)?.data || []) as PostThumbRow[]).map(async (post) => {
        postMap.set(post.id, post);
        thumbMap.set(post.id, await resolvePostThumbnail(post));
      }),
    );

    return rows.map((row) => {
      const actorProfile = profileMap.get(row.actor_id);
      return {
        id: row.id,
        recipient_id: row.recipient_id,
        actor_id: row.actor_id,
        event_type: row.event_type,
        post_id: row.post_id || null,
        metadata: row.metadata || {},
        read_at: row.read_at || null,
        created_at: row.created_at,
        time_ago: formatTimeAgo(row.created_at),
        actor_username:
          String(actorProfile?.username || '').trim() ||
          String(actorProfile?.full_name || '').trim() ||
          `member-${String(row.actor_id || '').slice(0, 6)}`,
        actor_display_name:
          String(actorProfile?.full_name || '').trim() || undefined,
        actor_avatar_url: avatarMap.get(row.actor_id) || null,
        post_thumbnail_url: row.post_id ? thumbMap.get(row.post_id) || null : null,
      } as FitCheckActivityEvent;
    });
  } catch (error) {
    console.warn('Activity load fallback:', error);
    return [] as FitCheckActivityEvent[];
  }
}
