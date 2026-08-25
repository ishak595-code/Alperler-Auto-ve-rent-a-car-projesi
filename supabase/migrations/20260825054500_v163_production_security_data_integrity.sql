-- V163 production security + data-integrity hardening.
-- Keeps branch-local time explicit, makes rental checkout race-safe, binds admin
-- authorization to auth.users UUIDs, tightens customer-document metadata, and
-- adds correlation fields for production auditability.

create extension if not exists btree_gist;

create schema if not exists private;

create or replace function private.is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(p_timezone, '') <> ''
    and exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = p_timezone
    );
$$;

revoke all on function private.is_valid_timezone(text) from public, anon, authenticated;

alter table public.branches
  add column if not exists timezone text;

update public.branches
set timezone = case
  when lower(coalesce(country, '')) in ('türkiye', 'turkiye', 'turkey') then 'Europe/Istanbul'
  when lower(coalesce(country, '')) in ('switzerland', 'schweiz', 'suisse', 'svizzera', 'isviçre', 'isvicre') then 'Europe/Zurich'
  else 'UTC'
end
where timezone is null or btrim(timezone) = '';

alter table public.branches
  alter column timezone set default 'Europe/Istanbul',
  alter column timezone set not null;

alter table public.branches drop constraint if exists branches_timezone_valid_chk;
alter table public.branches
  add constraint branches_timezone_valid_chk
  check (private.is_valid_timezone(timezone));

comment on column public.branches.timezone is
  'IANA timezone used to interpret branch-local rental and operating times.';

create table if not exists public.booking_holds (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  pickup_branch_id uuid references public.branches(id) on delete set null,
  customer_user_id uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'ACTIVE',
  booking_id uuid references public.bookings(id) on delete set null,
  client_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_holds_time_chk check (end_at > start_at),
  constraint booking_holds_expiry_chk check (expires_at > created_at),
  constraint booking_holds_status_chk check (status in ('ACTIVE','CONVERTED','EXPIRED','RELEASED')),
  constraint booking_holds_idempotency_key_chk check (char_length(idempotency_key) between 8 and 120),
  constraint booking_holds_client_hash_chk check (client_hash is null or char_length(client_hash) <= 128),
  constraint booking_holds_idempotency_unique unique (idempotency_key)
);

create index if not exists booking_holds_vehicle_status_expiry_idx
  on public.booking_holds(vehicle_id, status, expires_at);
create index if not exists booking_holds_customer_created_idx
  on public.booking_holds(customer_user_id, created_at desc)
  where customer_user_id is not null;
create index if not exists booking_holds_booking_idx
  on public.booking_holds(booking_id)
  where booking_id is not null;

alter table public.booking_holds drop constraint if exists booking_holds_no_active_overlap;
alter table public.booking_holds
  add constraint booking_holds_no_active_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status = 'ACTIVE');

alter table public.booking_holds enable row level security;
revoke all on table public.booking_holds from public, anon;
revoke insert, update, delete on table public.booking_holds from authenticated;
grant select on table public.booking_holds to authenticated;

drop policy if exists booking_holds_operations_read on public.booking_holds;
create policy booking_holds_operations_read
on public.booking_holds
for select
to authenticated
using ((select private.can_manage_operations()));

