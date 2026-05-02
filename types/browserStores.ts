export type BrowserStoreGroup = 'Popular' | 'Sportswear' | 'Luxury' | 'Resale' | 'More Stores';

export type BrowserStoreSourceType = 'curated' | 'custom';

export type CuratedBrowserStore = {
  key: string;
  name: string;
  url: string;
  domain: string;
  group: BrowserStoreGroup;
};

export type UserBrowserStore = {
  id: string;
  user_id: string;
  catalog_key: string | null;
  name: string;
  url: string;
  domain: string;
  source_type: BrowserStoreSourceType;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BrowserStoreDraft = {
  catalog_key: string | null;
  name: string;
  url: string;
  domain: string;
  source_type: BrowserStoreSourceType;
};

export type ResolvedBrowserStore = {
  id: string;
  user_store_id: string;
  catalog_key: string | null;
  name: string;
  url: string;
  domain: string;
  source_type: BrowserStoreSourceType;
  sort_order: number;
  group: BrowserStoreGroup;
  is_pinned: true;
};

export type BrowserStoreMutationResult = {
  supported: boolean;
  items: UserBrowserStore[];
};
