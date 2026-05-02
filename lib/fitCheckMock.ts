import type {
  FitCheckBoard,
  FitCheckCreator,
  FitCheckItem,
  FitCheckPost,
  FitCheckPostDraft,
  FitCheckPublicProfile,
  FitCheckSource,
  FitCheckStory,
} from '../types/fitCheck';

export const CURRENT_FIT_CHECK_PROFILE_KEY = 'you';

const storyFriends: FitCheckStory[] = [
  {
    id: 'story-brandon',
    username: 'brandon',
    avatar_url: 'https://i.pravatar.cc/160?img=12',
  },
  {
    id: 'story-maya',
    username: 'maya',
    avatar_url: 'https://i.pravatar.cc/160?img=32',
  },
  {
    id: 'story-sophia',
    username: 'sophia',
    avatar_url: 'https://i.pravatar.cc/160?img=47',
  },
  {
    id: 'story-jason',
    username: 'jason',
    avatar_url: 'https://i.pravatar.cc/160?img=15',
  },
];

const itemLibrary: Record<FitCheckSource, FitCheckItem[]> = {
  camera: [
    {
      id: 'camera-knit',
      name: 'Striped Knit',
      image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=240&q=80',
      main_category: 'top',
      type: 'Knit',
    },
    {
      id: 'camera-pant',
      name: 'Ash Sweatpant',
      image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=240&q=80',
      main_category: 'bottom',
      type: 'Pant',
    },
    {
      id: 'camera-sneaker',
      name: 'Street Sneaker',
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=240&q=80',
      main_category: 'shoes',
      type: 'Sneaker',
    },
  ],
  gallery: [
    {
      id: 'gallery-jacket',
      name: 'Boxy Leather',
      image_url: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=240&q=80',
      main_category: 'outerwear',
      type: 'Jacket',
    },
    {
      id: 'gallery-tee',
      name: 'White Tank',
      image_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=240&q=80',
      main_category: 'top',
      type: 'Tank',
    },
    {
      id: 'gallery-denim',
      name: 'Relaxed Denim',
      image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=240&q=80',
      main_category: 'bottom',
      type: 'Denim',
    },
  ],
  canvas: [
    {
      id: 'canvas-coat',
      name: 'Car Coat',
      image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=240&q=80',
      main_category: 'outerwear',
      type: 'Coat',
    },
    {
      id: 'canvas-bottom',
      name: 'Tailored Trouser',
      image_url: 'https://images.unsplash.com/photo-1506629905607-d9c297d30d4c?auto=format&fit=crop&w=240&q=80',
      main_category: 'bottom',
      type: 'Trouser',
    },
    {
      id: 'canvas-heel',
      name: 'Sharp Shoe',
      image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=240&q=80',
      main_category: 'shoes',
      type: 'Heel',
    },
  ],
  saved_outfit: [
    {
      id: 'saved-outfit-knit',
      name: 'Soft Varsity Knit',
      image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=240&q=80',
      main_category: 'top',
      type: 'Knit',
    },
    {
      id: 'saved-outfit-trouser',
      name: 'Wide Trouser',
      image_url: 'https://images.unsplash.com/photo-1506629905607-d9c297d30d4c?auto=format&fit=crop&w=240&q=80',
      main_category: 'bottom',
      type: 'Trouser',
    },
    {
      id: 'saved-outfit-loafer',
      name: 'Polished Loafer',
      image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=240&q=80',
      main_category: 'shoes',
      type: 'Loafer',
    },
  ],
  try_on: [
    {
      id: 'try-on-bomber',
      name: 'Structured Bomber',
      image_url: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=240&q=80',
      main_category: 'outerwear',
      type: 'Bomber',
    },
    {
      id: 'try-on-tee',
      name: 'Base Tee',
      image_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=240&q=80',
      main_category: 'top',
      type: 'Tee',
    },
    {
      id: 'try-on-denim',
      name: 'Relaxed Denim',
      image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=240&q=80',
      main_category: 'bottom',
      type: 'Denim',
    },
  ],
};

