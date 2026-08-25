-- V176 System Health Security Gateway
-- Privileged System Health mutations and reads become service-role-only.
-- Legacy browser RPC/table paths remain temporarily available until V176 frontend cutover is live.

create or replace function public.service_system_health_snapshot_v176(
  p_actor uuid,
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 500));
  v_events jsonb;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception 'SETTINGS_PERMISSION_REQUIRED';
  end if;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.last_seen desc), '[]'::jsonb)
  into v_events
  from (
    select
      e.id,
      e.severity,
      e.source,
      e.code,
      e.message,
      e.route,
      e.occurrence_count,
      e.first_seen,
      e.last_seen,
      e.resolved_at,
      e.auto_recovered,
      e.recovery_action,
      e.release_sha,
      e.client_family,
      e.details
    from public.system_events e
    order by e.last_seen desc
    limit v_limit
  ) row_data;

  return jsonb_build_object('ok', true, 'events', v_events);
end;
$$;

create or replace function public.service_save_runtime_controls_v176(
  p_actor uuid,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_normalized jsonb;
  v_title text;
  v_message text;
  v_status text;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception 'SETTINGS_PERMISSION_REQUIRED';
  end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object' then
    raise exception 'RUNTIME_CONTROLS_OBJECT_REQUIRED';
  end if;
  if pg_column_size(p_value) > 16000 then
    raise exception 'RUNTIME_CONTROLS_PAYLOAD_TOO_LARGE';
  end if;

  v_title := left(btrim(coalesce(p_value->>'maintenanceTitle', '')), 120);
  if v_title = '' then v_title := 'Kısa bir bakım çalışması yapıyoruz'; end if;
  v_message := left(btrim(coalesce(p_value->>'maintenanceMessage', '')), 500);
  if v_message = '' then v_message := 'Lütfen biraz sonra tekrar deneyin.'; end if;
  v_status := left(btrim(coalesce(p_value->>'statusMessage', '')), 250);

  v_normalized := jsonb_build_object(
    'maintenanceMode', case when jsonb_typeof(p_value->'maintenanceMode') = 'boolean' then (p_value->>'maintenanceMode')::boolean else false end,
    'readOnlyMode', case when jsonb_typeof(p_value->'readOnlyMode') = 'boolean' then (p_value->>'readOnlyMode')::boolean else false end,
    'allowBookings', case when jsonb_typeof(p_value->'allowBookings') = 'boolean' then (p_value->>'allowBookings')::boolean else true end,
    'allowAppointments', case when jsonb_typeof(p_value->'allowAppointments') = 'boolean' then (p_value->>'allowAppointments')::boolean else true end,
    'allowContact', case when jsonb_typeof(p_value->'allowContact') = 'boolean' then (p_value->>'allowContact')::boolean else true end,
    'allowPartnerRequests', case when jsonb_typeof(p_value->'allowPartnerRequests') = 'boolean' then (p_value->>'allowPartnerRequests')::boolean else true end,
    'maintenanceTitle', v_title,
    'maintenanceMessage', v_message,
    'statusMessage', v_status,
    'updatedByAdmin', true
  );

  select value into v_before from public.site_config where key = 'runtime_controls' for update;

  insert into public.site_config(key, value, is_public, updated_at)
  values ('runtime_controls', v_normalized, true, now())
  on conflict (key) do update
  set value = excluded.value, is_public = true, updated_at = now()
  returning value into v_after;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, before_data, after_data, event_meta)
  values (
    p_actor,
    'RUNTIME_CONTROLS_UPDATED_V176',
    'SITE_CONFIG',
    'runtime_controls',
    v_before,
    v_after,
    jsonb_build_object('gateway', 'site-content-admin-gateway-v174', 'version', 'V176')
  );

  return jsonb_build_object('ok', true, 'value', v_after);
end;
$$;

create or replace function public.service_set_system_event_resolved_v176(
  p_actor uuid,
  p_event_id bigint,
  p_resolved boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_before timestamptz;
  v_after timestamptz;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception 'SETTINGS_PERMISSION_REQUIRED';
  end if;
  if p_event_id is null or p_event_id <= 0 then
    raise exception 'SYSTEM_EVENT_ID_INVALID';
  end if;

  select resolved_at into v_before
  from public.system_events
  where id = p_event_id
  for update;
  if not found then raise exception 'SYSTEM_EVENT_NOT_FOUND'; end if;

  update public.system_events
  set resolved_at = case when coalesce(p_resolved, false) then now() else null end
  where id = p_event_id
  returning resolved_at into v_after;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, before_data, after_data, event_meta)
  values (
    p_actor,
    'SYSTEM_EVENT_RESOLUTION_UPDATED_V176',
    'SYSTEM_EVENT',
    p_event_id::text,
    jsonb_build_object('resolvedAt', v_before),
    jsonb_build_object('resolvedAt', v_after),
    jsonb_build_object('gateway', 'site-content-admin-gateway-v174', 'version', 'V176')
  );

  return jsonb_build_object('ok', true, 'id', p_event_id, 'resolvedAt', v_after);
end;
$$;

