create extension if not exists pgcrypto;

create table if not exists public.travel_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  destination text,
  start_date date,
  end_date date,
  notes text,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_travel_collections_user_id_created_at
on public.travel_collections (user_id, created_at desc);

alter table public.saved_outfits
  add column if not exists travel_collection_id uuid references public.travel_collections(id) on delete set null,
  add column if not exists activity_label text,
  add column if not exists day_label text,
  add column if not exists sort_order int,
  add column if not exists outfit_mode text default 'regular';

create index if not exists idx_saved_outfits_user_id_travel_collection_id_created_at
on public.saved_outfits (user_id, travel_collection_id, created_at desc);

update public.saved_outfits
set outfit_mode = case
  when travel_collection_id is not null then 'travel'
  else 'regular'
end
where outfit_mode is null;

alter table public.saved_outfits
  alter column outfit_mode set default 'regular';

alter table public.saved_outfits
  drop constraint if exists saved_outfits_outfit_mode_check;

alter table public.saved_outfits
  add constraint saved_outfits_outfit_mode_check
  check (outfit_mode in ('regular', 'travel'));

alter table public.travel_collections enable row level security;

drop policy if exists "Users can view own travel collections" on public.travel_collections;
create policy "Users can view own travel collections"
on public.travel_collections
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own travel collections" on public.travel_collections;
create policy "Users can insert own travel collections"
on public.travel_collections
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own travel collections" on public.travel_collections;
create policy "Users can update own travel collections"
on public.travel_collections
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own travel collections" on public.travel_collections;
create policy "Users can delete own travel collections"
on public.travel_collections
for delete
using (auth.uid() = user_id);