const sourceImageLibrary: Record<FitCheckSource, string> = {
  camera: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
  gallery: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
  canvas: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80',
  saved_outfit: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  try_on: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80',
};

const fallbackAttachableItems: FitCheckItem[] = Array.from(
  new Map(
    Object.values(itemLibrary)
      .flat()
      .map((item) => [item.id, { ...item }]),
  ).values(),
);

const DEFAULT_PUBLIC_BOARDS: Record<string, FitCheckBoard[]> = {
  maya: [
    {
      id: 'maya-board-soft-campus',
      title: 'Soft Campus Layers',
      subtitle: '8 looks saved',
      description: 'Easy morning layers with cleaner sneakers and softer structure.',
    },
    {
      id: 'maya-board-weekday-clean',
      title: 'Weekday Clean',
      subtitle: '5 looks saved',
      description: 'Looks that stay simple but still feel polished enough for class and coffee.',
    },
  ],
  brandon: [
    {
      id: 'brandon-board-weekend-uniform',
      title: 'Weekend Uniform',
      subtitle: '6 looks saved',
      description: 'Relaxed bottoms, strong shoes, and textures that do the talking.',
    },
  ],
  sophia: [
    {
      id: 'sophia-board-gallery-rotation',
      title: 'Gallery Rotation',
      subtitle: '7 looks saved',
      description: 'Structured outerwear and quieter palettes for sharper city fits.',
    },
  ],
  'noa.line': [
    {
      id: 'noa-board-tonal-work',
      title: 'Tonal Work',
      subtitle: '11 looks saved',
      description: 'Muted palettes and proportion work that keep minimal outfits interesting.',
    },
    {
      id: 'noa-board-clean-shapes',
      title: 'Clean Shapes',
      subtitle: '4 looks saved',
      description: 'Simple pieces arranged around silhouette first, not noise.',
    },
  ],
  'lena.rue': [
    {
      id: 'lena-board-streetwear-core',
      title: 'Streetwear Core',
      subtitle: '14 looks saved',
      description: 'Heavier knitwear, easier pants, sharper shoes, and a stronger stance.',
    },
  ],
  'jules.campus': [
    {
      id: 'jules-board-campus-formula',
      title: 'Campus Formula',
      subtitle: '9 looks saved',
      description: 'Outerwear-first daily fits that still move easily between classes.',
    },
  ],
  'aria.mode': [
    {
      id: 'aria-board-soft-polish',
      title: 'Soft Polish',
      subtitle: '10 looks saved',
      description: 'Creator looks built around one strong piece and cleaner support items.',
    },
  ],
};

let fitCheckFeed: FitCheckPost[] = [
  {
    id: 'fitcheck-1',
    username: 'maya',
    avatar_url: 'https://i.pravatar.cc/160?img=32',
    author_key: 'maya',
    image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
    time_ago: '18m ago',
    context: 'Campus day',
    caption: 'Soft layers, clean sneakers, easy morning lecture fit.',
    weather: '72°F Sunny',
    visibility: 'Friends',
    mood: 'Chill',
    created_at: new Date('2026-04-24T17:08:00.000Z').toISOString(),
    style_tags: ['campus', 'clean'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 18 },
      { label: 'Clean', emoji: '🧼', count: 12 },
      { label: 'Swap Shoes', emoji: '👟', count: 5 },
    ],
    items: itemLibrary.gallery,
  },
  {
    id: 'fitcheck-2',
    username: 'brandon',
    avatar_url: 'https://i.pravatar.cc/160?img=12',
    author_key: 'brandon',
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    time_ago: '42m ago',
    context: 'Coffee run',
    caption: 'Weekend reset uniform. Nothing loud, just strong proportions.',
    weather: '64°F Cloudy',
    visibility: 'Friends',
    mood: 'Low-key',
    created_at: new Date('2026-04-24T16:44:00.000Z').toISOString(),
    style_tags: ['streetwear', 'weekend'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 27 },
      { label: 'Clean', emoji: '🧼', count: 16 },
      { label: 'Swap Shoes', emoji: '👟', count: 3 },
    ],
    items: itemLibrary.camera,
  },
  {
    id: 'fitcheck-3',
    username: 'sophia',
    avatar_url: 'https://i.pravatar.cc/160?img=47',
    author_key: 'sophia',
    image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80',
    time_ago: '1h ago',
    context: 'Gallery stop',
    caption: 'Kept it tonal and structured. The coat carried the whole mood.',
    weather: '68°F Breezy',
    visibility: 'Friends',
    mood: 'Sharp',
    created_at: new Date('2026-04-24T16:01:00.000Z').toISOString(),
    style_tags: ['minimal', 'gallery'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 22 },
      { label: 'Clean', emoji: '🧼', count: 10 },
      { label: 'Swap Shoes', emoji: '👟', count: 2 },
    ],
    items: itemLibrary.canvas,
  },
];

