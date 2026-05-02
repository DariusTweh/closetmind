create extension if not exists pgcrypto;

create table if not exists public.fit_check_ai_results (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.fit_check_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  selected_focus text[] not null default '{}'::text[],
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint fit_check_ai_results_mode_check
    check (mode in ('verdict', 'breakdown'))
);

create index if not exists idx_fit_check_ai_results_lookup
  on public.fit_check_ai_results (post_id, user_id, mode, created_at desc);

alter table public.fit_check_ai_results enable row level security;

drop policy if exists "Users can view own fit check ai results" on public.fit_check_ai_results;
create policy "Users can view own fit check ai results"
on public.fit_check_ai_results
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own fit check ai results" on public.fit_check_ai_results;
create policy "Users can insert own fit check ai results"
on public.fit_check_ai_results
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own fit check ai results" on public.fit_check_ai_results;
create policy "Users can update own fit check ai results"
on public.fit_check_ai_results
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own fit check ai results" on public.fit_check_ai_results;
create policy "Users can delete own fit check ai results"
on public.fit_check_ai_results
for delete
using (auth.uid() = user_id);
