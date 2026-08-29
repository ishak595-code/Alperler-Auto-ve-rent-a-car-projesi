-- V213: prestige discovery + manual homepage curation + account-owned favorites.
-- Manual homepage content is placement-driven. max_items remains meaningful only for LATEST mode.

update public.homepage_sections
set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{selectionMode}', '"PLACEMENT"'::jsonb, true)
where section_type in ('VEHICLES', 'TOURS', 'BLOG', 'CAMPAIGN')
  and is_enabled = true
  and coalesce(settings->>'selectionMode', '') <> 'PLACEMENT';

insert into public.navigation_items (surface, item_key, label, icon, route, sort_order, is_active, archived_at, metadata)
values ('MOBILE_MENU', 'search', 'Ara', 'search', '/search', 35, true, null, '{}'::jsonb)
on conflict (surface, item_key) do update
set label = excluded.label,
    icon = excluded.icon,
    route = excluded.route,
    sort_order = excluded.sort_order,
    is_active = true,
    archived_at = null,
    updated_at = now();

create table if not exists public.customer_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null default 'VEHICLE',
  entity_id text not null,
  created_at timestamptz not null default now(),
  constraint customer_favorites_entity_type_check
    check (entity_type in ('VEHICLE', 'TOUR', 'BLOG', 'CAMPAIGN')),
  constraint customer_favorites_entity_id_check
    check (char_length(btrim(entity_id)) between 1 and 160),
  constraint customer_favorites_user_entity_unique
    unique (user_id, entity_type, entity_id)
);

create index if not exists customer_favorites_user_created_idx
  on public.customer_favorites (user_id, created_at desc);

alter table public.customer_favorites enable row level security;

revoke all privileges on table public.customer_favorites from public, anon, authenticated;
grant select, insert, delete on table public.customer_favorites to authenticated;

drop policy if exists customer_favorites_select_own on public.customer_favorites;
create policy customer_favorites_select_own
  on public.customer_favorites
  for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists customer_favorites_insert_own on public.customer_favorites;
create policy customer_favorites_insert_own
  on public.customer_favorites
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists customer_favorites_delete_own on public.customer_favorites;
create policy customer_favorites_delete_own
  on public.customer_favorites
  for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

comment on table public.customer_favorites is
  'Authenticated customer favorites. RLS restricts every row to its owning auth user.';
