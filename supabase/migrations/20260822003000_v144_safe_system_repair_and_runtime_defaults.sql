create table if not exists public.system_maintenance_runs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) on delete set null,
  action text not null default 'SAFE_REPAIR',
  status text not null default 'COMPLETED' check (status in ('STARTED','COMPLETED','FAILED')),
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.system_maintenance_runs enable row level security;
revoke all on table public.system_maintenance_runs from anon;
grant select on table public.system_maintenance_runs to authenticated;

create policy "admins_read_maintenance_runs"
on public.system_maintenance_runs
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.is_active = true
  )
);

insert into public.site_config(key, value, is_public, updated_at)
values (
  'runtime_controls',
  jsonb_build_object(
    'maintenanceMode', false,
    'readOnlyMode', false,
    'allowBookings', true,
    'allowAppointments', true,
    'allowContact', true,
    'allowPartnerRequests', true,
    'maintenanceTitle', 'Kısa bir bakım çalışması yapıyoruz',
    'maintenanceMessage', 'Hizmeti daha iyi hale getirmek için kısa süreli bakım yapıyoruz. Lütfen biraz sonra tekrar deneyin.',
    'statusMessage', '',
    'updatedByAdmin', false
  ), true, now()
)
on conflict (key) do update
set value = jsonb_build_object(
    'maintenanceMode', false,
    'readOnlyMode', false,
    'allowBookings', true,
    'allowAppointments', true,
    'allowContact', true,
    'allowPartnerRequests', true,
    'maintenanceTitle', coalesce(nullif(public.site_config.value->>'maintenanceTitle',''), 'Kısa bir bakım çalışması yapıyoruz'),
    'maintenanceMessage', coalesce(nullif(public.site_config.value->>'maintenanceMessage',''), 'Hizmeti daha iyi hale getirmek için kısa süreli bakım yapıyoruz. Lütfen biraz sonra tekrar deneyin.'),
    'statusMessage', '',
    'updatedByAdmin', false
  ),
  is_public = true,
  updated_at = now();

insert into public.navigation_settings(config_key, mobile_dock_enabled, mobile_menu_enabled, mobile_dock_auto_hide, updated_at)
values ('main', true, true, true, now())
on conflict (config_key) do update
set mobile_dock_enabled = true,
    mobile_menu_enabled = true,
    updated_at = now();

create or replace function public.admin_repair_system_defaults()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_run uuid;
  v_nav_inserted int := 0;
  v_sections_inserted int := 0;
  v_result jsonb;
