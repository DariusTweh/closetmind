create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists plan_tier text default 'free',
add column if not exists is_premium boolean default false,
add column if not exists premium_source text default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_plan_tier_check'
  ) then
    alter table public.profiles
    add constraint profiles_plan_tier_check
    check (plan_tier in ('free', 'plus', 'pro'));
  end if;
end $$;

create table if not exists public.user_usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  outfit_generations_count int default 0,
  style_this_item_count int default 0,
  tryons_count int default 0,
  verdicts_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, period_start, period_end)
);

create table if not exists public.user_tryon_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_product_id text not null,
  credits_purchased int not null,
  credits_remaining int not null,
  revenuecat_transaction_id text,
  purchased_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.user_usage_limits enable row level security;
alter table public.user_tryon_credits enable row level security;

drop policy if exists "Users can read own usage" on public.user_usage_limits;
create policy "Users can read own usage"
on public.user_usage_limits
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage" on public.user_usage_limits;
create policy "Users can insert own usage"
on public.user_usage_limits
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own usage" on public.user_usage_limits;
create policy "Users can update own usage"
on public.user_usage_limits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own tryon credits" on public.user_tryon_credits;
create policy "Users can read own tryon credits"
on public.user_tryon_credits
for select
using (auth.uid() = user_id);
