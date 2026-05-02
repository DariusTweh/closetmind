insert into storage.buckets (id, name, public)
values ('onboarding', 'onboarding', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Authenticated users can view profile avatars" on storage.objects;
create policy "Authenticated users can view profile avatars"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'onboarding'
  and (storage.foldername(name))[1] = 'avatars'
);

