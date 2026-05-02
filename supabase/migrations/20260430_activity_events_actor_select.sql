drop policy if exists "Users can view activity events they created" on public.activity_events;
create policy "Users can view activity events they created"
on public.activity_events
for select
using (auth.uid() = actor_id);