create or replace function public.service_run_safe_repair_v176(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_run uuid;
  v_nav_inserted integer := 0;
  v_sections_inserted integer := 0;
  v_result jsonb;
begin
  if p_actor is null or not exists (
    select 1 from public.admin_users au
    where au.user_id = p_actor and au.is_active = true and lower(au.role) in ('owner','admin')
  ) then
    raise exception 'OWNER_ADMIN_PERMISSION_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('alperler_safe_system_repair'));

  insert into public.system_maintenance_runs(requested_by, action, status)
  values (p_actor, 'SAFE_REPAIR_V176', 'STARTED')
  returning id into v_run;

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
      'updatedByAdmin', true
    ),
    true,
    now()
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
      'updatedByAdmin', true
    ),
    is_public = true,
    updated_at = now();

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
    where not exists (
      select 1 from public.navigation_items n where n.surface=w.surface and n.item_key=w.item_key
    )
    returning 1
  )
  select count(*) into v_nav_inserted from inserted;

  with wanted(section_key,title,section_type,is_enabled,sort_order,max_items,settings) as (
    values
      ('campaigns','Aktif Fırsatlar','CAMPAIGN',true,5,3,'{"badge":"Planınıza Uyan Fırsat","theme":"graphite","width":"wide","layout":"rail","viewAllUrl":"/campaigns","viewAllLabel":"Tüm Fırsatlar","showDiscount":true,"showCountdown":true}'::jsonb),
      ('rental_featured','Kiralık Araçlar','VEHICLES',true,10,4,'{"category":"RENTAL","theme":"light","width":"wide","layout":"rail","viewAllUrl":"/fleet","viewAllLabel":"Tüm Kiralık Araçlar"}'::jsonb),
      ('sale_featured','İkinci El Araçlar','VEHICLES',true,20,4,'{"category":"SALE","theme":"sand","width":"wide","layout":"rail","viewAllUrl":"/sales","viewAllLabel":"Tüm Satılık Araçlar"}'::jsonb),
      ('tour_featured','Turlar ve Rotalar','TOURS',true,30,4,'{"theme":"ocean","width":"wide","layout":"rail","viewAllUrl":"/tours","viewAllLabel":"Tüm Turlar"}'::jsonb),
      ('branches','Şubeler ve Hizmet Noktaları','CUSTOM',true,35,3,'{"renderer":"BRANCHES","badge":"Hizmet Ağı","theme":"soft","width":"wide","layout":"rail","viewAllUrl":"/branches","viewAllLabel":"Tüm Noktalar","showPartnerCta":true,"partnerRoute":"/branch-partner","partnerCtaLabel":"Bayilik Başvurusu","partnerCtaTitle":"Kendi bölgenizde Alperler Auto ile büyümek ister misiniz?"}'::jsonb),
      ('partner','Aracını Değerlendir','CUSTOM',true,40,1,'{"renderer":"PARTNER","badge":"Aracınız İçin Seçenekleri Görün","theme":"brand","width":"wide","layout":"wide","ctaUrl":"/list-your-car","ctaLabel":"Aracımı Değerlendir"}'::jsonb),
      ('blog_featured','Rehber ve İçerikler','BLOG',true,50,3,'{"badge":"Rehber & İpuçları","theme":"light","width":"wide","layout":"rail","viewAllUrl":"/blog","viewAllLabel":"Tüm Yazılar"}'::jsonb)
  ), inserted as (
    insert into public.homepage_sections(section_key,title,section_type,is_enabled,sort_order,max_items,settings,updated_by,updated_at)
    select w.section_key,w.title,w.section_type,w.is_enabled,w.sort_order,w.max_items,w.settings,p_actor,now()
    from wanted w
    where not exists (select 1 from public.homepage_sections h where h.section_key=w.section_key)
    returning 1
  )
  select count(*) into v_sections_inserted from inserted;

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

  update public.system_maintenance_runs
  set status='COMPLETED', summary=v_result, completed_at=now()
  where id=v_run;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, before_data, after_data, event_meta)
  values (
    p_actor,
    'SAFE_SYSTEM_REPAIR_COMPLETED_V176',
    'SYSTEM_MAINTENANCE',
    v_run::text,
    null,
    v_result,
    jsonb_build_object('gateway', 'site-content-admin-gateway-v174', 'version', 'V176')
  );

  return v_result;
exception when others then
  if v_run is not null then
    update public.system_maintenance_runs
    set status='FAILED', summary=jsonb_build_object('ok',false,'error',sqlstate), completed_at=now()
    where id=v_run;
  end if;
  raise;
end;
$$;

revoke all on function public.service_system_health_snapshot_v176(uuid,integer) from public, anon, authenticated;
revoke all on function public.service_save_runtime_controls_v176(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.service_set_system_event_resolved_v176(uuid,bigint,boolean) from public, anon, authenticated;
revoke all on function public.service_run_safe_repair_v176(uuid) from public, anon, authenticated;

grant execute on function public.service_system_health_snapshot_v176(uuid,integer) to service_role;
grant execute on function public.service_save_runtime_controls_v176(uuid,jsonb) to service_role;
grant execute on function public.service_set_system_event_resolved_v176(uuid,bigint,boolean) to service_role;
grant execute on function public.service_run_safe_repair_v176(uuid) to service_role;
