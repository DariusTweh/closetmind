create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists onboarding_stage text;

alter table public.profiles
  alter column onboarding_completed set default false;

update public.profiles
set onboarding_stage = case
  when onboarding_completed = true then 'complete'
  else coalesce(nullif(trim(onboarding_stage), ''), 'profile_basics')
end
where onboarding_stage is null
   or trim(onboarding_stage) = '';

alter table public.profiles
  alter column onboarding_stage set default 'profile_basics';

alter table public.profiles
  drop constraint if exists profiles_onboarding_stage_check;

alter table public.profiles
  add constraint profiles_onboarding_stage_check
  check (
    onboarding_stage in (
      'profile_basics',
      'use_intent',
      'style_vibe',
      'tone',
      'preference_signals',
      'favorite_stores',
      'style_upload',
      'model',
      'complete'
    )
  );

create table if not exists public.user_style_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_vibes text[] not null default '{}',
  silhouettes text[] not null default '{}',
  seasons text[] not null default '{}',
  core_colors text[] not null default '{}',
  accent_colors text[] not null default '{}',
  fit_prefs jsonb not null default '[]'::jsonb,
  keywords text[] not null default '{}',
  preferred_occasions text[] not null default '{}',
  preferred_formality text,
  favorite_categories text[] not null default '{}',
  avoided_categories text[] not null default '{}',
  preferred_patterns text[] not null default '{}',
  avoided_patterns text[] not null default '{}',
  avoided_colors text[] not null default '{}',
  avoided_vibes text[] not null default '{}',
  profile_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_style_profiles
  add column if not exists primary_vibes text[] not null default '{}',
  add column if not exists silhouettes text[] not null default '{}',
  add column if not exists seasons text[] not null default '{}',
  add column if not exists core_colors text[] not null default '{}',
  add column if not exists accent_colors text[] not null default '{}',
  add column if not exists fit_prefs jsonb not null default '[]'::jsonb,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists preferred_occasions text[] not null default '{}',
  add column if not exists preferred_formality text,
  add column if not exists favorite_categories text[] not null default '{}',
  add column if not exists avoided_categories text[] not null default '{}',
  add column if not exists preferred_patterns text[] not null default '{}',
  add column if not exists avoided_patterns text[] not null default '{}',
  add column if not exists avoided_colors text[] not null default '{}',
  add column if not exists avoided_vibes text[] not null default '{}',
  add column if not exists profile_confidence numeric,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_style_profiles enable row level security;

drop policy if exists "Users can view own style profiles" on public.user_style_profiles;
create policy "Users can view own style profiles"
on public.user_style_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own style profiles" on public.user_style_profiles;
create policy "Users can insert own style profiles"
on public.user_style_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own style profiles" on public.user_style_profiles;
create policy "Users can update own style profiles"
on public.user_style_profiles
for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete own style profiles" on public.user_style_profiles;
create policy "Users can delete own style profiles"
on public.user_style_profiles
for delete
using (auth.uid() = user_id);
