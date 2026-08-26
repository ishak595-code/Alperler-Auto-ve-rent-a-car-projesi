begin;

-- V178: portable Super Admin core boundary.
-- Browser code must not mutate/read privileged admin tables directly. The Edge
-- gateway authenticates the bearer token and these service-role-only RPCs keep
-- authorization, transactions and audit behavior inside the database migration
-- chain so a fresh deployment converges to the same behavior.

create or replace function private.can_actor_manage_team_v178(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select p_actor is not null and exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor
      and au.is_active = true
      and (
        lower(coalesce(au.role, '')) in ('owner','admin')
        or coalesce(au.permissions, '{}'::jsonb) @> '{"team.manage":true}'::jsonb
      )
  );
$$;

revoke all on function private.can_actor_manage_team_v178(uuid) from public, anon, authenticated;
grant execute on function private.can_actor_manage_team_v178(uuid) to service_role;

create or replace function public.service_admin_operations_snapshot_v178(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
begin
  if not (
    private.can_actor_manage_operations(p_actor)
    or private.can_actor_manage_settings_v174(p_actor)
  ) then
    raise exception 'ADMIN_OPERATIONS_REQUIRED';
  end if;

  return jsonb_build_object(
    'ok', true,
    'bookings', (select count(*) from public.bookings b where b.deleted_at is null),
    'pendingBookings', (select count(*) from public.bookings b where b.deleted_at is null and b.status = 'PENDING'),
    'appointments', (select count(*) from public.bookings b where b.deleted_at is null and b.booking_type = 'APPOINTMENT'),
    'saleInquiries', (select count(*) from public.bookings b where b.deleted_at is null and b.booking_type = 'SALE_INQUIRY'),
    'tourBookings', (select count(*) from public.bookings b where b.deleted_at is null and b.booking_type = 'TOUR'),
    'openMessages', (select count(*) from public.contact_messages m where m.status in ('NEW','READ')),
    'openPartnerRequests', (select count(*) from public.partner_requests r where r.status in ('NEW','UPLOADING','REVIEWING')),
    'activeSubscribers', (select count(*) from public.subscribers s where s.status = 'ACTIVE'),
    'activeStaff', (select count(*) from public.staff_profiles s where s.is_active = true),
    'failedNotifications', (select count(*) from public.notification_deliveries n where n.status = 'FAILED'),
    'revenue', coalesce((select sum(coalesce(b.total_price, 0)) from public.bookings b where b.deleted_at is null and b.status <> 'REJECTED'), 0),
    'recentAudit', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'action', q.action,
        'entityType', q.entity_type,
        'entityId', q.entity_id,
        'actorEmail', q.actor_email,
        'createdAt', q.created_at
      ) order by q.created_at desc)
      from (
        select a.id, a.action, a.entity_type, a.entity_id, a.actor_email, a.created_at
        from public.audit_logs a
        order by a.created_at desc
        limit 12
      ) q
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.service_admin_management_snapshot_v178(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
begin
  if not private.can_actor_manage_team_v178(p_actor) then
    raise exception 'ADMIN_TEAM_REQUIRED';
  end if;

  return jsonb_build_object(
    'ok', true,
    'staff', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.display_name asc)
      from public.staff_profiles s
    ), '[]'::jsonb),
    'branches', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.sort_order asc, b.name asc)
      from public.branches b
    ), '[]'::jsonb),
    'admins', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', a.user_id,
        'email', a.email,
        'display_name', a.display_name,
        'role', a.role,
        'is_active', a.is_active,
        'permissions', a.permissions,
        'primary_branch_id', a.primary_branch_id,
        'created_at', a.created_at
      ) order by a.created_at asc)
      from public.admin_users a
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.service_admin_staff_branches_v178(p_actor uuid, p_staff_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
begin
  if not private.can_actor_manage_team_v178(p_actor) then
    raise exception 'ADMIN_TEAM_REQUIRED';
  end if;
  if not exists(select 1 from public.staff_profiles s where s.id = p_staff_id) then
    raise exception 'STAFF_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'ok', true,
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object('branchId', a.branch_id, 'isPrimary', a.is_primary) order by a.is_primary desc, a.created_at asc)
      from public.staff_branch_assignments a
      where a.staff_id = p_staff_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.service_save_staff_v178(
  p_actor uuid,
  p_staff_id uuid,
  p_display_name text,
  p_email text,
  p_phone text,
  p_job_title text,
  p_department text,
  p_is_active boolean,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_name text := left(btrim(coalesce(p_display_name, '')), 160);
  v_department text := upper(btrim(coalesce(p_department, 'GENERAL')));
  v_actor_email text;
begin
  if not private.can_actor_manage_team_v178(p_actor) then
    raise exception 'ADMIN_TEAM_REQUIRED';
  end if;
  if v_name = '' then raise exception 'STAFF_NAME_REQUIRED'; end if;
  if v_department not in ('MANAGEMENT','SALES','RENTAL','FLEET','TOURS','CONTENT','SUPPORT','GENERAL') then
    raise exception 'INVALID_STAFF_DEPARTMENT';
  end if;
  select a.email into v_actor_email from public.admin_users a where a.user_id = p_actor;

  if p_staff_id is null then
    insert into public.staff_profiles(display_name,email,phone,job_title,department,is_active,metadata,created_by,updated_at)
    values (
      v_name,
      nullif(lower(left(btrim(coalesce(p_email,'')),160)),''),
      nullif(left(btrim(coalesce(p_phone,'')),40),''),
      nullif(left(btrim(coalesce(p_job_title,'')),120),''),
      v_department,
      coalesce(p_is_active,true),
      coalesce(p_metadata,'{}'::jsonb),
      p_actor,
      now()
    )
    returning * into v_staff;
  else
    update public.staff_profiles s
    set display_name = v_name,
        email = nullif(lower(left(btrim(coalesce(p_email,'')),160)),''),
        phone = nullif(left(btrim(coalesce(p_phone,'')),40),''),
        job_title = nullif(left(btrim(coalesce(p_job_title,'')),120),''),
        department = v_department,
        is_active = coalesce(p_is_active,true),
        metadata = coalesce(p_metadata,'{}'::jsonb),
        updated_at = now()
    where s.id = p_staff_id
    returning * into v_staff;
    if not found then raise exception 'STAFF_NOT_FOUND'; end if;
  end if;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values (p_actor,v_actor_email,'STAFF_SAVED_V178','staff_profile',v_staff.id::text,to_jsonb(v_staff),jsonb_build_object('gateway','admin-core-v178'));

  return jsonb_build_object('ok',true,'staff',to_jsonb(v_staff));
end;
$$;

create or replace function public.service_set_staff_active_v178(p_actor uuid, p_staff_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare v_actor_email text;
begin
  if not private.can_actor_manage_team_v178(p_actor) then raise exception 'ADMIN_TEAM_REQUIRED'; end if;
  update public.staff_profiles set is_active=coalesce(p_active,false), updated_at=now() where id=p_staff_id;
  if not found then raise exception 'STAFF_NOT_FOUND'; end if;
  select email into v_actor_email from public.admin_users where user_id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'STAFF_ACTIVE_UPDATED_V178','staff_profile',p_staff_id::text,jsonb_build_object('isActive',coalesce(p_active,false)),jsonb_build_object('gateway','admin-core-v178'));
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.service_assign_staff_branch_v178(p_actor uuid, p_staff_id uuid, p_branch_id uuid, p_primary boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare v_actor_email text;
begin
  if not private.can_actor_manage_team_v178(p_actor) then raise exception 'ADMIN_TEAM_REQUIRED'; end if;
  if not exists(select 1 from public.staff_profiles where id=p_staff_id) then raise exception 'STAFF_NOT_FOUND'; end if;
  if not exists(select 1 from public.branches where id=p_branch_id) then raise exception 'BRANCH_NOT_FOUND'; end if;
  if coalesce(p_primary,false) then
    update public.staff_branch_assignments set is_primary=false where staff_id=p_staff_id and is_primary=true;
  end if;
  insert into public.staff_branch_assignments(staff_id,branch_id,is_primary)
  values(p_staff_id,p_branch_id,coalesce(p_primary,false))
  on conflict(staff_id,branch_id) do update set is_primary=excluded.is_primary;
  select email into v_actor_email from public.admin_users where user_id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'STAFF_BRANCH_ASSIGNED_V178','staff_profile',p_staff_id::text,jsonb_build_object('branchId',p_branch_id,'isPrimary',coalesce(p_primary,false)),jsonb_build_object('gateway','admin-core-v178'));
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.service_unassign_staff_branch_v178(p_actor uuid, p_staff_id uuid, p_branch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare v_actor_email text;
begin
  if not private.can_actor_manage_team_v178(p_actor) then raise exception 'ADMIN_TEAM_REQUIRED'; end if;
  delete from public.staff_branch_assignments where staff_id=p_staff_id and branch_id=p_branch_id;
  select email into v_actor_email from public.admin_users where user_id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'STAFF_BRANCH_UNASSIGNED_V178','staff_profile',p_staff_id::text,jsonb_build_object('branchId',p_branch_id),jsonb_build_object('gateway','admin-core-v178'));
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.service_assign_staff_vehicle_v178(p_actor uuid, p_vehicle_id uuid, p_staff_id uuid, p_responsibility text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare v_role text := upper(btrim(coalesce(p_responsibility,''))); v_actor_email text;
begin
  if not private.can_actor_manage_team_v178(p_actor) then raise exception 'ADMIN_TEAM_REQUIRED'; end if;
  if v_role not in ('RESPONSIBLE','SALES','FLEET','DELIVERY','MAINTENANCE') then raise exception 'INVALID_VEHICLE_RESPONSIBILITY'; end if;
  insert into public.vehicle_staff_assignments(vehicle_id,staff_id,responsibility)
  values(p_vehicle_id,p_staff_id,v_role) on conflict do nothing;
  select email into v_actor_email from public.admin_users where user_id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'STAFF_VEHICLE_ASSIGNED_V178','vehicle',p_vehicle_id::text,jsonb_build_object('staffId',p_staff_id,'responsibility',v_role),jsonb_build_object('gateway','admin-core-v178'));
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.service_assign_staff_tour_v178(p_actor uuid, p_tour_id uuid, p_staff_id uuid, p_responsibility text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare v_role text := upper(btrim(coalesce(p_responsibility,''))); v_actor_email text;
begin
  if not private.can_actor_manage_team_v178(p_actor) then raise exception 'ADMIN_TEAM_REQUIRED'; end if;
  if v_role not in ('COORDINATOR','GUIDE','DRIVER','CONTENT') then raise exception 'INVALID_TOUR_RESPONSIBILITY'; end if;
  insert into public.tour_staff_assignments(tour_id,staff_id,responsibility)
  values(p_tour_id,p_staff_id,v_role) on conflict do nothing;
  select email into v_actor_email from public.admin_users where user_id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'STAFF_TOUR_ASSIGNED_V178','tour',p_tour_id::text,jsonb_build_object('staffId',p_staff_id,'responsibility',v_role),jsonb_build_object('gateway','admin-core-v178'));
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.service_save_branch_basic_v178(
  p_actor uuid,
  p_branch_id uuid,
  p_code text,
  p_name text,
  p_city text,
  p_district text,
  p_address text,
  p_phone text,
  p_email text,
  p_is_active boolean,
  p_sort_order integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_branch public.branches%rowtype;
  v_name text := left(btrim(coalesce(p_name,'')),160);
  v_city text := left(btrim(coalesce(p_city,'')),120);
  v_code text := nullif(upper(left(regexp_replace(btrim(coalesce(p_code,'')),'[^A-Za-z0-9_-]+','','g'),40)),'');
  v_actor_email text;
begin
  if not (
    private.can_actor_manage_team_v178(p_actor)
    or private.can_actor_manage_settings_v174(p_actor)
  ) then raise exception 'ADMIN_BRANCH_MANAGE_REQUIRED'; end if;
  if v_name='' then raise exception 'BRANCH_NAME_REQUIRED'; end if;
  if v_city='' then raise exception 'BRANCH_CITY_REQUIRED'; end if;
  select email into v_actor_email from public.admin_users where user_id=p_actor;

  if p_branch_id is null then
    insert into public.branches(code,name,city,district,address_line,phone,email,is_active,sort_order,updated_at)
    values(v_code,v_name,v_city,nullif(left(btrim(coalesce(p_district,'')),120),''),nullif(left(btrim(coalesce(p_address,'')),500),''),nullif(left(btrim(coalesce(p_phone,'')),40),''),nullif(lower(left(btrim(coalesce(p_email,'')),160)),''),coalesce(p_is_active,true),greatest(coalesce(p_sort_order,0),0),now())
    returning * into v_branch;
  else
    update public.branches b
    set code=v_code,
        name=v_name,
        city=v_city,
        district=nullif(left(btrim(coalesce(p_district,'')),120),''),
        address_line=nullif(left(btrim(coalesce(p_address,'')),500),''),
        phone=nullif(left(btrim(coalesce(p_phone,'')),40),''),
        email=nullif(lower(left(btrim(coalesce(p_email,'')),160)),''),
        is_active=coalesce(p_is_active,true),
        sort_order=greatest(coalesce(p_sort_order,0),0),
        updated_at=now()
    where b.id=p_branch_id
    returning * into v_branch;
    if not found then raise exception 'BRANCH_NOT_FOUND'; end if;
  end if;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'BRANCH_BASIC_SAVED_V178','branch',v_branch.id::text,jsonb_build_object('code',v_branch.code,'name',v_branch.name,'city',v_branch.city,'isActive',v_branch.is_active,'sortOrder',v_branch.sort_order),jsonb_build_object('gateway','admin-core-v178'));
  return jsonb_build_object('ok',true,'branch',to_jsonb(v_branch));
end;
$$;

revoke all on function public.service_admin_operations_snapshot_v178(uuid) from public, anon, authenticated;
revoke all on function public.service_admin_management_snapshot_v178(uuid) from public, anon, authenticated;
revoke all on function public.service_admin_staff_branches_v178(uuid,uuid) from public, anon, authenticated;
revoke all on function public.service_save_staff_v178(uuid,uuid,text,text,text,text,text,boolean,jsonb) from public, anon, authenticated;
revoke all on function public.service_set_staff_active_v178(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.service_assign_staff_branch_v178(uuid,uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.service_unassign_staff_branch_v178(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.service_assign_staff_vehicle_v178(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.service_assign_staff_tour_v178(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.service_save_branch_basic_v178(uuid,uuid,text,text,text,text,text,text,text,boolean,integer) from public, anon, authenticated;

grant execute on function public.service_admin_operations_snapshot_v178(uuid) to service_role;
grant execute on function public.service_admin_management_snapshot_v178(uuid) to service_role;
grant execute on function public.service_admin_staff_branches_v178(uuid,uuid) to service_role;
grant execute on function public.service_save_staff_v178(uuid,uuid,text,text,text,text,text,boolean,jsonb) to service_role;
grant execute on function public.service_set_staff_active_v178(uuid,uuid,boolean) to service_role;
grant execute on function public.service_assign_staff_branch_v178(uuid,uuid,uuid,boolean) to service_role;
grant execute on function public.service_unassign_staff_branch_v178(uuid,uuid,uuid) to service_role;
grant execute on function public.service_assign_staff_vehicle_v178(uuid,uuid,uuid,text) to service_role;
grant execute on function public.service_assign_staff_tour_v178(uuid,uuid,uuid,text) to service_role;
grant execute on function public.service_save_branch_basic_v178(uuid,uuid,text,text,text,text,text,text,text,boolean,integer) to service_role;

commit;
