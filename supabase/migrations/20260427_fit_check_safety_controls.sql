create extension if not exists pgcrypto;

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_blocker_blocked_key unique (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

create table if not exists public.hidden_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint hidden_posts_user_post_key unique (user_id, post_id)
);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_user_blocks_blocker_id
  on public.user_blocks (blocker_id);

create index if not exists idx_user_blocks_blocked_id
  on public.user_blocks (blocked_id);

create index if not exists idx_hidden_posts_user_id
  on public.hidden_posts (user_id);

create index if not exists idx_hidden_posts_post_id
  on public.hidden_posts (post_id);

create index if not exists idx_post_reports_reporter_id
  on public.post_reports (reporter_id);

create index if not exists idx_post_reports_post_id
  on public.post_reports (post_id);

create index if not exists idx_profile_reports_reporter_id
  on public.profile_reports (reporter_id);

create index if not exists idx_profile_reports_reported_user_id
  on public.profile_reports (reported_user_id);

alter table public.user_blocks enable row level security;
alter table public.hidden_posts enable row level security;
alter table public.post_reports enable row level security;
alter table public.profile_reports enable row level security;

drop policy if exists "Users can view own blocks" on public.user_blocks;
create policy "Users can view own blocks"
on public.user_blocks
for select
using (auth.uid() = blocker_id);

drop policy if exists "Users can insert own blocks" on public.user_blocks;
create policy "Users can insert own blocks"
on public.user_blocks
for insert
with check (auth.uid() = blocker_id);

drop policy if exists "Users can delete own blocks" on public.user_blocks;
create policy "Users can delete own blocks"
on public.user_blocks
for delete
using (auth.uid() = blocker_id);

drop policy if exists "Users can view own hidden posts" on public.hidden_posts;
create policy "Users can view own hidden posts"
on public.hidden_posts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own hidden posts" on public.hidden_posts;
create policy "Users can insert own hidden posts"
on public.hidden_posts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own hidden posts" on public.hidden_posts;
create policy "Users can delete own hidden posts"
on public.hidden_posts
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own post reports" on public.post_reports;
create policy "Users can view own post reports"
on public.post_reports
for select
using (auth.uid() = reporter_id);

drop policy if exists "Users can insert own post reports" on public.post_reports;
create policy "Users can insert own post reports"
on public.post_reports
for insert
with check (auth.uid() = reporter_id);

drop policy if exists "Users can view own profile reports" on public.profile_reports;
create policy "Users can view own profile reports"
on public.profile_reports
for select
using (auth.uid() = reporter_id);

drop policy if exists "Users can insert own profile reports" on public.profile_reports;
create policy "Users can insert own profile reports"
on public.profile_reports
for insert
with check (auth.uid() = reporter_id);

drop policy if exists "Users can delete follow rows involving blocked users" on public.follows;
create policy "Users can delete follow rows involving blocked users"
on public.follows
for delete
using (
  exists (
    select 1
    from public.user_blocks ub
    where ub.blocker_id = auth.uid()
      and (
        (follows.follower_id = auth.uid() and follows.following_id = ub.blocked_id)
        or (follows.following_id = auth.uid() and follows.follower_id = ub.blocked_id)
      )
  )
);