create or replace function private.expire_vehicle_holds(p_vehicle_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_count integer;
begin
  update public.booking_holds
  set status = 'EXPIRED', updated_at = now()
  where vehicle_id = p_vehicle_id
    and status = 'ACTIVE'
    and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.expire_vehicle_holds(uuid) from public, anon, authenticated;

create or replace function public.reserve_rental_hold(
  p_vehicle_identifier text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_idempotency_key text,
  p_customer_user_id uuid default null,
  p_client_hash text default null
)
returns table (
  hold_id uuid,
  vehicle_id uuid,
  expires_at timestamptz,
  branch_timezone text
)
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_hold public.booking_holds%rowtype;
  v_timezone text := 'Europe/Istanbul';
  v_idempotency text := btrim(coalesce(p_idempotency_key, ''));
begin
  if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_DATES';
  end if;
  if p_start_at < now() - interval '5 minutes' or p_end_at > now() + interval '3660 days' then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_DATES';
  end if;
  if char_length(v_idempotency) < 8 or char_length(v_idempotency) > 120 then
    raise exception using errcode = '22023', message = 'INVALID_IDEMPOTENCY_KEY';
  end if;

  select v.* into v_vehicle
  from public.vehicles v
  where v.category = 'RENTAL'
    and v.is_active = true
    and v.publication_status = 'PUBLISHED'
    and coalesce(v.availability_status, 'AVAILABLE') not in ('MAINTENANCE','SOLD','UNAVAILABLE','ARCHIVED')
    and (v.id::text = btrim(coalesce(p_vehicle_identifier, '')) or v.stock_code = btrim(coalesce(p_vehicle_identifier, '')))
  order by case when v.id::text = btrim(coalesce(p_vehicle_identifier, '')) then 0 else 1 end
  limit 1;

  if v_vehicle.id is null then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_VEHICLE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_vehicle.id::text, 163));
  perform private.expire_vehicle_holds(v_vehicle.id);

  select h.* into v_hold
  from public.booking_holds h
  where h.idempotency_key = v_idempotency
  limit 1;

  if v_hold.id is not null then
    if v_hold.vehicle_id <> v_vehicle.id or v_hold.start_at <> p_start_at or v_hold.end_at <> p_end_at then
      raise exception using errcode = '23505', message = 'HOLD_IDEMPOTENCY_CONFLICT';
    end if;
    if v_hold.status = 'CONVERTED' then
      raise exception using errcode = '23505', message = 'HOLD_ALREADY_CONVERTED';
    end if;
    update public.booking_holds
    set status = 'ACTIVE',
        expires_at = now() + interval '10 minutes',
        customer_user_id = coalesce(p_customer_user_id, customer_user_id),
        client_hash = left(coalesce(p_client_hash, client_hash), 128),
        updated_at = now()
    where id = v_hold.id
    returning * into v_hold;
  else
    if exists (
      select 1
      from public.bookings b
      where b.vehicle_id = v_vehicle.id
        and b.booking_type = 'RENTAL'
        and b.status = 'APPROVED'
        and b.deleted_at is null
        and b.start_at < p_end_at
        and b.end_at > p_start_at
    ) then
      raise exception using errcode = '23P01', message = 'VEHICLE_UNAVAILABLE';
    end if;

    if exists (
      select 1
      from public.booking_holds h
      where h.vehicle_id = v_vehicle.id
        and h.status = 'ACTIVE'
        and h.expires_at > now()
        and h.start_at < p_end_at
        and h.end_at > p_start_at
    ) then
      raise exception using errcode = '23P01', message = 'VEHICLE_TEMPORARILY_HELD';
    end if;

    begin
      insert into public.booking_holds (
        vehicle_id, pickup_branch_id, customer_user_id, idempotency_key,
        start_at, end_at, expires_at, status, client_hash
      ) values (
        v_vehicle.id, v_vehicle.branch_id, p_customer_user_id, v_idempotency,
        p_start_at, p_end_at, now() + interval '10 minutes', 'ACTIVE', left(p_client_hash, 128)
      )
      returning * into v_hold;
    exception
      when exclusion_violation then
        raise exception using errcode = '23P01', message = 'VEHICLE_TEMPORARILY_HELD';
    end;
  end if;

  if v_vehicle.branch_id is not null then
    select b.timezone into v_timezone
    from public.branches b
    where b.id = v_vehicle.branch_id;
  end if;

  return query select v_hold.id, v_vehicle.id, v_hold.expires_at, coalesce(v_timezone, 'Europe/Istanbul');
end;
$$;

