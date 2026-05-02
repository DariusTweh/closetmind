alter table public.profiles
add column if not exists profile_visibility text not null default 'public',
add column if not exists public_closet_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_profile_visibility_check'
  ) then
    alter table public.profiles
    add constraint profiles_profile_visibility_check
    check (profile_visibility in ('public', 'private'));
  end if;
end $$;

create or replace function public.search_public_profiles(search_query text, result_limit integer default 20)
returns table (
  id uuid,
  username text,
  full_name text,
  bio text,
  avatar_url text,
  avatar_path text,
  style_tags text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      trim(coalesce(search_query, '')) as raw_query,
      lower(trim(coalesce(search_query, ''))) as lowered_query,
      greatest(1, least(coalesce(result_limit, 20), 50)) as capped_limit
  )
  select
    p.id,
    nullif(trim(coalesce(to_jsonb(p)->>'username', '')), '') as username,
    nullif(trim(coalesce(to_jsonb(p)->>'full_name', '')), '') as full_name,
    nullif(trim(coalesce(to_jsonb(p)->>'bio', '')), '') as bio,
    nullif(trim(coalesce(to_jsonb(p)->>'avatar_url', '')), '') as avatar_url,
    nullif(trim(coalesce(to_jsonb(p)->>'avatar_path', '')), '') as avatar_path,
    public.profile_style_tags_array(p) as style_tags
  from public.profiles p
  cross join normalized n
  where length(n.raw_query) >= 2
    and (
      lower(coalesce(to_jsonb(p)->>'username', '')) like '%' || n.lowered_query || '%'
      or lower(coalesce(to_jsonb(p)->>'full_name', '')) like '%' || n.lowered_query || '%'
      or exists (
        select 1
        from unnest(public.profile_style_tags_array(p)) as tags(value)
        where lower(value) like '%' || n.lowered_query || '%'
      )
    )
  order by
    case
      when lower(coalesce(to_jsonb(p)->>'username', '')) = n.lowered_query then 300
      when lower(coalesce(to_jsonb(p)->>'username', '')) like n.lowered_query || '%' then 220
      when lower(coalesce(to_jsonb(p)->>'full_name', '')) = n.lowered_query then 200
      when lower(coalesce(to_jsonb(p)->>'full_name', '')) like n.lowered_query || '%' then 150
      when exists (
        select 1
        from unnest(public.profile_style_tags_array(p)) as tags(value)
        where lower(value) = n.lowered_query
      ) then 120
      else 0
    end desc,
    lower(coalesce(to_jsonb(p)->>'username', '')) asc,
    p.id asc
  limit (select capped_limit from normalized);
$$;

create or replace function public.get_public_profile_by_key(profile_key text)
returns table (
  id uuid,
  username text,
  full_name text,
  bio text,
  avatar_url text,
  avatar_path text,
  style_tags text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select trim(coalesce(profile_key, '')) as raw_key
  )
  select
    p.id,
    nullif(trim(coalesce(to_jsonb(p)->>'username', '')), '') as username,
    nullif(trim(coalesce(to_jsonb(p)->>'full_name', '')), '') as full_name,
    nullif(trim(coalesce(to_jsonb(p)->>'bio', '')), '') as bio,
    nullif(trim(coalesce(to_jsonb(p)->>'avatar_url', '')), '') as avatar_url,
    nullif(trim(coalesce(to_jsonb(p)->>'avatar_path', '')), '') as avatar_path,
    public.profile_style_tags_array(p) as style_tags
  from public.profiles p
  cross join normalized n
  where n.raw_key <> ''
    and (
      p.id::text = n.raw_key
      or lower(coalesce(to_jsonb(p)->>'username', '')) = lower(n.raw_key)
    )
  order by
    case when p.id::text = n.raw_key then 0 else 1 end,
    p.id asc
  limit 1;
$$;

create or replace function public.get_public_profiles_by_ids(profile_ids uuid[])
returns table (
  id uuid,
  username text,
  full_name text,
  bio text,
  avatar_url text,
  avatar_path text,
  style_tags text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    nullif(trim(coalesce(to_jsonb(p)->>'username', '')), '') as username,
    nullif(trim(coalesce(to_jsonb(p)->>'full_name', '')), '') as full_name,
    nullif(trim(coalesce(to_jsonb(p)->>'bio', '')), '') as bio,
    nullif(trim(coalesce(to_jsonb(p)->>'avatar_url', '')), '') as avatar_url,
    nullif(trim(coalesce(to_jsonb(p)->>'avatar_path', '')), '') as avatar_path,
    public.profile_style_tags_array(p) as style_tags
  from public.profiles p
  where p.id = any(coalesce(profile_ids, '{}'::uuid[]))
  order by coalesce(array_position(profile_ids, p.id), 999999), p.id asc;
$$;
