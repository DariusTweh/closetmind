with opted_in_users as (
  select distinct token.user_id
  from public.user_push_tokens token
  where token.is_active = true
    and token.expo_push_token is not null
    and btrim(token.expo_push_token) <> ''

  union

  select profile.id as user_id
  from public.profiles profile
  where profile.notifications_enabled = true
)
insert into public.user_notification_preferences (
  user_id,
  daily_fit_check_reminder,
  reactions,
  style_notes,
  follows,
  saves_recreates
)
select
  user_id,
  true,
  true,
  true,
  true,
  true
from opted_in_users
on conflict (user_id) do update
set
  daily_fit_check_reminder = true,
  updated_at = now()
where public.user_notification_preferences.daily_fit_check_reminder is distinct from true;
