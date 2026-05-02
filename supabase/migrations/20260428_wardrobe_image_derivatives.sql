alter table public.wardrobe
  add column if not exists thumbnail_url text,
  add column if not exists display_image_url text,
  add column if not exists original_image_url text;

create index if not exists idx_wardrobe_thumbnail_url
  on public.wardrobe (thumbnail_url);

create index if not exists idx_wardrobe_display_image_url
  on public.wardrobe (display_image_url);
