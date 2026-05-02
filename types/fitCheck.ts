export type FitCheckItem = {
  id: string;
  name: string;
  image_url?: string | null;
  image_path?: string | null;
  thumbnail_url?: string | null;
  display_image_url?: string | null;
  original_image_url?: string | null;
  cutout_image_url?: string | null;
  cutout_thumbnail_url?: string | null;
  cutout_display_url?: string | null;
  main_category?: string | null;
  type?: string | null;
  source_type?: 'wardrobe' | 'external' | null;
  source_item_id?: string | null;
  reason?: string | null;
  brand?: string | null;
  retailer?: string | null;
  product_url?: string | null;
  price?: number | null;
  primary_color?: string | null;
  secondary_colors?: string[] | null;
  vibe_tags?: string[] | null;
  pattern_description?: string | null;
  season?: string[] | null;
  silhouette?: string | null;
  fit_style?: string | null;
  material?: string | null;
  formality?: string | null;
  shoe_type?: string | null;
  style_family?: string | null;
  graphic_intensity?: string | null;
};

export type FitCheckReaction = {
  label: string;
  emoji: string;
  count: number;
};

export type FitCheckVerdictFocus =
  | 'overall_fit'
  | 'color_match'
  | 'shoe_choice'
  | 'occasion_match'
  | 'closet_match';

export type FitCheckVerdictMode = 'verdict' | 'breakdown';

export type FitCheckVerdictBase = {
  mode: FitCheckVerdictMode;
  title: string;
  summary: string;
  recreate_tips: string[];
  focus_results: Partial<Record<FitCheckVerdictFocus, string>>;
};

export type FitCheckVerdictResult =
  | (FitCheckVerdictBase & {
      mode: 'verdict';
      score: number;
      what_works: string[];
      improvements: string[];
    })
  | (FitCheckVerdictBase & {
      mode: 'breakdown';
      style_principles: string[];
      closet_translation: string[];
    });

export type FitCheckRecreateResult = {
  title: string;
  summary: string;
  outfit: FitCheckItem[];
  missing_piece_suggestions: string[];
  recreate_quality?: 'strong' | 'decent' | 'weak';
  recreate_score?: number;
  recreate_issues?: string[];
  variation_index?: number;
  variation_count?: number;
  has_more_variations?: boolean;
};

export type FitCheckVisibility = 'Friends' | 'Followers' | 'Public';

export type FitCheckPost = {
  id: string;
  username: string;
  avatar_url?: string | null;
  user_id?: string;
  author_key?: string;
  image_url: string;
  image_path?: string | null;
  time_ago: string;
  context: string;
  caption: string;
  weather: string;
  visibility: FitCheckVisibility;
  mood: string;
  reactions: FitCheckReaction[];
  items: FitCheckItem[];
  created_at: string;
  is_own_post?: boolean;
  isCurrentUser?: boolean;
  style_tags?: string[];
  active_reaction_label?: string | null;
  is_saved?: boolean;
};

export type FitCheckStory = {
  id: string;
  username: string;
  avatar_url?: string | null;
  seen?: boolean;
};

export type FitCheckSource = 'camera' | 'gallery' | 'canvas' | 'saved_outfit' | 'try_on';

export type FitCheckPostDraft = {
  source: FitCheckSource;
  context: string;
  weather: string;
  mood: string;
  caption: string;
  visibility: FitCheckVisibility;
  image_url?: string;
  items?: FitCheckItem[];
  username?: string;
  avatar_url?: string;
  author_key?: string;
};

export type FitCheckCreator = {
  id: string;
  username: string;
  avatar_url?: string | null;
  style_tags: string[];
  display_name?: string;
  label?: string;
  bio?: string;
};

export type FitCheckBoard = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
};

export type FitCheckBoardOption = {
  id?: string | null;
  title: string;
  subtitle?: string;
  visibility?: FitCheckVisibility;
};

export type FitCheckAttachLook = {
  id: string;
  title: string;
  subtitle?: string;
  preview_image_url?: string | null;
  preview_asset_status?: 'ready' | 'generated';
  items: FitCheckItem[];
  source_kind?: string | null;
  canvas_id?: string | null;
  canvas_items?: any[] | null;
};

export type FitCheckPublicProfileStyle = {
  headline?: string;
  identity_note?: string;
  signature_vibes: string[];
  signature_contexts: string[];
};

export type FitCheckPublicProfile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
  bio?: string;
  style_tags: string[];
  public_closet_enabled?: boolean;
  social_stats: {
    fits: number;
    followers: number;
    following: number;
    boards: number;
  };
  boards: FitCheckBoard[];
  style: FitCheckPublicProfileStyle;
};

export type FitCheckStyleNote = {
  id: string;
  note: string;
  user_id: string;
  created_at: string;
  username?: string;
  isCurrentUser?: boolean;
};

export type FitCheckExploreSection = {
  key: string;
  title: string;
  subtitle: string;
  posts?: FitCheckPost[];
  creators?: FitCheckCreator[];
};

export type ProfileSocialStats = {
  fits: number;
  followers: number;
  following: number;
  boards: number;
};

export type FitCheckActivityEventType =
  | 'follow'
  | 'reaction'
  | 'style_note'
  | 'save'
  | 'recreate'
  | 'fit_check_posted'
  | 'daily_prompt';

export type FitCheckActivityEvent = {
  id: string;
  recipient_id: string;
  actor_id: string;
  event_type: FitCheckActivityEventType;
  post_id?: string | null;
  metadata: Record<string, any>;
  read_at?: string | null;
  created_at: string;
  time_ago: string;
  actor_username: string;
  actor_display_name?: string;
  actor_avatar_url?: string | null;
  post_thumbnail_url?: string | null;
};
