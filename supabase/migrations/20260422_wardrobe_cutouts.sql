alter table public.wardrobe
  add column if not exists original_image_url text,
  add column if not exists cutout_image_url text,
  add column if not exists bg_removed boolean default false;

update public.wardrobe
set original_image_url = coalesce(original_image_url, image_url)
where original_image_url is null
  and image_url is not null;
