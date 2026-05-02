create extension if not exists pgcrypto;

create table if not exists public.fit_post_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  wardrobe_item_id uuid references public.wardrobe(id) on delete set null,
  role text,
  item_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.fit_post_items
  add column if not exists wardrobe_item_id uuid references public.wardrobe(id) on delete set null,
  add column if not exists role text,
  add column if not exists item_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_fit_post_items_post_id
  on public.fit_post_items (post_id);

create index if not exists idx_fit_post_items_wardrobe_item_id
  on public.fit_post_items (wardrobe_item_id);

alter table public.fit_post_items enable row level security;

drop policy if exists "Users can view visible fit post items" on public.fit_post_items;
create policy "Users can view visible fit post items"
on public.fit_post_items
for select
using (
  exists (
    select 1
    from public.fit_check_posts post
    where post.id = fit_post_items.post_id
      and public.can_current_user_view_fit_check_post(post.user_id, post.visibility)
  )
);

drop policy if exists "Users can insert own fit post items" on public.fit_post_items;
create policy "Users can insert own fit post items"
on public.fit_post_items
for insert
with check (
  exists (
    select 1
    from public.fit_check_posts post
    where post.id = fit_post_items.post_id
      and post.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own fit post items" on public.fit_post_items;
create policy "Users can update own fit post items"
on public.fit_post_items
for update
using (
  exists (
    select 1
    from public.fit_check_posts post
    where post.id = fit_post_items.post_id
      and post.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.fit_check_posts post
    where post.id = fit_post_items.post_id
      and post.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own fit post items" on public.fit_post_items;
create policy "Users can delete own fit post items"
on public.fit_post_items
for delete
using (
  exists (
    select 1
    from public.fit_check_posts post
    where post.id = fit_post_items.post_id
      and post.user_id = auth.uid()
  )
);
