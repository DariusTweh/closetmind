create extension if not exists pgcrypto;

create or replace function public.set_fit_check_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.fit_check_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  image_path text,
  caption text,
  context text,
  weather_label text,
  mood text,
  visibility text not null default 'friends',
  post_date date not null default current_date,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fit_check_posts_visibility_check
    check (visibility in ('friends', 'followers', 'public'))
);

alter table public.fit_check_posts
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists caption text,
  add column if not exists context text,
  add column if not exists weather_label text,
  add column if not exists mood text,
  add column if not exists visibility text not null default 'friends',
  add column if not exists post_date date not null default current_date,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.fit_check_posts
  drop constraint if exists fit_check_posts_visibility_check;

alter table public.fit_check_posts
  add constraint fit_check_posts_visibility_check
  check (visibility in ('friends', 'followers', 'public'));

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_follower_following_key unique (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create table if not exists public.fit_check_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  constraint fit_check_reactions_post_user_key unique (post_id, user_id)
);

create table if not exists public.fit_check_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid,
  created_at timestamptz not null default now(),
  constraint fit_check_saves_post_user_key unique (post_id, user_id)
);

create table if not exists public.style_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint style_boards_visibility_check
    check (visibility in ('private', 'friends', 'public'))
);

alter table public.style_boards
  add column if not exists description text,
  add column if not exists visibility text not null default 'private',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.style_boards
  drop constraint if exists style_boards_visibility_check;

alter table public.style_boards
  add constraint style_boards_visibility_check
  check (visibility in ('private', 'friends', 'public'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fit_check_saves_board_id_fkey'
  ) then
    alter table public.fit_check_saves
      add constraint fit_check_saves_board_id_fkey
      foreign key (board_id)
      references public.style_boards(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.style_board_posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.style_boards(id) on delete cascade,
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint style_board_posts_board_post_key unique (board_id, post_id)
);

create table if not exists public.style_notes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fit_check_posts_user_created_at
  on public.fit_check_posts (user_id, created_at desc);

create index if not exists idx_fit_check_posts_post_date_visibility
  on public.fit_check_posts (post_date, visibility);

create index if not exists idx_follows_follower_id
  on public.follows (follower_id);

create index if not exists idx_follows_following_id
  on public.follows (following_id);

create index if not exists idx_fit_check_reactions_post_id
  on public.fit_check_reactions (post_id);

create index if not exists idx_fit_check_saves_user_id
  on public.fit_check_saves (user_id);

create index if not exists idx_style_notes_post_id
  on public.style_notes (post_id);

create or replace function public.can_current_user_view_fit_check_post(post_user_id uuid, post_visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = post_user_id
    or post_visibility = 'public'
    or (
      auth.uid() is not null
      and post_visibility = 'followers'
      and exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.following_id = post_user_id
      )
    )
    or (
      auth.uid() is not null
      and post_visibility = 'friends'
      and exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.following_id = post_user_id
      )
      and exists (
        select 1
        from public.follows f
        where f.follower_id = post_user_id
          and f.following_id = auth.uid()
      )
    );
$$;

create or replace function public.can_current_user_view_style_board(board_user_id uuid, board_visibility text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = board_user_id
    or board_visibility = 'public'
    or (
      auth.uid() is not null
      and board_visibility = 'friends'
      and exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.following_id = board_user_id
      )
      and exists (
        select 1
        from public.follows f
        where f.follower_id = board_user_id
          and f.following_id = auth.uid()
      )
    );
$$;

alter table public.fit_check_posts enable row level security;
alter table public.follows enable row level security;
alter table public.fit_check_reactions enable row level security;
alter table public.fit_check_saves enable row level security;
alter table public.style_boards enable row level security;
alter table public.style_board_posts enable row level security;
alter table public.style_notes enable row level security;

drop policy if exists "Users can view visible fit check posts" on public.fit_check_posts;
create policy "Users can view visible fit check posts"
on public.fit_check_posts
for select
using (public.can_current_user_view_fit_check_post(user_id, visibility));

drop policy if exists "Users can insert own fit check posts" on public.fit_check_posts;
create policy "Users can insert own fit check posts"
on public.fit_check_posts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own fit check posts" on public.fit_check_posts;
create policy "Users can update own fit check posts"
on public.fit_check_posts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own fit check posts" on public.fit_check_posts;
create policy "Users can delete own fit check posts"
on public.fit_check_posts
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view follows" on public.follows;
create policy "Users can view follows"
on public.follows
for select
using (true);

drop policy if exists "Users can insert own follows" on public.follows;
create policy "Users can insert own follows"
on public.follows
for insert
with check (auth.uid() = follower_id);

drop policy if exists "Users can delete own follows" on public.follows;
create policy "Users can delete own follows"
on public.follows
for delete
using (auth.uid() = follower_id);

