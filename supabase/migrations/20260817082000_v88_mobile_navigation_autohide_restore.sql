alter table public.navigation_settings
  add column if not exists mobile_dock_auto_hide boolean not null default true;

alter table public.navigation_items
  add column if not exists archived_at timestamptz null;

create index if not exists navigation_items_surface_archive_sort_idx
  on public.navigation_items(surface, archived_at, sort_order);

drop policy if exists navigation_items_public_read on public.navigation_items;
create policy navigation_items_public_read
  on public.navigation_items
  for select
  to anon, authenticated
  using (is_active = true and archived_at is null);

update public.navigation_settings
set mobile_dock_auto_hide = true,
    updated_at = now()
where config_key = 'main';
