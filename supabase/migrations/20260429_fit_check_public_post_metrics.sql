create or replace function public.get_fit_check_public_post_metrics(post_ids uuid[])
returns table (
  post_id uuid,
  reaction_count bigint,
  save_count bigint,
  style_note_count bigint,
  report_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_posts as (
    select distinct unnest(coalesce(post_ids, '{}'::uuid[])) as post_id
  )
  select
    rp.post_id,
    coalesce(reactions.reaction_count, 0) as reaction_count,
    coalesce(saves.save_count, 0) as save_count,
    coalesce(notes.style_note_count, 0) as style_note_count,
    coalesce(reports.report_count, 0) as report_count
  from requested_posts rp
  left join (
    select post_id, count(*)::bigint as reaction_count
    from public.fit_check_reactions
    where post_id in (select post_id from requested_posts)
    group by post_id
  ) reactions on reactions.post_id = rp.post_id
  left join (
    select post_id, count(*)::bigint as save_count
    from public.fit_check_saves
    where post_id in (select post_id from requested_posts)
    group by post_id
  ) saves on saves.post_id = rp.post_id
  left join (
    select post_id, count(*)::bigint as style_note_count
    from public.style_notes
    where post_id in (select post_id from requested_posts)
    group by post_id
  ) notes on notes.post_id = rp.post_id
  left join (
    select post_id, count(*)::bigint as report_count
    from public.post_reports
    where post_id in (select post_id from requested_posts)
      and lower(coalesce(status, 'open')) <> 'dismissed'
    group by post_id
  ) reports on reports.post_id = rp.post_id
  order by coalesce(array_position(post_ids, rp.post_id), 999999), rp.post_id;
$$;

grant execute on function public.get_fit_check_public_post_metrics(uuid[]) to authenticated;
