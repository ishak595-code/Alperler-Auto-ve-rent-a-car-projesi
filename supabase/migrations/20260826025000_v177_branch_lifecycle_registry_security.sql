-- V177 Branch Lifecycle and Vehicle Registry Security Gateway
-- Additive phase: new service-role-only RPCs are deployed before browser cutover.

create or replace function public.service_set_branch_lifecycle_v177(
  p_actor uuid,
  p_branch_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_before public.branches%rowtype;
  v_after public.branches%rowtype;
  v_status text := upper(coalesce(btrim(p_status), ''));
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 500), '');
  v_allowed boolean := false;
begin
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor
      and au.is_active = true
      and (
        lower(au.role) in ('owner', 'admin')
        or au.permissions->'settings.manage' = 'true'::jsonb
        or au.permissions->'team.manage' = 'true'::jsonb
      )
  ) into v_allowed;
  if p_actor is null or not v_allowed then
    raise exception 'BRANCH_LIFECYCLE_ADMIN_REQUIRED';
  end if;
  if p_branch_id is null then raise exception 'BRANCH_ID_REQUIRED'; end if;
  if v_status not in ('ACTIVE','SUSPENDED','CLOSED','DRAFT') then
    raise exception 'INVALID_BRANCH_LIFECYCLE_STATUS';
  end if;
  if v_status in ('SUSPENDED','CLOSED') and v_reason is null then
    raise exception 'BRANCH_LIFECYCLE_REASON_REQUIRED';
  end if;

  select * into v_before from public.branches where id = p_branch_id for update;
  if not found then raise exception 'BRANCH_NOT_FOUND'; end if;
  if v_status = 'ACTIVE' and not public.branch_has_operational_subscription_v1718(p_branch_id) then
    raise exception 'BRANCH_ACTIVATION_SUBSCRIPTION_REQUIRED';
  end if;

  update public.branches b
  set public_status = v_status,
      is_active = (v_status = 'ACTIVE'),
      lifecycle_reason = case when v_status = 'ACTIVE' then null else v_reason end,
      status_changed_at = now(),
      status_changed_by = p_actor,
      suspended_at = case when v_status = 'SUSPENDED' then now() else b.suspended_at end,
      closed_at = case when v_status = 'CLOSED' then now() else b.closed_at end,
      reopened_at = case when v_status = 'ACTIVE' and (v_before.public_status is distinct from 'ACTIVE' or v_before.is_active is not true) then now() else b.reopened_at end,
      updated_at = now()
  where b.id = p_branch_id
  returning * into v_after;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, before_data, after_data, event_meta)
  values (
    p_actor,
    'BRANCH_LIFECYCLE_' || v_status || '_V177',
    'branch',
    p_branch_id::text,
    jsonb_build_object('public_status', v_before.public_status, 'is_active', v_before.is_active, 'lifecycle_reason', v_before.lifecycle_reason),
    jsonb_build_object('public_status', v_after.public_status, 'is_active', v_after.is_active, 'lifecycle_reason', v_after.lifecycle_reason),
    jsonb_build_object('gateway', 'branch-network-admin', 'version', 'V177', 'reason', v_reason, 'status_changed_at', v_after.status_changed_at)
  );

  return jsonb_build_object(
    'ok', true,
    'branch', jsonb_build_object(
      'id', v_after.id,
      'name', v_after.name,
      'public_status', v_after.public_status,
      'is_active', v_after.is_active,
      'lifecycle_reason', v_after.lifecycle_reason,
      'status_changed_at', v_after.status_changed_at
    )
  );
end;
$$;

create or replace function public.service_search_vehicle_registry_v177(
  p_actor uuid,
  p_query text default null,
  p_branch_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_q text := upper(regexp_replace(coalesce(p_query, ''), '[^A-Za-z0-9]', '', 'g'));
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 250));
  v_rows jsonb;