export const FIT_CHECK_DEFAULT_FOLLOWING = ['maya', 'noa.line', 'lena.rue'];

export const FIT_CHECK_EXPLORE_CREATORS: FitCheckCreator[] = [
  {
    id: 'noa.line',
    username: 'noa.line',
    avatar_url: 'https://i.pravatar.cc/160?img=29',
    style_tags: ['minimal', 'tonal', 'clean'],
    label: 'People with your style',
    bio: 'Quiet layers, sharp sneakers, and clean proportion work.',
  },
  {
    id: 'lena.rue',
    username: 'lena.rue',
    avatar_url: 'https://i.pravatar.cc/160?img=25',
    style_tags: ['creator', 'streetwear', 'editorial'],
    label: 'Influencer drop',
    bio: 'Pulling daily streetwear references into wearable outfits.',
  },
  {
    id: 'jules.campus',
    username: 'jules.campus',
    avatar_url: 'https://i.pravatar.cc/160?img=37',
    style_tags: ['campus', 'prep', 'layers'],
    label: 'Trending today',
    bio: 'Class-ready fits with strong outerwear and easier basics.',
  },
];

const explorePosts: FitCheckPost[] = [
  {
    id: 'explore-trending-1',
    username: 'noa.line',
    avatar_url: 'https://i.pravatar.cc/160?img=29',
    author_key: 'noa.line',
    image_url: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80',
    time_ago: '22m ago',
    context: 'Tonal layers',
    caption: 'Muted palette, clean shape, and enough edge to keep it from feeling flat.',
    weather: '67°F Clear',
    visibility: 'Public',
    mood: 'Refined',
    created_at: new Date('2026-04-24T17:18:00.000Z').toISOString(),
    style_tags: ['minimal', 'tonal'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 34 },
      { label: 'Clean', emoji: '🧼', count: 21 },
      { label: 'Need This', emoji: '⭐', count: 9 },
    ],
    items: itemLibrary.gallery,
  },
  {
    id: 'explore-campus-1',
    username: 'jules.campus',
    avatar_url: 'https://i.pravatar.cc/160?img=37',
    author_key: 'jules.campus',
    image_url: 'https://images.unsplash.com/photo-1506629905607-d9c297d30d4c?auto=format&fit=crop&w=1200&q=80',
    time_ago: '41m ago',
    context: 'Campus sprint',
    caption: 'Easy layering, tote bag, clean denim. Solid for a full day moving around.',
    weather: '70°F Breezy',
    visibility: 'Public',
    mood: 'Ready',
    created_at: new Date('2026-04-24T16:52:00.000Z').toISOString(),
    style_tags: ['campus', 'clean'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 18 },
      { label: 'Clean', emoji: '🧼', count: 15 },
      { label: 'Rewear', emoji: '♻️', count: 6 },
    ],
    items: itemLibrary.camera,
  },
  {
    id: 'explore-streetwear-1',
    username: 'lena.rue',
    avatar_url: 'https://i.pravatar.cc/160?img=25',
    author_key: 'lena.rue',
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    time_ago: '1h ago',
    context: 'Streetwear mix',
    caption: 'Big knit, easy pant, sharp shoes. The silhouette does the heavy lifting.',
    weather: '64°F Cloudy',
    visibility: 'Public',
    mood: 'Confident',
    created_at: new Date('2026-04-24T15:58:00.000Z').toISOString(),
    style_tags: ['streetwear', 'editorial'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 42 },
      { label: 'Clean', emoji: '🧼', count: 17 },
      { label: 'Swap Shoes', emoji: '👟', count: 4 },
    ],
    items: itemLibrary.canvas,
  },
  {
    id: 'explore-influencer-1',
    username: 'aria.mode',
    avatar_url: 'https://i.pravatar.cc/160?img=45',
    author_key: 'aria.mode',
    image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80',
    time_ago: '2h ago',
    context: 'Creator drop',
    caption: 'Structured coat, softer palette, and one strong accessory to keep it moving.',
    weather: '69°F Sunny',
    visibility: 'Public',
    mood: 'Polished',
    created_at: new Date('2026-04-24T15:02:00.000Z').toISOString(),
    style_tags: ['creator', 'polished'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 51 },
      { label: 'Clean', emoji: '🧼', count: 29 },
      { label: 'Need This', emoji: '⭐', count: 14 },
    ],
    items: itemLibrary.canvas,
  },
];

