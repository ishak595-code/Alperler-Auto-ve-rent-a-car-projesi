-- V172 Vehicle Valuation & Acquisition Studio
-- Extends the existing secure partner-request pipeline into an auditable acquisition workflow.
-- Customer asking price is never treated as an Alperler valuation or offer.

alter table public.partner_requests
  add column if not exists fuel_type text,
  add column if not exists transmission text,
  add column if not exists body_type text,
  add column if not exists exterior_color text,
  add column if not exists province_code text references public.geo_provinces(code),
  add column if not exists district_code text references public.geo_districts(code),
  add column if not exists preferred_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists ownership_status text,
  add column if not exists damage_declaration text,
  add column if not exists expert_report_available boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists next_action_at timestamptz,
  add column if not exists last_contact_at timestamptz;

alter table public.partner_requests drop constraint if exists partner_requests_fuel_type_v172_check;
alter table public.partner_requests add constraint partner_requests_fuel_type_v172_check
  check (fuel_type is null or fuel_type in ('GASOLINE','DIESEL','HYBRID','ELECTRIC','LPG','OTHER'));
alter table public.partner_requests drop constraint if exists partner_requests_transmission_v172_check;
alter table public.partner_requests add constraint partner_requests_transmission_v172_check
  check (transmission is null or transmission in ('AUTOMATIC','MANUAL','SEMI_AUTOMATIC','OTHER'));
alter table public.partner_requests drop constraint if exists partner_requests_ownership_v172_check;
alter table public.partner_requests add constraint partner_requests_ownership_v172_check
  check (ownership_status is null or ownership_status in ('OWNER','AUTHORIZED_SELLER','COMPANY_VEHICLE','OTHER'));

create index if not exists partner_requests_geo_v172_idx on public.partner_requests(province_code,district_code,created_at desc);
create index if not exists partner_requests_preferred_branch_v172_idx on public.partner_requests(preferred_branch_id,created_at desc) where preferred_branch_id is not null;
create index if not exists partner_requests_assigned_to_v172_idx on public.partner_requests(assigned_to,status,updated_at desc) where assigned_to is not null;
create index if not exists partner_requests_next_action_v172_idx on public.partner_requests(next_action_at) where next_action_at is not null and status not in ('REJECTED','CLOSED');

