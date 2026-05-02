import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, readApiResponse } from './api';
import { bumpClosetRevision } from './itemVerdictCache';
import { supabase } from './supabase';

const CLEANUP_RUN_KEY_PREFIX = 'closetmind.scanned_candidate_cleanup.v1';
const CLEANUP_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_MAX_AGE_HOURS = 24;

let activeCleanupPromise: Promise<void> | null = null;

function buildCleanupRunKey(userId: string) {
  return `${CLEANUP_RUN_KEY_PREFIX}:${encodeURIComponent(String(userId || '').trim())}`;
}

async function readLastCleanupAt(userId: string) {
  try {
    return Number(await AsyncStorage.getItem(buildCleanupRunKey(userId))) || 0;
  } catch {
    return 0;
  }
}

async function writeLastCleanupAt(userId: string, timestamp: number) {
  try {
    await AsyncStorage.setItem(buildCleanupRunKey(userId), String(timestamp));
  } catch {}
}

export async function syncScannedCandidateCleanup({
  force = false,
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
}: {
  force?: boolean;
  maxAgeHours?: number;
} = {}) {
  if (activeCleanupPromise && !force) {
    return activeCleanupPromise;
  }

  const run = (async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return;
    }

    const now = Date.now();
    const lastRunAt = await readLastCleanupAt(user.id);
    if (!force && lastRunAt && now - lastRunAt < CLEANUP_MIN_INTERVAL_MS) {
      return;
    }

    const response = await apiPost('/wardrobe/cleanup-scanned-candidates', {
      max_age_hours: maxAgeHours,
    });
    const payload = await readApiResponse<any>(response);

    if (!response.ok) {
      throw new Error(String((payload as any)?.error || 'Scanned candidate cleanup failed.'));
    }

    await writeLastCleanupAt(user.id, now);

    if (Number((payload as any)?.deleted_count || 0) > 0) {
      await bumpClosetRevision(user.id).catch(() => null);
    }
  })();

  activeCleanupPromise = run.finally(() => {
    if (activeCleanupPromise === run) {
      activeCleanupPromise = null;
    }
  });

  return activeCleanupPromise;
}