const followingFeedPosts: FitCheckPost[] = [
  {
    id: 'following-maya-1',
    username: 'maya',
    avatar_url: 'https://i.pravatar.cc/160?img=32',
    author_key: 'maya',
    image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
    time_ago: '25m ago',
    context: 'Library run',
    caption: 'Still easy, just cleaner. This is the version of daily dressing that actually sticks.',
    weather: '71°F Sunny',
    visibility: 'Friends',
    mood: 'Balanced',
    created_at: new Date('2026-04-24T17:03:00.000Z').toISOString(),
    style_tags: ['campus', 'clean'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 20 },
      { label: 'Clean', emoji: '🧼', count: 16 },
      { label: 'Rewear', emoji: '♻️', count: 5 },
    ],
    items: itemLibrary.gallery,
  },
  {
    id: 'following-noa-1',
    username: 'noa.line',
    avatar_url: 'https://i.pravatar.cc/160?img=29',
    author_key: 'noa.line',
    image_url: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80',
    time_ago: '53m ago',
    context: 'Off-day uniform',
    caption: 'Pulled the same tones through everything and let the proportions do the rest.',
    weather: '66°F Clear',
    visibility: 'Public',
    mood: 'Quiet',
    created_at: new Date('2026-04-24T16:31:00.000Z').toISOString(),
    style_tags: ['minimal', 'tonal'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 25 },
      { label: 'Clean', emoji: '🧼', count: 22 },
      { label: 'Need This', emoji: '⭐', count: 7 },
    ],
    items: itemLibrary.canvas,
  },
  {
    id: 'following-lena-1',
    username: 'lena.rue',
    avatar_url: 'https://i.pravatar.cc/160?img=25',
    author_key: 'lena.rue',
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    time_ago: '1h ago',
    context: 'Streetwear reset',
    caption: 'One bigger texture, one quieter base, then let the shoe finish the job.',
    weather: '63°F Overcast',
    visibility: 'Public',
    mood: 'Sharp',
    created_at: new Date('2026-04-24T15:47:00.000Z').toISOString(),
    style_tags: ['streetwear', 'creator'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 39 },
      { label: 'Clean', emoji: '🧼', count: 17 },
      { label: 'Swap Shoes', emoji: '👟', count: 3 },
    ],
    items: itemLibrary.camera,
  },
];

export const FIT_CHECK_EXPLORE_SECTIONS = [
  {
    key: 'trending',
    title: 'Trending today',
    subtitle: 'The fits getting the strongest fashion reactions right now.',
    posts: [explorePosts[0]],
  },
  {
    key: 'campus',
    title: 'Campus fits',
    subtitle: 'Daily looks built for moving fast without looking flat.',
    posts: [explorePosts[1]],
  },
  {
    key: 'streetwear',
    title: 'Streetwear',
    subtitle: 'Heavier silhouettes, stronger texture, easier layers.',
    posts: [explorePosts[2]],
  },
  {
    key: 'style-match',
    title: 'People with your style',
    subtitle: 'Creators and dressers with signals that overlap your profile.',
    creators: FIT_CHECK_EXPLORE_CREATORS,
  },
  {
    key: 'creators',
    title: 'Influencer drops',
    subtitle: 'Higher-signal creator looks worth saving or recreating.',
    posts: [explorePosts[3]],
  },
];

