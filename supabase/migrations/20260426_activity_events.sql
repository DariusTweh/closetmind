create extension if not exists pgcrypto;

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  post_id uuid references public.fit_check_posts(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint activity_events_event_type_check
    check (event_type in ('follow', 'reaction', 'style_note', 'save', 'fit_check_posted', 'daily_prompt'))
);

create index if not exists idx_activity_events_recipient_created_at
  on public.activity_events (recipient_id, created_at desc);

create index if not exists idx_activity_events_recipient_read_at
  on public.activity_events (recipient_id, read_at);

create index if not exists idx_activity_events_post_id
  on public.activity_events (post_id);

alter table public.activity_events enable row level security;

drop policy if exists "Users can view own activity events" on public.activity_events;
create policy "Users can view own activity events"
on public.activity_events
for select
using (auth.uid() = recipient_id);

drop policy if exists "Users can insert own activity events" on public.activity_events;
create policy "Users can insert own activity events"
on public.activity_events
for insert
with check (auth.uid() = actor_id);

drop policy if exists "Users can update own activity events" on public.activity_events;
create policy "Users can update own activity events"
on public.activity_events
for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);
