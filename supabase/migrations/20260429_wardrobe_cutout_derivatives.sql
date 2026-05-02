alter table public.wardrobe
  add column if not exists cutout_thumbnail_url text,
  add column if not exists cutout_display_url text;

create index if not exists idx_wardrobe_cutout_thumbnail_url
  on public.wardrobe (cutout_thumbnail_url);

create index if not exists idx_wardrobe_cutout_display_url
  on public.wardrobe (cutout_display_url);