export const FIT_CHECK_PROFILE_SOCIAL_STATS = {
  fits: 24,
  followers: 1280,
  following: 214,
  boards: 8,
};

export const FIT_CHECK_PROFILE_BOARDS = [
  {
    id: 'board-soft-tailoring',
    title: 'Soft Tailoring',
    subtitle: '12 fits saved',
    description: 'Relaxed layers, cleaner trousers, and slightly sharper shoes.',
  },
  {
    id: 'board-campus-uniforms',
    title: 'Campus Uniforms',
    subtitle: '9 fits saved',
    description: 'Looks that work for classes, coffee, and a full day out.',
  },
];

export const FIT_CHECK_PROFILE_CLOSET_PICKS: FitCheckItem[] = [
  {
    ...itemLibrary.gallery[0],
    id: 'pick-neutral-layers',
    name: 'Neutral Layers',
    reason: 'Best when weather shifts quickly.',
  },
  {
    ...itemLibrary.gallery[2],
    id: 'pick-weekend-shoes',
    name: 'Weekend Rotation',
    reason: 'Pairs that anchor most saved looks.',
  },
];

export const FIT_CHECK_PROFILE_FITS: FitCheckPost[] = [
  {
    id: 'profile-fit-1',
    username: 'you',
    avatar_url: 'https://i.pravatar.cc/160?img=5',
    author_key: CURRENT_FIT_CHECK_PROFILE_KEY,
    image_url: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80',
    time_ago: '2d ago',
    context: 'Lecture day',
    caption: 'Pulled this together fast and it still landed clean.',
    weather: '70°F Clear',
    visibility: 'Friends',
    mood: 'Easy',
    created_at: new Date('2026-04-22T18:00:00.000Z').toISOString(),
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 14 },
      { label: 'Clean', emoji: '🧼', count: 11 },
      { label: 'Rewear', emoji: '♻️', count: 4 },
    ],
    items: itemLibrary.gallery,
    is_own_post: true,
    style_tags: ['clean', 'daily'],
  },
  {
    id: 'profile-fit-2',
    username: 'you',
    avatar_url: 'https://i.pravatar.cc/160?img=5',
    author_key: CURRENT_FIT_CHECK_PROFILE_KEY,
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    time_ago: '5d ago',
    context: 'Weekend reset',
    caption: 'One texture up top and easier pants underneath. Simple but sharp.',
    weather: '65°F Cloudy',
    visibility: 'Friends',
    mood: 'Low-key',
    created_at: new Date('2026-04-19T18:00:00.000Z').toISOString(),
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 19 },
      { label: 'Clean', emoji: '🧼', count: 13 },
      { label: 'Need This', emoji: '⭐', count: 3 },
    ],
    items: itemLibrary.camera,
    is_own_post: true,
    style_tags: ['weekend', 'streetwear'],
  },
];

