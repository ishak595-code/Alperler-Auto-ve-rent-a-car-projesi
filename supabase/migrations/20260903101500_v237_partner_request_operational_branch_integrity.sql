create or replace function public.enforce_partner_request_preferred_branch_v237()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.preferred_branch_id is not null
     and not exists (
       select 1
       from public.branches b
       where b.id = new.preferred_branch_id
         and b.is_active = true
         and b.public_status = 'ACTIVE'
     ) then
    raise exception using errcode='23514', message='PREFERRED_BRANCH_NOT_OPERATIONAL';
  end if;
  return new;
end;
$$;

drop trigger if exists partner_requests_preferred_branch_v237 on public.partner_requests;
create trigger partner_requests_preferred_branch_v237
before insert or update of preferred_branch_id on public.partner_requests
for each row execute function public.enforce_partner_request_preferred_branch_v237();

create or replace function public.service_schedule_partner_appointment_v172(
  p_reference text,
  p_actor uuid,
  p_branch_id uuid,
  p_starts_at timestamptz,
  p_timezone text default 'Europe/Istanbul',
  p_appointment_type text default 'INSPECTION',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.partner_requests%rowtype;
  saved public.partner_request_appointments%rowtype;
  v_type text := upper(coalesce(btrim(p_appointment_type),'INSPECTION'));
  v_timezone text := coalesce(nullif(btrim(p_timezone),''),'Europe/Istanbul');
begin
  if not private.can_actor_manage_operations(p_actor) then
    raise exception using errcode='42501', message='ADMIN_REQUIRED';
  end if;
  if p_starts_at is null or p_starts_at <= now() - interval '1 hour' then
    raise exception using errcode='22023', message='INVALID_APPOINTMENT_TIME';
  end if;
  if v_type not in ('INSPECTION','HANDOVER','CALL','OTHER') then
    raise exception using errcode='22023', message='INVALID_APPOINTMENT_TYPE';
  end if;

  select * into req
  from public.partner_requests
  where reference = p_reference
  for update;
  if not found then
    raise exception using errcode='P0002', message='PARTNER_REQUEST_NOT_FOUND';
  end if;

  if p_branch_id is not null and not exists (
    select 1
    from public.branches b
    where b.id = p_branch_id
      and b.is_active = true
      and b.public_status = 'ACTIVE'
  ) then
    raise exception using errcode='23514', message='APPOINTMENT_BRANCH_NOT_OPERATIONAL';
  end if;

  insert into public.partner_request_appointments(
    partner_request_id,branch_id,starts_at,timezone,appointment_type,status,notes,created_by,updated_by
  ) values (
    req.id,p_branch_id,p_starts_at,v_timezone,v_type,'SCHEDULED',
    nullif(left(btrim(coalesce(p_notes,'')),2000),''),p_actor,p_actor
  ) returning * into saved;

  update public.partner_requests
  set next_action_at = p_starts_at,
      status = case when status='NEW' then 'CONTACTED' else status end,
      updated_at = now()
  where id = req.id;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,event_meta)
  values(
    p_actor,'PARTNER_APPOINTMENT_SCHEDULED','partner_request',req.reference,
    jsonb_build_object(
      'appointment_id',saved.id,
      'branch_id',saved.branch_id,
      'starts_at',saved.starts_at,
      'timezone',saved.timezone,
      'appointment_type',saved.appointment_type
    )
  );

  return jsonb_build_object(
    'ok',true,
    'id',saved.id,
    'reference',req.reference,
    'startsAt',saved.starts_at,
    'timezone',saved.timezone,
    'appointmentType',saved.appointment_type,
    'status',saved.status
  );
end;
$$;

comment on function public.enforce_partner_request_preferred_branch_v237() is
  'Rejects customer vehicle-valuation preferred branches unless the selected branch is currently public and operational.';
comment on function public.service_schedule_partner_appointment_v172(text,uuid,uuid,timestamptz,text,text,text) is
  'Schedules partner appointments only at currently operational public branches, while retaining admin authorization and audit logging.';
