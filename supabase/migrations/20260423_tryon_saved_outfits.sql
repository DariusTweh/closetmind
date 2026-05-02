alter table public.tryon_jobs
  add column if not exists saved_outfit_id uuid references public.saved_outfits(id) on delete set null;

create index if not exists idx_tryon_jobs_user_id_saved_outfit_id_created_at
on public.tryon_jobs (user_id, saved_outfit_id, created_at desc);