create table if not exists private.partner_request_vehicle_identity (
  partner_request_id uuid primary key references public.partner_requests(id) on delete cascade,
  license_plate text,
  vin text,
  registration_reference text,
  ownership_confirmed boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint partner_request_identity_vin_v172_check check (vin is null or upper(btrim(vin)) ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  constraint partner_request_identity_plate_v172_check check (license_plate is null or char_length(regexp_replace(license_plate,'[^A-Za-z0-9]','','g')) between 5 and 12),
  constraint partner_request_identity_registration_v172_check check (registration_reference is null or char_length(btrim(registration_reference)) between 3 and 80)
);
alter table private.partner_request_vehicle_identity enable row level security;
revoke all on table private.partner_request_vehicle_identity from public,anon,authenticated;
create index if not exists partner_request_vehicle_identity_updated_by_v172_idx on private.partner_request_vehicle_identity(updated_by) where updated_by is not null;
create unique index if not exists partner_request_vehicle_identity_vin_v172_uidx on private.partner_request_vehicle_identity((upper(btrim(vin)))) where vin is not null;

create table if not exists public.partner_request_valuations (
  id uuid primary key default gen_random_uuid(),
  partner_request_id uuid not null references public.partner_requests(id) on delete cascade,
  version integer not null,
  valuation_status text not null default 'DRAFT' check (valuation_status in ('DRAFT','FINAL','VOID')),
  condition_grade text check (condition_grade is null or condition_grade in ('A','B','C','D','E')),
  market_low numeric(14,2) check (market_low is null or market_low >= 0),
  market_high numeric(14,2) check (market_high is null or market_high >= 0),
  offer_model text check (offer_model is null or offer_model in ('PURCHASE','MONTHLY_GUARANTEE','REVENUE_SHARE','DECLINE')),
  offer_amount numeric(14,2) check (offer_amount is null or offer_amount >= 0),
  revenue_share_percent numeric(5,2) check (revenue_share_percent is null or (revenue_share_percent >= 0 and revenue_share_percent <= 100)),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  inspection_required boolean not null default true,
  rationale text,
  valid_until timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique(partner_request_id,version),
  check (market_low is null or market_high is null or market_high >= market_low),
  check (valuation_status <> 'FINAL' or offer_model is not null),
  check (offer_model <> 'PURCHASE' or offer_amount is not null),
  check (offer_model <> 'MONTHLY_GUARANTEE' or offer_amount is not null),
  check (offer_model <> 'REVENUE_SHARE' or revenue_share_percent is not null)
);
alter table public.partner_request_valuations enable row level security;
create index if not exists partner_request_valuations_request_v172_idx on public.partner_request_valuations(partner_request_id,version desc);
create index if not exists partner_request_valuations_created_by_v172_idx on public.partner_request_valuations(created_by,created_at desc);
drop policy if exists partner_request_valuations_admin_all_v172 on public.partner_request_valuations;
create policy partner_request_valuations_admin_all_v172 on public.partner_request_valuations
for all to authenticated using (private.can_manage_operations()) with check (private.can_manage_operations());

create table if not exists public.partner_request_appointments (
  id uuid primary key default gen_random_uuid(),
  partner_request_id uuid not null references public.partner_requests(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  starts_at timestamptz not null,
  timezone text not null default 'Europe/Istanbul',
  appointment_type text not null default 'INSPECTION' check (appointment_type in ('INSPECTION','HANDOVER','CALL','OTHER')),
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED','CONFIRMED','COMPLETED','CANCELED','NO_SHOW')),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.partner_request_appointments enable row level security;
create index if not exists partner_request_appointments_request_v172_idx on public.partner_request_appointments(partner_request_id,starts_at desc);
create index if not exists partner_request_appointments_branch_v172_idx on public.partner_request_appointments(branch_id,starts_at) where branch_id is not null;
create index if not exists partner_request_appointments_created_by_v172_idx on public.partner_request_appointments(created_by,created_at desc);
create index if not exists partner_request_appointments_updated_by_v172_idx on public.partner_request_appointments(updated_by) where updated_by is not null;
drop policy if exists partner_request_appointments_admin_all_v172 on public.partner_request_appointments;
create policy partner_request_appointments_admin_all_v172 on public.partner_request_appointments
for all to authenticated using (private.can_manage_operations()) with check (private.can_manage_operations());

create or replace function public.enforce_partner_request_offer_integrity_v172()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
begin
  if new.status is distinct from old.status and new.status in ('OFFERED','ACCEPTED') then
    if not exists (
      select 1 from public.partner_request_valuations v
      where v.partner_request_id=new.id and v.valuation_status='FINAL'
        and v.offer_model is not null and v.offer_model<>'DECLINE'
    ) then
      raise exception using errcode='23514',message='PARTNER_FINAL_VALUATION_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists partner_request_offer_integrity_v172 on public.partner_requests;
create trigger partner_request_offer_integrity_v172
before update of status on public.partner_requests
for each row execute function public.enforce_partner_request_offer_integrity_v172();
revoke all on function public.enforce_partner_request_offer_integrity_v172() from public,anon,authenticated;

create or replace function public.service_upsert_partner_request_identity_v172(
  p_reference text,
  p_actor uuid,
  p_license_plate text default null,
  p_vin text default null,
  p_registration_reference text default null,
  p_ownership_confirmed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  req public.partner_requests%rowtype;
  plate text:=nullif(upper(regexp_replace(coalesce(p_license_plate,''),'[^A-Za-z0-9]','','g')),'');
  vin_value text:=nullif(upper(regexp_replace(coalesce(p_vin,''),'[^A-HJ-NPR-Z0-9]','','g')),'');
  reg_ref text:=nullif(left(btrim(coalesce(p_registration_reference,'')),80),'');
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
  select * into req from public.partner_requests where reference=p_reference;
  if not found then raise exception using errcode='P0002',message='PARTNER_REQUEST_NOT_FOUND'; end if;
  if plate is not null and char_length(plate) not between 5 and 12 then raise exception using errcode='23514',message='INVALID_LICENSE_PLATE'; end if;
  if vin_value is not null and char_length(vin_value)<>17 then raise exception using errcode='23514',message='INVALID_VIN'; end if;
  insert into private.partner_request_vehicle_identity(partner_request_id,license_plate,vin,registration_reference,ownership_confirmed,updated_by)
  values(req.id,plate,vin_value,reg_ref,coalesce(p_ownership_confirmed,false),p_actor)
  on conflict(partner_request_id) do update set license_plate=excluded.license_plate,vin=excluded.vin,registration_reference=excluded.registration_reference,ownership_confirmed=excluded.ownership_confirmed,updated_at=now(),updated_by=p_actor;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,event_meta)
  values(p_actor,'PARTNER_VEHICLE_IDENTITY_UPDATED','partner_request',req.reference,jsonb_build_object('plate_set',plate is not null,'vin_set',vin_value is not null,'registration_reference_set',reg_ref is not null,'ownership_confirmed',coalesce(p_ownership_confirmed,false)));
  return jsonb_build_object('ok',true,'reference',req.reference,'licensePlate',plate,'vin',vin_value,'registrationReference',reg_ref,'ownershipConfirmed',coalesce(p_ownership_confirmed,false));
end;
$$;
revoke all on function public.service_upsert_partner_request_identity_v172(text,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.service_upsert_partner_request_identity_v172(text,uuid,text,text,text,boolean) to service_role;

create or replace function public.service_record_partner_valuation_v172(
  p_reference text,
  p_actor uuid,
  p_valuation_status text,
  p_condition_grade text default null,
  p_market_low numeric default null,
  p_market_high numeric default null,
  p_offer_model text default null,
  p_offer_amount numeric default null,
  p_revenue_share_percent numeric default null,
  p_currency text default 'TRY',
  p_inspection_required boolean default true,
  p_rationale text default null,
  p_valid_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  req public.partner_requests%rowtype;
  v_status text:=upper(coalesce(btrim(p_valuation_status),'DRAFT'));
  v_offer text:=upper(nullif(btrim(coalesce(p_offer_model,'')),''));
  v_grade text:=upper(nullif(btrim(coalesce(p_condition_grade,'')),''));
  v_currency text:=upper(coalesce(nullif(btrim(p_currency),''),'TRY'));
  v_version integer;
  saved public.partner_request_valuations%rowtype;
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
  if v_status not in ('DRAFT','FINAL') then raise exception using errcode='22023',message='INVALID_VALUATION_STATUS'; end if;
  if v_grade is not null and v_grade not in ('A','B','C','D','E') then raise exception using errcode='22023',message='INVALID_CONDITION_GRADE'; end if;
  if v_offer is not null and v_offer not in ('PURCHASE','MONTHLY_GUARANTEE','REVENUE_SHARE','DECLINE') then raise exception using errcode='22023',message='INVALID_OFFER_MODEL'; end if;
  select * into req from public.partner_requests where reference=p_reference for update;
  if not found then raise exception using errcode='P0002',message='PARTNER_REQUEST_NOT_FOUND'; end if;
  if req.status='UPLOADING' then raise exception using errcode='23514',message='PARTNER_UPLOAD_NOT_FINALIZED'; end if;
  select coalesce(max(version),0)+1 into v_version from public.partner_request_valuations where partner_request_id=req.id;
  insert into public.partner_request_valuations(partner_request_id,version,valuation_status,condition_grade,market_low,market_high,offer_model,offer_amount,revenue_share_percent,currency,inspection_required,rationale,valid_until,created_by,finalized_at)
  values(req.id,v_version,v_status,v_grade,p_market_low,p_market_high,v_offer,p_offer_amount,p_revenue_share_percent,v_currency,coalesce(p_inspection_required,true),nullif(left(btrim(coalesce(p_rationale,'')),4000),''),p_valid_until,p_actor,case when v_status='FINAL' then now() else null end)
  returning * into saved;
  if v_status='FINAL' then
    update public.partner_requests set status=case when v_offer='DECLINE' then 'REJECTED' else 'OFFERED' end,updated_at=now() where id=req.id;
  elsif req.status='NEW' then
    update public.partner_requests set status='REVIEWING',updated_at=now() where id=req.id;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,event_meta)
  values(p_actor,case when v_status='FINAL' then 'PARTNER_VALUATION_FINALIZED' else 'PARTNER_VALUATION_DRAFTED' end,'partner_request',req.reference,jsonb_build_object('valuation_id',saved.id,'version',saved.version,'offer_model',saved.offer_model,'offer_amount',saved.offer_amount,'market_low',saved.market_low,'market_high',saved.market_high,'valid_until',saved.valid_until));
  return jsonb_build_object('ok',true,'id',saved.id,'reference',req.reference,'version',saved.version,'valuationStatus',saved.valuation_status,'offerModel',saved.offer_model,'offerAmount',saved.offer_amount,'revenueSharePercent',saved.revenue_share_percent,'currency',saved.currency,'validUntil',saved.valid_until);
end;
$$;
revoke all on function public.service_record_partner_valuation_v172(text,uuid,text,text,numeric,numeric,text,numeric,numeric,text,boolean,text,timestamptz) from public,anon,authenticated;
grant execute on function public.service_record_partner_valuation_v172(text,uuid,text,text,numeric,numeric,text,numeric,numeric,text,boolean,text,timestamptz) to service_role;

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
set search_path=public,private,pg_catalog
as $$
declare req public.partner_requests%rowtype;saved public.partner_request_appointments%rowtype;v_type text:=upper(coalesce(btrim(p_appointment_type),'INSPECTION'));v_timezone text:=coalesce(nullif(btrim(p_timezone),''),'Europe/Istanbul');
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
  if p_starts_at is null or p_starts_at<=now()-interval '1 hour' then raise exception using errcode='22023',message='INVALID_APPOINTMENT_TIME'; end if;
  if v_type not in ('INSPECTION','HANDOVER','CALL','OTHER') then raise exception using errcode='22023',message='INVALID_APPOINTMENT_TYPE'; end if;
  select * into req from public.partner_requests where reference=p_reference for update;
  if not found then raise exception using errcode='P0002',message='PARTNER_REQUEST_NOT_FOUND'; end if;
  if p_branch_id is not null and not exists(select 1 from public.branches b where b.id=p_branch_id) then raise exception using errcode='23503',message='BRANCH_NOT_FOUND'; end if;
  insert into public.partner_request_appointments(partner_request_id,branch_id,starts_at,timezone,appointment_type,status,notes,created_by,updated_by)
  values(req.id,p_branch_id,p_starts_at,v_timezone,v_type,'SCHEDULED',nullif(left(btrim(coalesce(p_notes,'')),2000),''),p_actor,p_actor)
  returning * into saved;
  update public.partner_requests set next_action_at=p_starts_at,status=case when status='NEW' then 'CONTACTED' else status end,updated_at=now() where id=req.id;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,event_meta)
  values(p_actor,'PARTNER_APPOINTMENT_SCHEDULED','partner_request',req.reference,jsonb_build_object('appointment_id',saved.id,'branch_id',saved.branch_id,'starts_at',saved.starts_at,'timezone',saved.timezone,'appointment_type',saved.appointment_type));
  return jsonb_build_object('ok',true,'id',saved.id,'reference',req.reference,'startsAt',saved.starts_at,'timezone',saved.timezone,'appointmentType',saved.appointment_type,'status',saved.status);
end;
$$;
revoke all on function public.service_schedule_partner_appointment_v172(text,uuid,uuid,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.service_schedule_partner_appointment_v172(text,uuid,uuid,timestamptz,text,text,text) to service_role;

create or replace function public.service_partner_request_admin_snapshot_v172(p_actor uuid,p_limit integer default 500)
returns table(payload jsonb)
language plpgsql
stable
security definer
set search_path=public,private,pg_catalog
as $$
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_REQUIRED'; end if;
  return query
  select jsonb_build_object(
    'request',to_jsonb(r),
    'identity',case when i.partner_request_id is null then null else jsonb_build_object('license_plate',i.license_plate,'vin',i.vin,'registration_reference',i.registration_reference,'ownership_confirmed',i.ownership_confirmed,'updated_at',i.updated_at) end,
    'latestValuation',(select to_jsonb(v) from public.partner_request_valuations v where v.partner_request_id=r.id and v.valuation_status<>'VOID' order by v.version desc limit 1),
    'latestAppointment',(select to_jsonb(a) from public.partner_request_appointments a where a.partner_request_id=r.id order by a.created_at desc limit 1)
  )
  from public.partner_requests r
  left join private.partner_request_vehicle_identity i on i.partner_request_id=r.id
  order by r.created_at desc
  limit greatest(1,least(coalesce(p_limit,500),1000));
end;
$$;
revoke all on function public.service_partner_request_admin_snapshot_v172(uuid,integer) from public,anon,authenticated;
grant execute on function public.service_partner_request_admin_snapshot_v172(uuid,integer) to service_role;

comment on table private.partner_request_vehicle_identity is 'V172 private identity data for valuation leads. Never exposed to customer/public catalog paths.';
comment on table public.partner_request_valuations is 'V172 versioned market assessment and official offer records. Asking price remains separate customer input.';
comment on table public.partner_request_appointments is 'V172 inspection/handover/call appointments for vehicle acquisition workflow.';