revoke all on function public.reserve_rental_hold(text,timestamptz,timestamptz,text,uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_rental_hold(text,timestamptz,timestamptz,text,uuid,text) to service_role;

create or replace function public.release_rental_hold(
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_updated integer;
begin
  update public.booking_holds
  set status = 'RELEASED', updated_at = now()
  where idempotency_key = btrim(coalesce(p_idempotency_key, ''))
    and status = 'ACTIVE';
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.release_rental_hold(text) from public, anon, authenticated;
grant execute on function public.release_rental_hold(text) to service_role;

create or replace function private.booking_insert_hold_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
begin
  if new.booking_type <> 'RENTAL' or new.vehicle_id is null or new.start_at is null or new.end_at is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.vehicle_id::text, 163));
  perform private.expire_vehicle_holds(new.vehicle_id);

  if exists (
    select 1
    from public.booking_holds h
    where h.vehicle_id = new.vehicle_id
      and h.status = 'ACTIVE'
      and h.expires_at > now()
      and h.start_at < new.end_at
      and h.end_at > new.start_at
      and h.idempotency_key <> new.idempotency_key
  ) then
    raise exception using errcode = '23P01', message = 'VEHICLE_TEMPORARILY_HELD';
  end if;
  return new;
end;
$$;

revoke all on function private.booking_insert_hold_guard() from public, anon, authenticated;

drop trigger if exists bookings_hold_guard_before_insert on public.bookings;
create trigger bookings_hold_guard_before_insert
before insert on public.bookings
for each row execute function private.booking_insert_hold_guard();

create or replace function private.booking_convert_matching_hold()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.booking_type = 'RENTAL' and new.idempotency_key is not null then
    update public.booking_holds
    set status = 'CONVERTED', booking_id = new.id, updated_at = now()
    where idempotency_key = new.idempotency_key
      and status = 'ACTIVE';
  end if;
  return new;
end;
$$;

revoke all on function private.booking_convert_matching_hold() from public, anon, authenticated;

drop trigger if exists bookings_hold_convert_after_insert on public.bookings;
create trigger bookings_hold_convert_after_insert
after insert on public.bookings
for each row execute function private.booking_convert_matching_hold();

create or replace function private.sync_admin_user_identity()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_email text;
begin
  select lower(u.email) into v_email
  from auth.users u
  where u.id = new.user_id;
  if v_email is null then
    raise exception using errcode = '23503', message = 'ADMIN_AUTH_USER_REQUIRED';
  end if;
  new.email := v_email;
  return new;
end;
$$;

revoke all on function private.sync_admin_user_identity() from public, anon, authenticated;

drop trigger if exists admin_users_sync_auth_identity on public.admin_users;
create trigger admin_users_sync_auth_identity
before insert or update of user_id, email on public.admin_users
for each row execute function private.sync_admin_user_identity();

update public.admin_users a
set email = lower(u.email)
from auth.users u
where a.user_id = u.id
  and lower(coalesce(a.email::text, '')) is distinct from lower(coalesce(u.email, ''));

alter table public.customer_documents drop constraint if exists customer_documents_mime_type_v163_chk;
alter table public.customer_documents
  add constraint customer_documents_mime_type_v163_chk
  check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf'));

alter table public.customer_documents drop constraint if exists customer_documents_file_size_v163_chk;
alter table public.customer_documents
  add constraint customer_documents_file_size_v163_chk
  check (file_size > 0 and file_size <= 10485760);

alter table public.customer_documents drop constraint if exists customer_documents_storage_path_v163_chk;
alter table public.customer_documents
  add constraint customer_documents_storage_path_v163_chk
  check (storage_path ~ ('^' || user_id::text || '/[0-9a-fA-F-]{36}\\.(jpg|png|webp|pdf)$'));

alter table public.audit_logs add column if not exists request_id text;
alter table public.audit_logs add column if not exists event_meta jsonb not null default '{}'::jsonb;
create index if not exists audit_logs_request_id_idx on public.audit_logs(request_id) where request_id is not null;
create index if not exists audit_logs_created_at_desc_idx on public.audit_logs(created_at desc);

alter table public.system_events add column if not exists request_id text;
create index if not exists system_events_request_id_idx on public.system_events(request_id) where request_id is not null;
create index if not exists system_events_last_seen_desc_idx on public.system_events(last_seen desc);

comment on table public.booking_holds is
  'Short-lived checkout holds preventing race conditions before a rental booking is persisted.';
comment on column public.audit_logs.request_id is
  'Correlation identifier propagated by production request boundaries.';