const FIT_CHECK_PUBLIC_PROFILES_DIRECTORY: Record<string, FitCheckPublicProfile> = {
  maya: {
    id: 'maya',
    display_name: 'Maya Brooks',
    username: 'maya',
    avatar_url: 'https://i.pravatar.cc/160?img=32',
    bio: 'Soft campus fits, cleaner sneakers, and easy layers that still feel intentional.',
    style_tags: ['campus', 'clean', 'soft layers'],
    social_stats: {
      fits: 0,
      followers: 384,
      following: 211,
      boards: DEFAULT_PUBLIC_BOARDS.maya.length,
    },
    boards: DEFAULT_PUBLIC_BOARDS.maya,
    style: {
      headline: 'Campus layers with a softer clean finish.',
      identity_note: 'Most of Maya’s fits land because the layers stay easy while the proportions stay neat.',
      signature_vibes: ['clean', 'campus', 'easy'],
      signature_contexts: ['lecture day', 'coffee run', 'library'],
    },
  },
  brandon: {
    id: 'brandon',
    display_name: 'Brandon Hale',
    username: 'brandon',
    avatar_url: 'https://i.pravatar.cc/160?img=12',
    bio: 'Weekend uniforms, stronger shoes, and a little more texture than noise.',
    style_tags: ['streetwear', 'weekend', 'texture'],
    social_stats: {
      fits: 0,
      followers: 451,
      following: 176,
      boards: DEFAULT_PUBLIC_BOARDS.brandon.length,
    },
    boards: DEFAULT_PUBLIC_BOARDS.brandon,
    style: {
      headline: 'Weekend proportions that stay grounded and easy.',
      identity_note: 'Brandon leans on one stronger shape and lets the shoes finish the outfit.',
      signature_vibes: ['streetwear', 'low-key', 'grounded'],
      signature_contexts: ['coffee run', 'weekend reset'],
    },
  },
  sophia: {
    id: 'sophia',
    display_name: 'Sophia Lane',
    username: 'sophia',
    avatar_url: 'https://i.pravatar.cc/160?img=47',
    bio: 'Structured layers, toned-down palettes, and sharper city fits.',
    style_tags: ['minimal', 'gallery', 'structured'],
    social_stats: {
      fits: 0,
      followers: 628,
      following: 198,
      boards: DEFAULT_PUBLIC_BOARDS.sophia.length,
    },
    boards: DEFAULT_PUBLIC_BOARDS.sophia,
    style: {
      headline: 'Quiet structure with gallery-day polish.',
      identity_note: 'Sophia’s outfits stay minimal, but the coats and shapes do the heavy lifting.',
      signature_vibes: ['minimal', 'sharp', 'tonal'],
      signature_contexts: ['gallery stop', 'city dinner'],
    },
  },
  'noa.line': {
    id: 'noa.line',
    display_name: 'Noa Line',
    username: 'noa.line',
    avatar_url: 'https://i.pravatar.cc/160?img=29',
    bio: 'Quiet layers, sharp sneakers, and clean proportion work.',
    style_tags: ['minimal', 'tonal', 'clean'],
    social_stats: {
      fits: 0,
      followers: 2200,
      following: 312,
      boards: DEFAULT_PUBLIC_BOARDS['noa.line'].length,
    },
    boards: DEFAULT_PUBLIC_BOARDS['noa.line'],
    style: {
      headline: 'Minimal dressing driven by proportion and tonal control.',
      identity_note: 'Noa’s fits stay calm, but the silhouettes keep them from feeling flat.',
      signature_vibes: ['minimal', 'tonal', 'refined'],
      signature_contexts: ['off-day uniform', 'tonal layers'],
    },
  },
  'lena.rue': {
    id: 'lena.rue',
    display_name: 'Lena Rue',
    username: 'lena.rue',
    avatar_url: 'https://i.pravatar.cc/160?img=25',
    bio: 'Pulling daily streetwear references into wearable outfits.',
    style_tags: ['creator', 'streetwear', 'editorial'],
    social_stats: {
      fits: 0,
      followers: 5400,
      following: 142,
      boards: DEFAULT_PUBLIC_BOARDS['lena.rue'].length,
    },
    boards: DEFAULT_PUBLIC_BOARDS['lena.rue'],
    style: {
      headline: 'Streetwear reference looks that still feel wearable.',
      identity_note: 'Lena mixes one louder texture with easier supporting pieces and lets the silhouette carry it.',
      signature_vibes: ['streetwear', 'editorial', 'confident'],
      signature_contexts: ['streetwear mix', 'reset fit'],
    },
  },
  'jules.campus': {
    id: 'jules.campus',
    display_name: 'Jules Carter',
    username: 'jules.campus',
    avatar_url: 'https://i.pravatar.cc/160?img=37',
    bio: 'Class-ready fits with strong outerwear and easier basics.',
    style_tags: ['campus', 'prep', 'layers'],
    social_stats: {
      fits: 0,
      followers: 980,
      following: 260,
      boards: DEFAULT_PUBLIC_BOARDS['jules.campus'].length,
    },
    boards: DEFAULT_PUBLIC_BOARDS['jules.campus'],
    style: {
      headline: 'Outerwear-led daily fits for moving around all day.',
      identity_note: 'Jules keeps campus dressing useful, but the coats and layering keep it from feeling generic.',
      signature_vibes: ['campus', 'prep', 'ready'],
      signature_contexts: ['campus sprint', 'class day'],
    },
  },
  'aria.mode': {
    id: 'aria.mode',
    display_name: 'Aria Mode',
    username: 'aria.mode',
    avatar_url: 'https://i.pravatar.cc/160?img=45',
    bio: 'Creator looks built around softer polish and one stronger statement piece.',
    style_tags: ['creator', 'polished', 'soft tailoring'],
    social_stats: {
      fits: 0,
      followers: 7600,
      following: 118,
      boards: DEFAULT_PUBLIC_BOARDS['aria.mode'].length,
    },
    boards: DEFAULT_PUBLIC_BOARDS['aria.mode'],
    style: {
      headline: 'Soft polish with a creator-level finish.',
      identity_note: 'Aria’s outfits usually pivot around one sharper piece while the rest stays lighter and cleaner.',
      signature_vibes: ['polished', 'creator', 'soft'],
      signature_contexts: ['creator drop', 'soft polish'],
    },
  },
};

