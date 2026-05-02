import { SubscriptionLimitError } from '../lib/subscriptions/errors';
import { canUseFeature } from '../lib/subscriptions/usageService';
import { supabase } from '../lib/supabase';
import type { TravelCollection, TravelCollectionDetail, TravelCollectionDraft } from '../types/travelCollections';
import { fetchSavedOutfits } from './savedOutfitService';

const TRAVEL_COLLECTION_SELECT =
  'id, user_id, name, destination, start_date, end_date, notes, cover_image_url, created_at';

function normalizeText(value: any, maxLength = 240) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You must be logged in to manage travel collections.');
  }

  return user.id;
}

function sortTravelOutfits(outfits: any[]) {
  return [...(Array.isArray(outfits) ? outfits : [])].sort((left, right) => {
    const leftSort = Number.isFinite(Number(left?.sort_order)) ? Number(left.sort_order) : Number.MAX_SAFE_INTEGER;
    const rightSort = Number.isFinite(Number(right?.sort_order)) ? Number(right.sort_order) : Number.MAX_SAFE_INTEGER;

    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    const leftTime = new Date(left?.created_at || 0).getTime();
    const rightTime = new Date(right?.created_at || 0).getTime();
    return rightTime - leftTime;
  });
}

function buildActivityLabels(outfits: any[]) {
  const seen = new Set<string>();
  const labels: string[] = [];

  sortTravelOutfits(outfits).forEach((outfit) => {
    const label = String(outfit?.activity_label || '').trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  });

  return labels;
}

export async function fetchTravelCollections(userIdArg?: string | null) {
  const userId = userIdArg || (await getAuthenticatedUserId());
  const { data, error } = await supabase
    .from('travel_collections')
    .select(TRAVEL_COLLECTION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as TravelCollection[];
}

export async function createTravelCollection(args: {
  userId?: string | null;
  draft: TravelCollectionDraft;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const organizationAccess = await canUseFeature(userId, 'premium_organization');
  if (!organizationAccess.allowed) {
    throw new SubscriptionLimitError('premium_organization', organizationAccess, organizationAccess.reason);
  }

  const payload = {
    user_id: userId,
    name: normalizeText(args.draft?.name, 120) || 'Untitled Trip',
    destination: normalizeText(args.draft?.destination, 120),
    start_date: normalizeText(args.draft?.start_date, 32),
    end_date: normalizeText(args.draft?.end_date, 32),
    notes: normalizeText(args.draft?.notes, 1000),
    cover_image_url: normalizeText(args.draft?.cover_image_url, 500),
  };

  const { data, error } = await supabase
    .from('travel_collections')
    .insert([payload])
    .select(TRAVEL_COLLECTION_SELECT)
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || 'Could not create this trip.');
  }

  return data as TravelCollection;
}

export async function fetchTravelCollectionDetail(args: {
  collectionId: string;
  userId?: string | null;
}): Promise<TravelCollectionDetail> {
  const userId = args.userId || (await getAuthenticatedUserId());
  const { data: collection, error } = await supabase
    .from('travel_collections')
    .select(TRAVEL_COLLECTION_SELECT)
    .eq('id', args.collectionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!collection) {
    throw new Error('This trip could not be found.');
  }

  const outfits = await fetchSavedOutfits({
    userId,
    travelCollectionId: String(collection.id),
  });

  const sorted = sortTravelOutfits(outfits);

  return {
    collection: collection as TravelCollection,
    outfits: sorted,
    activityLabels: buildActivityLabels(sorted),
  };
}

export async function deleteTravelCollection(args: {
  collectionId: string;
  userId?: string | null;
  unassignOutfits?: boolean;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const collectionId = String(args.collectionId || '').trim();
  if (!collectionId) {
    throw new Error('Missing travel collection id.');
  }

  if (args.unassignOutfits !== false) {
    const { error: unassignError } = await supabase
      .from('saved_outfits')
      .update({
        travel_collection_id: null,
        activity_label: null,
        day_label: null,
        sort_order: null,
        outfit_mode: 'regular',
      })
      .eq('user_id', userId)
      .eq('travel_collection_id', collectionId);

    if (unassignError) {
      throw new Error(unassignError.message);
    }
  }

  const { error } = await supabase
    .from('travel_collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
