create extension if not exists pgcrypto;

create or replace function public.set_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  expo_push_token text,
  platform text,
  app_version text,
  build_number text,
  permission_status text,
  is_active boolean not null default true,
  disabled_reason text,
  last_registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_user_device_key unique (user_id, device_id),
  constraint user_push_tokens_expo_push_token_key unique (expo_push_token)
);

create index if not exists idx_user_push_tokens_user_id
  on public.user_push_tokens (user_id);

create index if not exists idx_user_push_tokens_active_user_id
  on public.user_push_tokens (user_id, is_active);

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_fit_check_reminder boolean not null default false,
  reactions boolean not null default true,
  style_notes boolean not null default true,
  follows boolean not null default true,
  saves_recreates boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notification_delivery_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_daily_fit_check_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  post_id uuid references public.fit_check_posts(id) on delete cascade,
  dedupe_key text not null unique,
  title text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed', 'no_tokens')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_notification_deliveries_recipient_created_at
  on public.push_notification_deliveries (recipient_id, created_at desc);

create index if not exists idx_push_notification_deliveries_dedupe_key
  on public.push_notification_deliveries (dedupe_key);

drop trigger if exists set_user_push_tokens_updated_at on public.user_push_tokens;
create trigger set_user_push_tokens_updated_at
before update on public.user_push_tokens
for each row
execute function public.set_notification_updated_at();

drop trigger if exists set_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger set_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row
execute function public.set_notification_updated_at();

drop trigger if exists set_user_notification_delivery_state_updated_at on public.user_notification_delivery_state;
create trigger set_user_notification_delivery_state_updated_at
before update on public.user_notification_delivery_state
for each row
execute function public.set_notification_updated_at();

alter table public.user_push_tokens enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.user_notification_delivery_state enable row level security;
alter table public.push_notification_deliveries enable row level security;

drop policy if exists "Users can view own push tokens" on public.user_push_tokens;
create policy "Users can view own push tokens"
on public.user_push_tokens
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own push tokens" on public.user_push_tokens;
create policy "Users can insert own push tokens"
on public.user_push_tokens
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own push tokens" on public.user_push_tokens;
create policy "Users can update own push tokens"
on public.user_push_tokens
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push tokens" on public.user_push_tokens;
create policy "Users can delete own push tokens"
on public.user_push_tokens
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own notification preferences" on public.user_notification_preferences;
create policy "Users can view own notification preferences"
on public.user_notification_preferences
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification preferences" on public.user_notification_preferences;
create policy "Users can insert own notification preferences"
on public.user_notification_preferences
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences" on public.user_notification_preferences;
create policy "Users can update own notification preferences"
on public.user_notification_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view own notification delivery state" on public.user_notification_delivery_state;
create policy "Users can view own notification delivery state"
on public.user_notification_delivery_state
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification delivery state" on public.user_notification_delivery_state;
create policy "Users can insert own notification delivery state"
on public.user_notification_delivery_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification delivery state" on public.user_notification_delivery_state;
create policy "Users can update own notification delivery state"
on public.user_notification_delivery_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view own push deliveries" on public.push_notification_deliveries;
create policy "Users can view own push deliveries"
on public.push_notification_deliveries
for select
using (auth.uid() = recipient_id);

alter table public.activity_events
  drop constraint if exists activity_events_event_type_check;

alter table public.activity_events
  add constraint activity_events_event_type_check
  check (event_type in ('follow', 'reaction', 'style_note', 'save', 'recreate', 'fit_check_posted', 'daily_prompt'));