begin
  if p_actor is null or not (
    private.can_actor_manage_content_v174(p_actor)
    or private.can_actor_manage_operations(p_actor)
    or private.can_actor_manage_settings_v174(p_actor)
  ) then
    raise exception 'VEHICLE_REGISTRY_ADMIN_REQUIRED';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.updated_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      v.id,
      v.stock_code,
      v.brand,
      v.model,
      v.model_year,
      v.category,
      v.publication_status,
      v.branch_id,
      b.name as branch_name,
      vr.license_plate,
      vr.vin,
      vr.registration_reference,
      v.created_at,
      v.updated_at
    from public.vehicles v
    left join public.branches b on b.id = v.branch_id
    left join private.vehicle_registry vr on vr.vehicle_id = v.id
    where (p_branch_id is null or v.branch_id = p_branch_id)
      and (p_from is null or v.created_at >= p_from)
      and (p_to is null or v.created_at < p_to)
      and (
        v_q = ''
        or upper(regexp_replace(coalesce(vr.license_plate, ''), '[^A-Za-z0-9]', '', 'g')) like '%' || v_q || '%'
        or upper(regexp_replace(coalesce(vr.vin, ''), '[^A-Za-z0-9]', '', 'g')) like '%' || v_q || '%'
        or upper(regexp_replace(coalesce(vr.registration_reference, ''), '[^A-Za-z0-9]', '', 'g')) like '%' || v_q || '%'
        or upper(regexp_replace(coalesce(v.stock_code, ''), '[^A-Za-z0-9]', '', 'g')) like '%' || v_q || '%'
        or upper(regexp_replace(coalesce(v.brand, '') || coalesce(v.model, ''), '[^A-Za-z0-9]', '', 'g')) like '%' || v_q || '%'
      )
    order by v.updated_at desc
    limit v_limit
  ) r;

  return jsonb_build_object('ok', true, 'rows', v_rows);
end;
$$;

create or replace function public.service_upsert_vehicle_registry_v177(
  p_actor uuid,
  p_vehicle_id uuid,
  p_license_plate text default null,
  p_vin text default null,
  p_registration_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_plate text := nullif(upper(regexp_replace(coalesce(p_license_plate, ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_vin text := nullif(upper(regexp_replace(coalesce(p_vin, ''), '[^A-HJ-NPR-Z0-9]', '', 'g')), '');
  v_ref text := nullif(left(btrim(coalesce(p_registration_reference, '')), 80), '');
  v_before jsonb;
  v_after jsonb;
begin
  if p_actor is null or not (
    private.can_actor_manage_content_v174(p_actor)
    or private.can_actor_manage_operations(p_actor)
    or private.can_actor_manage_settings_v174(p_actor)
  ) then
    raise exception 'VEHICLE_REGISTRY_ADMIN_REQUIRED';
  end if;
  if p_vehicle_id is null or not exists (select 1 from public.vehicles where id = p_vehicle_id) then
    raise exception 'VEHICLE_NOT_FOUND';
  end if;
  if v_plate is not null and char_length(v_plate) not between 5 and 12 then
    raise exception 'INVALID_LICENSE_PLATE';
  end if;
  if v_vin is not null and char_length(v_vin) <> 17 then
    raise exception 'INVALID_VIN';
  end if;

  select jsonb_build_object('license_plate', license_plate, 'vin', vin, 'registration_reference', registration_reference)
  into v_before
  from private.vehicle_registry
  where vehicle_id = p_vehicle_id
  for update;

  if v_plate is null and v_vin is null and v_ref is null then
    delete from private.vehicle_registry where vehicle_id = p_vehicle_id;
    v_after := null;
  else
    insert into private.vehicle_registry(vehicle_id, license_plate, vin, registration_reference, updated_by)
    values (p_vehicle_id, v_plate, v_vin, v_ref, p_actor)
    on conflict (vehicle_id) do update
    set license_plate = excluded.license_plate,
        vin = excluded.vin,
        registration_reference = excluded.registration_reference,
        updated_at = now(),
        updated_by = p_actor;
    v_after := jsonb_build_object('license_plate', v_plate, 'vin', v_vin, 'registration_reference', v_ref);
  end if;

  insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, before_data, after_data, event_meta)
  values (
    p_actor,
    'VEHICLE_REGISTRY_UPDATE_V177',
    'vehicle',
    p_vehicle_id::text,
    v_before,
    v_after,
    jsonb_build_object('gateway', 'branch-network-admin', 'version', 'V177', 'plate_set', v_plate is not null, 'vin_set', v_vin is not null, 'registration_reference_set', v_ref is not null)
  );

  return jsonb_build_object('ok', true, 'vehicleId', p_vehicle_id, 'registry', v_after);
end;
$$;

revoke all on function public.service_set_branch_lifecycle_v177(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.service_search_vehicle_registry_v177(uuid,text,uuid,timestamptz,timestamptz,integer) from public, anon, authenticated;
revoke all on function public.service_upsert_vehicle_registry_v177(uuid,uuid,text,text,text) from public, anon, authenticated;

grant execute on function public.service_set_branch_lifecycle_v177(uuid,uuid,text,text) to service_role;
grant execute on function public.service_search_vehicle_registry_v177(uuid,text,uuid,timestamptz,timestamptz,integer) to service_role;
grant execute on function public.service_upsert_vehicle_registry_v177(uuid,uuid,text,text,text) to service_role;
