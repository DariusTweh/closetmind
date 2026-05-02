alter table public.profiles
  add column if not exists body_image_paths text[] default '{}',
  add column if not exists body_image_urls text[] default '{}',
  add column if not exists ai_model_path text,
  add column if not exists ai_model_url text,
  add column if not exists model_status text default 'idle';
