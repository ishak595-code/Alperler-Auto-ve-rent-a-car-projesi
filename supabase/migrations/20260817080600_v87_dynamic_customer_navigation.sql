create table if not exists public.navigation_settings (
  config_key text primary key default 'main',
  mobile_dock_enabled boolean not null default true,
  mobile_menu_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint navigation_settings_singleton check (config_key = 'main')
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (surface in ('MOBILE_DOCK','MOBILE_MENU')),
  item_key text not null,
  label text not null,
  icon text not null default 'link',
  route text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(surface,item_key),
  constraint navigation_item_key_format check (item_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  constraint navigation_label_length check (char_length(label) between 1 and 60),
  constraint navigation_icon_length check (char_length(icon) between 1 and 60),
  constraint navigation_route_safe check (route ~ '^/[A-Za-z0-9_./?#=&%-]*$')
);

alter table public.navigation_settings enable row level security;
alter table public.navigation_items enable row level security;

drop policy if exists navigation_settings_public_read on public.navigation_settings;
create policy navigation_settings_public_read on public.navigation_settings for select to anon, authenticated using (true);
drop policy if exists navigation_settings_admin_insert on public.navigation_settings;
create policy navigation_settings_admin_insert on public.navigation_settings for insert to authenticated with check (private.can_manage_content());
drop policy if exists navigation_settings_admin_update on public.navigation_settings;
create policy navigation_settings_admin_update on public.navigation_settings for update to authenticated using (private.can_manage_content()) with check (private.can_manage_content());
drop policy if exists navigation_settings_admin_delete on public.navigation_settings;
create policy navigation_settings_admin_delete on public.navigation_settings for delete to authenticated using (private.can_manage_content());

drop policy if exists navigation_items_public_read on public.navigation_items;
create policy navigation_items_public_read on public.navigation_items for select to anon, authenticated using (is_active = true);
drop policy if exists navigation_items_admin_read on public.navigation_items;
create policy navigation_items_admin_read on public.navigation_items for select to authenticated using (private.can_manage_content());
drop policy if exists navigation_items_admin_insert on public.navigation_items;
create policy navigation_items_admin_insert on public.navigation_items for insert to authenticated with check (private.can_manage_content());
drop policy if exists navigation_items_admin_update on public.navigation_items;
create policy navigation_items_admin_update on public.navigation_items for update to authenticated using (private.can_manage_content()) with check (private.can_manage_content());
drop policy if exists navigation_items_admin_delete on public.navigation_items;
create policy navigation_items_admin_delete on public.navigation_items for delete to authenticated using (private.can_manage_content());

insert into public.navigation_settings(config_key,mobile_dock_enabled,mobile_menu_enabled)
values ('main',true,true)
on conflict (config_key) do nothing;

insert into public.navigation_items(surface,item_key,label,icon,route,sort_order,is_active) values
('MOBILE_DOCK','fleet','Kiralık','key','/fleet',10,true),
('MOBILE_DOCK','sales','Satılık','directions_car','/sales',20,true),
('MOBILE_DOCK','search','Ara','search','/search',30,true),
('MOBILE_DOCK','campaigns','Fırsatlar','local_offer','/campaigns',40,true),
('MOBILE_DOCK','appointment','Randevu','event_available','/appointment',50,true),
('MOBILE_MENU','home','Ana Sayfa','home','/',10,true),
('MOBILE_MENU','fleet','Kiralık Araçlar','key','/fleet',20,true),
('MOBILE_MENU','sales','Satılık Araçlar','directions_car','/sales',30,true),
('MOBILE_MENU','campaigns','Kampanyalar','local_offer','/campaigns',40,true),
('MOBILE_MENU','appointment','Randevu','event_available','/appointment',50,true),
('MOBILE_MENU','list-car','Aracını Değerlendir','sell','/list-your-car',60,true),
('MOBILE_MENU','tours','Turlar','explore','/tours',70,true),
('MOBILE_MENU','branches','Şubeler','storefront','/branches',80,true),
('MOBILE_MENU','blog','Blog','article','/blog',90,true),
('MOBILE_MENU','contact','İletişim','support_agent','/contact',100,true),
('MOBILE_MENU','about','Hakkımızda','info','/about',110,true)
on conflict (surface,item_key) do nothing;

create index if not exists navigation_items_surface_sort_idx on public.navigation_items(surface,sort_order,id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='navigation_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.navigation_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='navigation_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.navigation_items;
  END IF;
END $$;
