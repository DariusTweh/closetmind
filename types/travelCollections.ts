export type TravelCollection = {
  id: string;
  user_id: string;
  name: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  cover_image_url?: string | null;
  created_at?: string | null;
};

export type TravelCollectionDraft = {
  name: string;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  cover_image_url?: string | null;
};

export type TravelCollectionDetail = {
  collection: TravelCollection;
  outfits: any[];
  activityLabels: string[];
};