drop policy if exists "Users can view reactions for visible posts" on public.fit_check_reactions;
create policy "Users can view reactions for visible posts"
on public.fit_check_reactions
for select
using (
  exists (
    select 1
    from public.fit_check_posts p
    where p.id = fit_check_reactions.post_id
      and public.can_current_user_view_fit_check_post(p.user_id, p.visibility)
  )
);

drop policy if exists "Users can insert own reactions" on public.fit_check_reactions;
create policy "Users can insert own reactions"
on public.fit_check_reactions
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.fit_check_posts p
    where p.id = fit_check_reactions.post_id
      and public.can_current_user_view_fit_check_post(p.user_id, p.visibility)
  )
);

drop policy if exists "Users can update own reactions" on public.fit_check_reactions;
create policy "Users can update own reactions"
on public.fit_check_reactions
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.fit_check_posts p
    where p.id = fit_check_reactions.post_id
      and public.can_current_user_view_fit_check_post(p.user_id, p.visibility)
  )
);

drop policy if exists "Users can delete own reactions" on public.fit_check_reactions;
create policy "Users can delete own reactions"
on public.fit_check_reactions
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own saves" on public.fit_check_saves;
create policy "Users can view own saves"
on public.fit_check_saves
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own saves" on public.fit_check_saves;
create policy "Users can insert own saves"
on public.fit_check_saves
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own saves" on public.fit_check_saves;
create policy "Users can update own saves"
on public.fit_check_saves
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saves" on public.fit_check_saves;
create policy "Users can delete own saves"
on public.fit_check_saves
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view visible style boards" on public.style_boards;
create policy "Users can view visible style boards"
on public.style_boards
for select
using (public.can_current_user_view_style_board(user_id, visibility));

drop policy if exists "Users can insert own style boards" on public.style_boards;
create policy "Users can insert own style boards"
on public.style_boards
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own style boards" on public.style_boards;
create policy "Users can update own style boards"
on public.style_boards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own style boards" on public.style_boards;
create policy "Users can delete own style boards"
on public.style_boards
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view visible board posts" on public.style_board_posts;
create policy "Users can view visible board posts"
on public.style_board_posts
for select
using (
  exists (
    select 1
    from public.style_boards b
    where b.id = style_board_posts.board_id
      and public.can_current_user_view_style_board(b.user_id, b.visibility)
  )
);

drop policy if exists "Users can insert own board posts" on public.style_board_posts;
create policy "Users can insert own board posts"
on public.style_board_posts
for insert
with check (
  exists (
    select 1
    from public.style_boards b
    where b.id = style_board_posts.board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own board posts" on public.style_board_posts;
create policy "Users can update own board posts"
on public.style_board_posts
for update
using (
  exists (
    select 1
    from public.style_boards b
    where b.id = style_board_posts.board_id
      and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.style_boards b
    where b.id = style_board_posts.board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete own board posts" on public.style_board_posts;
create policy "Users can delete own board posts"
on public.style_board_posts
for delete
using (
  exists (
    select 1
    from public.style_boards b
    where b.id = style_board_posts.board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "Users can view notes for visible posts" on public.style_notes;
create policy "Users can view notes for visible posts"
on public.style_notes
for select
using (
  exists (
    select 1
    from public.fit_check_posts p
    where p.id = style_notes.post_id
      and public.can_current_user_view_fit_check_post(p.user_id, p.visibility)
  )
);

drop policy if exists "Users can insert notes on visible posts" on public.style_notes;
create policy "Users can insert notes on visible posts"
on public.style_notes
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.fit_check_posts p
    where p.id = style_notes.post_id
      and public.can_current_user_view_fit_check_post(p.user_id, p.visibility)
  )
);

drop policy if exists "Users can update own notes" on public.style_notes;
create policy "Users can update own notes"
on public.style_notes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.style_notes;
create policy "Users can delete own notes"
on public.style_notes
for delete
using (auth.uid() = user_id);

drop trigger if exists set_fit_check_posts_updated_at on public.fit_check_posts;
create trigger set_fit_check_posts_updated_at
before update on public.fit_check_posts
for each row
execute function public.set_fit_check_updated_at();

drop trigger if exists set_style_boards_updated_at on public.style_boards;
create trigger set_style_boards_updated_at
before update on public.style_boards
for each row
execute function public.set_fit_check_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fit-check-posts',
  'fit-check-posts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view visible fit check media" on storage.objects;
create policy "Users can view visible fit check media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'fit-check-posts'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.fit_check_posts p
      where p.image_path = storage.objects.name
        and public.can_current_user_view_fit_check_post(p.user_id, p.visibility)
    )
  )
);

drop policy if exists "Users can upload own fit check media" on storage.objects;
create policy "Users can upload own fit check media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fit-check-posts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own fit check media" on storage.objects;
create policy "Users can update own fit check media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'fit-check-posts'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'fit-check-posts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own fit check media" on storage.objects;
create policy "Users can delete own fit check media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fit-check-posts'
  and auth.uid()::text = (storage.foldername(name))[1]
);
