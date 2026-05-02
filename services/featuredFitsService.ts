import { supabase } from '../lib/supabase';
import { fetchAllSavedOutfits, fetchSavedOutfitsByIds } from './savedOutfitService';

const FEATURED_FITS_SELECT = 'id, user_id, saved_outfit_id, sort_order, created_at';

function isMissingSchemaError(error: any, target?: string) {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (target && !normalized.includes(String(target).toLowerCase())) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the table') ||
    normalized.includes('schema cache') ||
    normalized.includes('column') ||
    normalized.includes('relation')
  );
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You must be logged in to manage featured fits.');
  }

  return user.id;
}

export async function fetchFeaturedFits(userIdArg?: string | null) {
  const userId = userIdArg || (await getAuthenticatedUserId());
  const response = await supabase
    .from('featured_outfits')
    .select(FEATURED_FITS_SELECT)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (response.error) {
    if (isMissingSchemaError(response.error, 'featured_outfits')) {
      return { items: [], available: false };
    }
    throw response.error;
  }

  const rows = response.data || [];
  const savedOutfitIds = rows.map((row: any) => String(row.saved_outfit_id || '').trim()).filter(Boolean);
  const outfits = savedOutfitIds.length
    ? await fetchSavedOutfitsByIds({ userId, outfitIds: savedOutfitIds })
    : [];
  const outfitsById = new Map(outfits.map((outfit) => [String(outfit?.id || ''), outfit]));

  return {
    available: true,
    items: rows
      .map((row: any) => ({
        ...row,
        outfit: outfitsById.get(String(row.saved_outfit_id || '')) || null,
      }))
      .filter((entry: any) => entry.outfit),
  };
}

export async function fetchFeatureableSavedOutfits(args?: { userId?: string | null; excludeSavedOutfitIds?: string[] }) {
  const userId = args?.userId || (await getAuthenticatedUserId());
  const excludeIds = new Set((args?.excludeSavedOutfitIds || []).map((value) => String(value || '').trim()).filter(Boolean));
  const outfits = await fetchAllSavedOutfits(userId);
  return outfits.filter((outfit: any) => !excludeIds.has(String(outfit?.id || '')));
}

export async function addFeaturedFits(args: {
  userId?: string | null;
  savedOutfitIds: string[];
  currentFeaturedCount?: number;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const savedOutfitIds = Array.from(new Set((args.savedOutfitIds || []).map((value) => String(value || '').trim()).filter(Boolean)));
  if (!savedOutfitIds.length) return [];

  const payload = savedOutfitIds.map((savedOutfitId, index) => ({
    user_id: userId,
    saved_outfit_id: savedOutfitId,
    sort_order: Number(args.currentFeaturedCount || 0) + index,
  }));

  const response = await supabase
    .from('featured_outfits')
    .insert(payload)
    .select(FEATURED_FITS_SELECT);

  if (response.error) {
    if (isMissingSchemaError(response.error, 'featured_outfits')) {
      throw new Error('Apply the featured fits migration before using this screen.');
    }
    throw new Error(response.error.message);
  }

  return response.data || [];
}

export async function removeFeaturedFit(args: { id: string; userId?: string | null }) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const response = await supabase
    .from('featured_outfits')
    .delete()
    .eq('id', args.id)
    .eq('user_id', userId);

  if (response.error) {
    if (isMissingSchemaError(response.error, 'featured_outfits')) {
      throw new Error('Apply the featured fits migration before using this screen.');
    }
    throw new Error(response.error.message);
  }
}

export async function saveFeaturedFitOrder(args: {
  userId?: string | null;
  items: Array<{ id: string; sort_order: number }>;
}) {
  const userId = args.userId || (await getAuthenticatedUserId());
  const items = (args.items || []).map((item) => ({
    id: String(item?.id || '').trim(),
    user_id: userId,
    sort_order: Number(item?.sort_order) || 0,
  })).filter((item) => item.id);

  if (!items.length) return;

  const responses = await Promise.all(
    items.map((item) =>
      supabase
        .from('featured_outfits')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('user_id', userId),
    ),
  );

  const failedResponse = responses.find((response) => response.error);
  if (failedResponse?.error) {
    if (isMissingSchemaError(failedResponse.error, 'featured_outfits')) {
      throw new Error('Apply the featured fits migration before using this screen.');
    }
    throw new Error(failedResponse.error.message);
  }
}