let fitCheckFollowingState = FIT_CHECK_DEFAULT_FOLLOWING.reduce<Record<string, boolean>>((acc, key) => {
  acc[key] = true;
  return acc;
}, {});
let fitCheckHasPostedToday = false;

export const FIT_CHECK_STORIES = storyFriends;
export const FIT_CHECK_CONTEXT_OPTIONS = ['Campus', 'Work', 'Dinner', 'Night Out', 'Errands', 'Travel'];
export const FIT_CHECK_WEATHER_OPTIONS = ['72°F Sunny', '64°F Cloudy', '68°F Breezy', '75°F Clear'];
export const FIT_CHECK_MOOD_OPTIONS = ['Chill', 'Clean', 'Cozy', 'Loud', 'Minimal', 'Sporty'];
export const FIT_CHECK_VISIBILITY_OPTIONS: Array<'Friends' | 'Followers' | 'Public'> = [
  'Friends',
  'Followers',
  'Public',
];

export function getFitCheckSourcePreview(source: FitCheckSource) {
  return sourceImageLibrary[source];
}

export function getFitCheckSourceDefaultItems(source: FitCheckSource) {
  return (itemLibrary[source] || []).map((item) => ({ ...item }));
}

export function getFitCheckAttachableItemsFallback() {
  return fallbackAttachableItems.map((item) => ({ ...item }));
}