begin
  if v_uid is null or not exists (
    select 1 from public.admin_users au
    where au.user_id = v_uid and au.is_active = true and au.role in ('owner','admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtext('alperler_safe_system_repair'));

  insert into public.system_maintenance_runs(requested_by, action, status)
  values (v_uid, 'SAFE_REPAIR', 'STARTED') returning id into v_run;

  insert into public.site_config(key, value, is_public, updated_at)
  values ('runtime_controls', jsonb_build_object(
      'maintenanceMode', false,
      'readOnlyMode', false,
      'allowBookings', true,
      'allowAppointments', true,
      'allowContact', true,
      'allowPartnerRequests', true,
      'maintenanceTitle', 'Kısa bir bakım çalışması yapıyoruz',
      'maintenanceMessage', 'Hizmeti daha iyi hale getirmek için kısa süreli bakım yapıyoruz. Lütfen biraz sonra tekrar deneyin.',
      'statusMessage', '',
      'updatedByAdmin', true
    ), true, now())
  on conflict (key) do update
  set value = jsonb_build_object(
      'maintenanceMode', false,
      'readOnlyMode', false,
      'allowBookings', true,
      'allowAppointments', true,
      'allowContact', true,
      'allowPartnerRequests', true,
      'maintenanceTitle', coalesce(nullif(public.site_config.value->>'maintenanceTitle',''), 'Kısa bir bakım çalışması yapıyoruz'),
      'maintenanceMessage', coalesce(nullif(public.site_config.value->>'maintenanceMessage',''), 'Hizmeti daha iyi hale getirmek için kısa süreli bakım yapıyoruz. Lütfen biraz sonra tekrar deneyin.'),
      'statusMessage', '',
      'updatedByAdmin', true
    ), is_public = true, updated_at = now();

  insert into public.navigation_settings(config_key, mobile_dock_enabled, mobile_menu_enabled, mobile_dock_auto_hide, updated_at)
  values ('main', true, true, true, now())
  on conflict (config_key) do update
  set mobile_dock_enabled = true,
      mobile_menu_enabled = true,
      mobile_dock_auto_hide = coalesce(public.navigation_settings.mobile_dock_auto_hide, true),
      updated_at = now();

  with wanted(surface, item_key, label, icon, route, sort_order) as (
    values
      ('MOBILE_DOCK','fleet','Kiralık araçlar','key','/fleet',10),
      ('MOBILE_DOCK','sales','Satılık araçlar','directions_car','/sales',20),
      ('MOBILE_DOCK','search','Ara','search','/search',30),
      ('MOBILE_DOCK','campaigns','Fırsatlar','local_offer','/campaigns',40),
      ('MOBILE_DOCK','account','Profil','account_circle','/account',50),
      ('MOBILE_MENU','home','Ana Sayfa','home','/',10),
      ('MOBILE_MENU','fleet','Kiralık Araçlar','key','/fleet',20),
      ('MOBILE_MENU','sales','Satılık Araçlar','directions_car','/sales',30),
      ('MOBILE_MENU','campaigns','Kampanyalar','local_offer','/campaigns',40),
      ('MOBILE_MENU','appointment','Randevu','event_available','/appointment',50),
      ('MOBILE_MENU','list-car','Aracını Değerlendir','sell','/list-your-car',60),
      ('MOBILE_MENU','tours','Turlar','explore','/tours',70),
      ('MOBILE_MENU','branches','Şubeler','storefront','/branches',80),
      ('MOBILE_MENU','blog','Blog','article','/blog',90),
      ('MOBILE_MENU','contact','İletişim','support_agent','/contact',100),
      ('MOBILE_MENU','about','Hakkımızda','info','/about',110)
  ), inserted as (
    insert into public.navigation_items(surface,item_key,label,icon,route,sort_order,is_active,archived_at,metadata,updated_at)
    select w.surface,w.item_key,w.label,w.icon,w.route,w.sort_order,true,null,'{}'::jsonb,now()
    from wanted w
    where not exists (select 1 from public.navigation_items n where n.surface=w.surface and n.item_key=w.item_key)
    returning 1
  ) select count(*) into v_nav_inserted from inserted;

  with wanted(section_key,title,section_type,is_enabled,sort_order,max_items,settings) as (
    values
      ('campaigns','Planınızı Avantaja Çeviren Fırsatlar','CAMPAIGN',true,5,3,'{}'::jsonb),
      ('rental_featured','Öne Çıkan Kiralık Araçlar','VEHICLES',true,10,4,'{"category":"RENTAL"}'::jsonb),
      ('sale_featured','Öne Çıkan İkinci El Araçlar','VEHICLES',true,20,4,'{"category":"SALE"}'::jsonb),
      ('tour_featured','Hakkâri ve Yüksekova Rotaları','TOURS',true,30,4,'{}'::jsonb),
      ('branches','Size En Yakın Alperler Rent A Car','CUSTOM',true,35,3,'{}'::jsonb),
      ('partner','Aracınız Değerini Bulsun','CUSTOM',true,40,1,'{}'::jsonb),
      ('blog_featured','Yola Çıkmadan Önce','BLOG',true,50,3,'{}'::jsonb)
  ), inserted as (
    insert into public.homepage_sections(section_key,title,section_type,is_enabled,sort_order,max_items,settings,updated_by,updated_at)
    select w.section_key,w.title,w.section_type,w.is_enabled,w.sort_order,w.max_items,w.settings,v_uid,now()
    from wanted w
    where not exists (select 1 from public.homepage_sections h where h.section_key=w.section_key)
    returning 1
  ) select count(*) into v_sections_inserted from inserted;

  update public.navigation_items
  set is_active = true, archived_at = null, updated_at = now()
  where surface='MOBILE_DOCK'
    and item_key in ('fleet','sales','search','campaigns','account')
    and (is_active=false or archived_at is not null);

  v_result := jsonb_build_object(
    'ok', true,
    'runId', v_run,
    'runtimeRestored', true,
    'navigationSettingsRestored', true,
    'navigationItemsInserted', v_nav_inserted,
    'homepageSectionsInserted', v_sections_inserted,
    'businessDataDeleted', false,
    'completedAt', now()
  );

  update public.system_maintenance_runs set status='COMPLETED', summary=v_result, completed_at=now() where id=v_run;
  return v_result;
exception when others then
  if v_run is not null then
    update public.system_maintenance_runs set status='FAILED', summary=jsonb_build_object('ok',false,'error',sqlstate), completed_at=now() where id=v_run;
  end if;
  raise;
end;
$$;

revoke all on function public.admin_repair_system_defaults() from public, anon;
grant execute on function public.admin_repair_system_defaults() to authenticated, service_role;
