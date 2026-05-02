import { supabase } from '../lib/supabase';
import {
  CURATED_BROWSER_STORES,
  CURATED_BROWSER_STORE_MAP,
  deriveBrowserStoreDomain,
  deriveBrowserStoreName,
  normalizeBrowserStoreUrl,
} from '../lib/browserStoreCatalog';
import type {
  BrowserStoreDraft,
  BrowserStoreMutationResult,
  CuratedBrowserStore,
  ResolvedBrowserStore,
  UserBrowserStore,
} from '../types/browserStores';

const USER_BROWSER_STORES_SELECT =
  'id, user_id, catalog_key, name, url, domain, source_type, sort_order, created_at, updated_at';

function normalizeText(value: any, maxLength = 180) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized ? normalized.slice(0, maxLength) : '';
}

function normalizeUrl(value: string) {
  return normalizeBrowserStoreUrl(value);
}

function normalizeCuratedUrl(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isMissingSchemaError(error: any, target = 'user_browser_stores') {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  if (target && !normalized.includes(String(target).toLowerCase())) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('could not find the table') ||
    normalized.includes('schema cache') ||
    normalized.includes('relation')
  );
}

function isDuplicateError(error: any) {
  const normalized = String(error?.message || error?.details || error || '')
    .trim()
    .toLowerCase();
  return error?.code === '23505' || normalized.includes('duplicate key');
}

export function isBrowserStoresSchemaError(error: any) {
  return isMissingSchemaError(error, 'user_browser_stores');
}

export function isBrowserStoresAuthError(error: any) {
  const normalized = String(error?.message || error || '').toLowerCase();
  return normalized.includes('logged in') || normalized.includes('not authenticated');
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('You must be logged in to manage browser stores.');
  }

  return user.id;
}

function normalizeDraft(draft: Partial<BrowserStoreDraft>): BrowserStoreDraft {
  const sourceType = draft.source_type === 'curated' ? 'curated' : 'custom';
  const url =
    sourceType === 'curated'
      ? normalizeCuratedUrl(String(draft.url || ''))
      : normalizeUrl(String(draft.url || ''));
  if (!url) {
    throw new Error('Enter a valid website URL.');
  }

  const domain = deriveBrowserStoreDomain(url);
  if (!domain) {
    throw new Error('Could not derive a valid store domain.');
  }

  const name =
    normalizeText(draft.name, 120) ||
    deriveBrowserStoreName(url) ||
    domain.split('.')[0] ||
    'Store';

  return {
    catalog_key: normalizeText(draft.catalog_key, 120) || null,
    name,
    url,
    domain,
    source_type: sourceType,
  };
}

async function loadUserBrowserStores(userId: string) {
  const { data, error } = await supabase
    .from('user_browser_stores')
    .select(USER_BROWSER_STORES_SELECT)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return {
        supported: false,
        items: [] as UserBrowserStore[],
      };
    }
    throw error;
  }

  return {
    supported: true,
    items: ((data || []) as UserBrowserStore[]).sort(
      (left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0),
    ),
  };
}