function sortPostsDescending(posts: FitCheckPost[]) {
  return [...posts].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

function getAllKnownFitCheckPosts() {
  const postsById = new Map<string, FitCheckPost>();

  [...fitCheckFeed, ...followingFeedPosts, ...explorePosts, ...FIT_CHECK_PROFILE_FITS].forEach((post) => {
    postsById.set(post.id, post);
  });

  return sortPostsDescending(Array.from(postsById.values()));
}

export function getFitCheckFollowingKeys() {
  return Object.keys(fitCheckFollowingState).filter((key) => fitCheckFollowingState[key]);
}

export function getFitCheckFollowState() {
  return { ...fitCheckFollowingState };
}

export function getFitCheckHasPostedToday() {
  return fitCheckHasPostedToday;
}

export function setFitCheckHasPostedToday(value: boolean) {
  fitCheckHasPostedToday = Boolean(value);
  return fitCheckHasPostedToday;
}

export function isFitCheckProfileFollowed(profileKey?: string | null) {
  return Boolean(profileKey && fitCheckFollowingState[String(profileKey)]);
}

export function setFitCheckFollowState(profileKey: string, isFollowing: boolean) {
  const key = String(profileKey || '').trim();
  if (!key) return getFitCheckFollowState();

  const next = { ...fitCheckFollowingState };
  if (isFollowing) {
    next[key] = true;
  } else {
    delete next[key];
  }
  fitCheckFollowingState = next;
  return getFitCheckFollowState();
}

export function getFitCheckPublicProfile(profileKey: string) {
  const key = String(profileKey || '').trim();
  if (!key) return null;

  const baseProfile = FIT_CHECK_PUBLIC_PROFILES_DIRECTORY[key];
  const profilePosts = getFitCheckPublicProfilePosts(key);

  if (baseProfile) {
    return {
      ...baseProfile,
      social_stats: {
        ...baseProfile.social_stats,
        fits: profilePosts.length || baseProfile.social_stats.fits,
        boards: baseProfile.boards.length,
      },
    };
  }

  const fallbackPost = profilePosts[0];
  if (!fallbackPost) return null;

  return {
    id: key,
    display_name: fallbackPost.username,
    username: fallbackPost.username,
    avatar_url: fallbackPost.avatar_url,
    bio: fallbackPost.caption,
    style_tags: fallbackPost.style_tags || [],
    social_stats: {
      fits: profilePosts.length,
      followers: 0,
      following: 0,
      boards: 0,
    },
    boards: [],
    style: {
      headline: 'Fit Check member',
      identity_note: fallbackPost.caption,
      signature_vibes: fallbackPost.style_tags || [],
      signature_contexts: [fallbackPost.context],
    },
  };
}

export function getFitCheckPublicProfilePosts(profileKey: string) {
  const key = String(profileKey || '').trim();
  if (!key) return [];

  return getAllKnownFitCheckPosts().filter(
    (post) => String(post.author_key || post.username) === key,
  );
}

export function getFitCheckPublicProfileBoards(profileKey: string) {
  return getFitCheckPublicProfile(profileKey)?.boards || [];
}

export function getFitCheckPublicProfileStyle(profileKey: string) {
  return getFitCheckPublicProfile(profileKey)?.style || null;
}

export function getFitCheckPosts() {
  return sortPostsDescending(fitCheckFeed);
}

export function getFitCheckFollowingPosts(followingKeys: string[] = getFitCheckFollowingKeys()) {
  const allowed = new Set(followingKeys);
  return sortPostsDescending(followingFeedPosts)
    .filter((post) => allowed.has(String(post.author_key || post.username)))
}

export function buildFitCheckPostFromDraft(draft: FitCheckPostDraft): FitCheckPost {
  const now = new Date();
  return {
    id: `fitcheck-local-${now.getTime()}`,
    username: draft.username || 'you',
    avatar_url: draft.avatar_url || 'https://i.pravatar.cc/160?img=5',
    author_key: draft.author_key || CURRENT_FIT_CHECK_PROFILE_KEY,
    image_url: draft.image_url || sourceImageLibrary[draft.source],
    time_ago: 'Just now',
    context: draft.context,
    caption: String(draft.caption || '').trim() || 'Simple fit for class today',
    weather: draft.weather,
    visibility: draft.visibility,
    mood: draft.mood,
    created_at: now.toISOString(),
    is_own_post: true,
    isCurrentUser: true,
    style_tags: ['personal', 'daily'],
    reactions: [
      { label: 'Hard Fit', emoji: '🔥', count: 0 },
      { label: 'Clean', emoji: '🧼', count: 0 },
      { label: 'Wear Again', emoji: '🔁', count: 0 },
    ],
    items: (draft.items?.length ? draft.items : itemLibrary[draft.source]).map((item) => ({ ...item })),
  };
}

export function prependFitCheckPost(post: FitCheckPost) {
  fitCheckFeed = sortPostsDescending([
    post,
    ...fitCheckFeed.filter((entry) => entry.id !== post.id),
  ]);
  fitCheckHasPostedToday = true;
  return post;
}

export function appendFitCheckPost(draft: FitCheckPostDraft) {
  return prependFitCheckPost(buildFitCheckPostFromDraft(draft));
}
