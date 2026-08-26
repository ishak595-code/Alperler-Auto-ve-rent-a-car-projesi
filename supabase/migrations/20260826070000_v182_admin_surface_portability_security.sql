begin;

-- V182: close remaining direct-browser privileged admin data paths for
-- assignment management and payment settings. Finance/marketing are already
-- protected Edge functions and are moved to the same-origin BFF in application
-- code; these PostgreSQL RPCs cover the admin table paths that still need a
-- trusted service boundary.

create or replace function public.service_assignment_snapshot_v182(
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_branches jsonb;
  v_vehicles jsonb;
  v_tours jsonb;
begin
  if p_actor is null or not private.can_actor_manage_team_v178(p_actor) then
    raise exception using errcode='42501', message='TEAM_PERMISSION_REQUIRED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'staff_id',a.staff_id,
    'branch_id',a.branch_id,
    'is_primary',a.is_primary,
    'created_at',a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_branches
  from public.staff_branch_assignments a;

  select coalesce(jsonb_agg(jsonb_build_object(
    'vehicle_id',a.vehicle_id,
    'staff_id',a.staff_id,
    'responsibility',a.responsibility,
    'created_at',a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_vehicles
  from public.vehicle_staff_assignments a;

  select coalesce(jsonb_agg(jsonb_build_object(
    'tour_id',a.tour_id,
    'staff_id',a.staff_id,
    'responsibility',a.responsibility,
    'created_at',a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_tours
  from public.tour_staff_assignments a;

  return jsonb_build_object('branches',v_branches,'vehicles',v_vehicles,'tours',v_tours);
end;
$$;

create or replace function public.service_unassign_staff_vehicle_v182(
  p_actor uuid,
  p_vehicle_id uuid,
  p_staff_id uuid,
  p_responsibility text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_responsibility text:=upper(left(btrim(coalesce(p_responsibility,'')),32));
  v_count integer:=0;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_team_v178(p_actor) then
    raise exception using errcode='42501', message='TEAM_PERMISSION_REQUIRED';
  end if;
  if p_vehicle_id is null or p_staff_id is null or v_responsibility='' then
    raise exception using errcode='22023', message='INVALID_ASSIGNMENT';
  end if;

  delete from public.vehicle_staff_assignments
  where vehicle_id=p_vehicle_id
    and staff_id=p_staff_id
    and upper(coalesce(responsibility,''))=v_responsibility;
  get diagnostics v_count = row_count;

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,event_meta)
  values(
    p_actor,v_actor_email,'staff_vehicle_assignment_removed_v182','vehicle',p_vehicle_id::text,
    jsonb_build_object('staffId',p_staff_id,'responsibility',v_responsibility,'removed',v_count)
  );

  return jsonb_build_object('ok',true,'removed',v_count);
end;
$$;

create or replace function public.service_unassign_staff_tour_v182(
  p_actor uuid,
  p_tour_id uuid,
  p_staff_id uuid,
  p_responsibility text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_responsibility text:=upper(left(btrim(coalesce(p_responsibility,'')),32));
  v_count integer:=0;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_team_v178(p_actor) then
    raise exception using errcode='42501', message='TEAM_PERMISSION_REQUIRED';
  end if;
  if p_tour_id is null or p_staff_id is null or v_responsibility='' then
    raise exception using errcode='22023', message='INVALID_ASSIGNMENT';
  end if;

  delete from public.tour_staff_assignments
  where tour_id=p_tour_id
    and staff_id=p_staff_id
    and upper(coalesce(responsibility,''))=v_responsibility;
  get diagnostics v_count = row_count;

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,event_meta)
  values(
    p_actor,v_actor_email,'staff_tour_assignment_removed_v182','tour',p_tour_id::text,
    jsonb_build_object('staffId',p_staff_id,'responsibility',v_responsibility,'removed',v_count)
  );

  return jsonb_build_object('ok',true,'removed',v_count);
end;
$$;

create or replace function public.service_payment_settings_snapshot_v182(
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_result jsonb;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception using errcode='42501', message='SETTINGS_PERMISSION_REQUIRED';
  end if;

  select to_jsonb(p) into v_result
  from public.payment_settings p
  where p.config_key='main'
  limit 1;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.service_save_payment_settings_v182(
  p_actor uuid,
  p_provider text,
  p_card_enabled boolean,
  p_eft_enabled boolean,
  p_office_enabled boolean,
  p_deposit_mode text,
  p_deposit_value numeric,
  p_currency text,
  p_bank_name text,
  p_iban text,
  p_account_holder text,
  p_customer_note text,
  p_test_mode boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_provider text:=upper(btrim(coalesce(p_provider,'')));
  v_deposit_mode text:=upper(btrim(coalesce(p_deposit_mode,'')));
  v_currency text:=upper(btrim(coalesce(p_currency,'')));
  v_before jsonb;
  v_after jsonb;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception using errcode='42501', message='SETTINGS_PERMISSION_REQUIRED';
  end if;
  if v_provider not in ('PAYTR','GENERIC_HOSTED','NONE') then
    raise exception using errcode='22023', message='INVALID_PAYMENT_PROVIDER';
  end if;
  if v_deposit_mode not in ('NONE','FIXED','PERCENT') then
    raise exception using errcode='22023', message='INVALID_DEPOSIT_MODE';
  end if;
  if coalesce(p_deposit_value,0)<0 or (v_deposit_mode='PERCENT' and coalesce(p_deposit_value,0)>100) then
    raise exception using errcode='22023', message='INVALID_DEPOSIT_VALUE';
  end if;
  if v_currency not in ('TRY','EUR','USD','CHF') then
    raise exception using errcode='22023', message='INVALID_PAYMENT_CURRENCY';
  end if;

  select jsonb_build_object(
    'provider',provider,
    'card_enabled',card_enabled,
    'eft_enabled',eft_enabled,
    'office_enabled',office_enabled,
    'deposit_mode',deposit_mode,
    'deposit_value',deposit_value,
    'currency',currency,
    'test_mode',test_mode
  ) into v_before
  from public.payment_settings where config_key='main';

  insert into public.payment_settings(
    config_key,provider,card_enabled,eft_enabled,office_enabled,deposit_mode,deposit_value,currency,
    bank_name,iban,account_holder,customer_note,test_mode,updated_by,updated_at
  ) values(
    'main',v_provider,coalesce(p_card_enabled,false),coalesce(p_eft_enabled,true),coalesce(p_office_enabled,true),
    v_deposit_mode,coalesce(p_deposit_value,0),v_currency,
    left(nullif(btrim(coalesce(p_bank_name,'')),''),160),
    left(nullif(upper(regexp_replace(coalesce(p_iban,''),'\s+','','g')),''),80),
    left(nullif(btrim(coalesce(p_account_holder,'')),''),180),
    left(nullif(btrim(coalesce(p_customer_note,'')),''),1000),
    coalesce(p_test_mode,true),p_actor,now()
  )
  on conflict (config_key) do update set
    provider=excluded.provider,
    card_enabled=excluded.card_enabled,
    eft_enabled=excluded.eft_enabled,
    office_enabled=excluded.office_enabled,
    deposit_mode=excluded.deposit_mode,
    deposit_value=excluded.deposit_value,
    currency=excluded.currency,
    bank_name=excluded.bank_name,
    iban=excluded.iban,
    account_holder=excluded.account_holder,
    customer_note=excluded.customer_note,
    test_mode=excluded.test_mode,
    updated_by=excluded.updated_by,
    updated_at=excluded.updated_at;

  select to_jsonb(p) into v_after
  from public.payment_settings p where p.config_key='main';

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(
    p_actor,v_actor_email,'payment_settings_updated_v182','payment_settings','main',
    coalesce(v_before,'{}'::jsonb),
    jsonb_build_object(
      'provider',v_after->'provider',
      'card_enabled',v_after->'card_enabled',
      'eft_enabled',v_after->'eft_enabled',
      'office_enabled',v_after->'office_enabled',
      'deposit_mode',v_after->'deposit_mode',
      'deposit_value',v_after->'deposit_value',
      'currency',v_after->'currency',
      'test_mode',v_after->'test_mode'
    ),
    jsonb_build_object('gateway','admin-core-v182')
  );

  return v_after;
end;
$$;

revoke all on function public.service_assignment_snapshot_v182(uuid) from public, anon, authenticated;
revoke all on function public.service_unassign_staff_vehicle_v182(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.service_unassign_staff_tour_v182(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.service_payment_settings_snapshot_v182(uuid) from public, anon, authenticated;
revoke all on function public.service_save_payment_settings_v182(uuid,text,boolean,boolean,boolean,text,numeric,text,text,text,text,text,boolean) from public, anon, authenticated;

grant execute on function public.service_assignment_snapshot_v182(uuid) to service_role;
grant execute on function public.service_unassign_staff_vehicle_v182(uuid,uuid,uuid,text) to service_role;
grant execute on function public.service_unassign_staff_tour_v182(uuid,uuid,uuid,text) to service_role;
grant execute on function public.service_payment_settings_snapshot_v182(uuid) to service_role;
grant execute on function public.service_save_payment_settings_v182(uuid,text,boolean,boolean,boolean,text,numeric,text,text,text,text,text,boolean) to service_role;

commit;