async function persistStoreOrder(userId: string, items: UserBrowserStore[]) {
  const updates = items.map((item, index) =>
    supabase
      .from('user_browser_stores')
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('id', item.id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    if (isMissingSchemaError(failed.error)) {
      return {
        supported: false,
        items: [] as UserBrowserStore[],
      };
    }
    throw failed.error;
  }

  return {
    supported: true,
    items: items.map((item, index) => ({ ...item, sort_order: index })),
  };
}

async function ensureNotDuplicated(userId: string, nextDraft: BrowserStoreDraft, existingItems?: UserBrowserStore[]) {
  const current = existingItems || (await loadUserBrowserStores(userId)).items;
  const duplicate = current.find((item) => {
    if (nextDraft.catalog_key && item.catalog_key === nextDraft.catalog_key) return true;
    return normalizeUrl(item.url) === nextDraft.url;
  });

  return {
    duplicate,
    current,
  };
}

export async function fetchUserBrowserStores(): Promise<BrowserStoreMutationResult> {
  const userId = await getAuthenticatedUserId();
  return loadUserBrowserStores(userId);
}

export async function addCuratedBrowserStore(
  store: CuratedBrowserStore,
): Promise<BrowserStoreMutationResult> {
  const userId = await getAuthenticatedUserId();
  const existing = await loadUserBrowserStores(userId);
  if (!existing.supported) return existing;

  const draft = normalizeDraft({
    catalog_key: store.key,
    name: store.name,
    url: store.url,
    domain: store.domain,
    source_type: 'curated',
  });
  const { duplicate, current } = await ensureNotDuplicated(userId, draft, existing.items);
  if (duplicate) {
    return {
      supported: true,
      items: current,
    };
  }

  const nextSortOrder = current.length;
  const { error } = await supabase.from('user_browser_stores').insert([
    {
      user_id: userId,
      catalog_key: draft.catalog_key,
      name: draft.name,
      url: draft.url,
      domain: draft.domain,
      source_type: 'curated',
      sort_order: nextSortOrder,
    },
  ]);

  if (error) {
    if (isMissingSchemaError(error)) return { supported: false, items: [] };
    if (isDuplicateError(error)) return { supported: true, items: current };
    throw new Error(error.message);
  }

  return loadUserBrowserStores(userId);
}

export async function addCustomBrowserStore(input: {
  name?: string;
  url: string;
}): Promise<BrowserStoreMutationResult> {
  const userId = await getAuthenticatedUserId();
  const existing = await loadUserBrowserStores(userId);
  if (!existing.supported) return existing;

  const draft = normalizeDraft({
    name: input.name || '',
    url: input.url,
    source_type: 'custom',
  });
  const { duplicate, current } = await ensureNotDuplicated(userId, draft, existing.items);
  if (duplicate) {
    return {
      supported: true,
      items: current,
    };
  }

  const { error } = await supabase.from('user_browser_stores').insert([
    {
      user_id: userId,
      catalog_key: null,
      name: draft.name,
      url: draft.url,
      domain: draft.domain,
      source_type: 'custom',
      sort_order: current.length,
    },
  ]);

  if (error) {
    if (isMissingSchemaError(error)) return { supported: false, items: [] };
    if (isDuplicateError(error)) return { supported: true, items: current };
    throw new Error(error.message);
  }

  return loadUserBrowserStores(userId);
}

export async function updateCustomBrowserStore(
  storeId: string,
  input: { name?: string; url: string },
): Promise<BrowserStoreMutationResult> {
  const userId = await getAuthenticatedUserId();
  const current = await loadUserBrowserStores(userId);
  if (!current.supported) return current;

  const existing = current.items.find((item) => item.id === storeId);
  if (!existing) {
    throw new Error('That store could not be found.');
  }
  if (existing.source_type !== 'custom') {
    throw new Error('Only custom stores can be edited.');
  }

  const draft = normalizeDraft({
    name: input.name || existing.name,
    url: input.url,
    source_type: 'custom',
  });

  const duplicate = current.items.find(
    (item) => item.id !== storeId && normalizeUrl(item.url) === draft.url,
  );
  if (duplicate) {
    throw new Error('That website is already in your stores.');
  }

  const { error } = await supabase
    .from('user_browser_stores')
    .update({
      name: draft.name,
      url: draft.url,
      domain: draft.domain,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', storeId);

  if (error) {
    if (isMissingSchemaError(error)) return { supported: false, items: [] };
    throw new Error(error.message);
  }

  return loadUserBrowserStores(userId);
}

export async function removeUserBrowserStore(storeId: string): Promise<BrowserStoreMutationResult> {
  const userId = await getAuthenticatedUserId();
  const current = await loadUserBrowserStores(userId);
  if (!current.supported) return current;

  const nextItems = current.items.filter((item) => item.id !== storeId);
  const { error } = await supabase
    .from('user_browser_stores')
    .delete()
    .eq('user_id', userId)
    .eq('id', storeId);

  if (error) {
    if (isMissingSchemaError(error)) return { supported: false, items: [] };
    throw new Error(error.message);
  }

  return persistStoreOrder(userId, nextItems);
}

export async function reorderUserBrowserStores(
  storeId: string,
  direction: 'up' | 'down',
): Promise<BrowserStoreMutationResult> {
  const userId = await getAuthenticatedUserId();
  const current = await loadUserBrowserStores(userId);
  if (!current.supported) return current;

  const index = current.items.findIndex((item) => item.id === storeId);
  if (index < 0) return current;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= current.items.length) return current;

  const nextItems = [...current.items];
  const [moved] = nextItems.splice(index, 1);
  nextItems.splice(targetIndex, 0, moved);

  return persistStoreOrder(userId, nextItems);
}

export async function replaceUserBrowserStores(
  drafts: Array<Partial<BrowserStoreDraft>>,
): Promise<BrowserStoreMutationResult> {
  const userId = await getAuthenticatedUserId();
  const normalizedDrafts = drafts
    .map((draft) => normalizeDraft(draft))
    .filter((draft, index, list) => {
      return (
        list.findIndex((candidate) => {
          if (draft.catalog_key && candidate.catalog_key === draft.catalog_key) return true;
          return candidate.url === draft.url;
        }) === index
      );
    });

  const existing = await loadUserBrowserStores(userId);
  if (!existing.supported) return existing;

  const { error: deleteError } = await supabase
    .from('user_browser_stores')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    if (isMissingSchemaError(deleteError)) return { supported: false, items: [] };
    throw new Error(deleteError.message);
  }

  if (normalizedDrafts.length) {
    const insertRows = normalizedDrafts.map((draft, index) => ({
      user_id: userId,
      catalog_key: draft.catalog_key,
      name: draft.name,
      url: draft.url,
      domain: draft.domain,
      source_type: draft.source_type,
      sort_order: index,
    }));

    const { error: insertError } = await supabase.from('user_browser_stores').insert(insertRows);
    if (insertError) {
      if (isMissingSchemaError(insertError)) return { supported: false, items: [] };
      throw new Error(insertError.message);
    }
  }

  return loadUserBrowserStores(userId);
}

export function resolveUserBrowserStores(
  stores: UserBrowserStore[],
  curatedStores = CURATED_BROWSER_STORES,
): ResolvedBrowserStore[] {
  const curatedMap = new Map(curatedStores.map((store) => [store.key, store] as const));

  return (stores || []).map((store) => {
    const curatedMatch = store.catalog_key ? curatedMap.get(store.catalog_key) : null;
    return {
      id: store.id,
      user_store_id: store.id,
      catalog_key: store.catalog_key,
      name: curatedMatch?.name || store.name,
      url: curatedMatch?.url || store.url,
      domain: curatedMatch?.domain || store.domain,
      source_type: store.source_type,
      sort_order: Number(store.sort_order || 0),
      group: curatedMatch?.group || 'More Stores',
      is_pinned: true,
    };
  });
}

export function getAvailableCuratedBrowserStores(
  stores: UserBrowserStore[],
  curatedStores = CURATED_BROWSER_STORES,
) {
  const pinnedCatalogKeys = new Set(
    (stores || []).map((store) => store.catalog_key).filter(Boolean) as string[],
  );
  const pinnedUrls = new Set((stores || []).map((store) => normalizeUrl(store.url)).filter(Boolean));

  return curatedStores.filter((store) => {
    if (pinnedCatalogKeys.has(store.key)) return false;
    const normalizedCuratedUrl = normalizeUrl(store.url);
    if (normalizedCuratedUrl && pinnedUrls.has(normalizedCuratedUrl)) return false;
    return true;
  });
}

export function resolveCuratedStoreByKey(key: string | null | undefined) {
  return key ? CURATED_BROWSER_STORE_MAP.get(key) || null : null;
}
