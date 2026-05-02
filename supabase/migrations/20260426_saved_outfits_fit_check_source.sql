alter table public.saved_outfits
  add column if not exists source_fit_check_post_id uuid references public.fit_check_posts(id) on delete set null;

create index if not exists idx_saved_outfits_source_fit_check_post_id
  on public.saved_outfits (source_fit_check_post_id);
