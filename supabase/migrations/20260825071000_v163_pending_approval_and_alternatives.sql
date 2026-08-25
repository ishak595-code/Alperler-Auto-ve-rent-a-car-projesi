-- V163 correction and completion.
-- Business rule: PENDING rental requests never block inventory. Only APPROVED
-- bookings make a vehicle unavailable. Approval is atomic and conflicting
-- pending customers receive ranked alternative-vehicle suggestions.

create extension if not exists btree_gist;
create schema if not exists private;

-- Remove the short-lived pre-submit hold model. It was deliberately superseded
-- because this business uses admin-confirmed requests rather than instant booking.
drop trigger if exists bookings_hold_convert_after_insert on public.bookings;
drop trigger if exists bookings_hold_guard_before_insert on public.bookings;
drop function if exists private.booking_convert_matching_hold();
drop function if exists private.booking_insert_hold_guard();
drop function if exists private.expire_vehicle_holds(uuid);
drop function if exists public.release_rental_hold(text);
drop function if exists public.reserve_rental_hold(text,timestamp without time zone,timestamp without time zone,text,uuid,text);
drop function if exists public.reserve_rental_hold(text,timestamptz,timestamptz,text,uuid,text);
drop table if exists public.booking_holds;

create table if not exists public.booking_alternative_offers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  approved_booking_id uuid references public.bookings(id) on delete set null,
  original_vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  alternative_vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  status text not null default 'OPEN',
  rank smallint not null default 1,
  score numeric(5,2) not null default 0,
  reason text,
  offered_at timestamptz,
  offered_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_alternative_status_chk check (status in ('OPEN','OFFERED','ACCEPTED','DISMISSED','EXPIRED')),
  constraint booking_alternative_rank_chk check (rank between 1 and 20),
  constraint booking_alternative_score_chk check (score between 0 and 100),
  constraint booking_alternative_different_vehicle_chk check (original_vehicle_id <> alternative_vehicle_id),
  constraint booking_alternative_offer_unique unique (booking_id, alternative_vehicle_id)
);

create index if not exists booking_alternative_booking_status_idx
  on public.booking_alternative_offers(booking_id, status, rank);
create index if not exists booking_alternative_approved_idx
  on public.booking_alternative_offers(approved_booking_id, status)
  where approved_booking_id is not null;
create index if not exists booking_alternative_vehicle_idx
  on public.booking_alternative_offers(alternative_vehicle_id, status);

alter table public.booking_alternative_offers enable row level security;
revoke all on table public.booking_alternative_offers from public, anon;
grant select, insert, update, delete on table public.booking_alternative_offers to authenticated;

drop policy if exists booking_alternative_operations_read on public.booking_alternative_offers;
create policy booking_alternative_operations_read
on public.booking_alternative_offers
for select
to authenticated
using ((select private.can_manage_operations()));

drop policy if exists booking_alternative_operations_write on public.booking_alternative_offers;
create policy booking_alternative_operations_write
on public.booking_alternative_offers
for all
to authenticated
using ((select private.can_manage_operations()))
with check ((select private.can_manage_operations()));

drop policy if exists booking_alternative_customer_read on public.booking_alternative_offers;
create policy booking_alternative_customer_read
on public.booking_alternative_offers
for select
to authenticated
using (
  status in ('OFFERED','ACCEPTED')
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.customer_user_id = (select auth.uid())
      and b.deleted_at is null
  )
);

create or replace function private.rental_has_approved_overlap(
  p_vehicle_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_booking_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.bookings b
    where b.vehicle_id = p_vehicle_id
      and b.booking_type = 'RENTAL'
      and b.status = 'APPROVED'
      and b.deleted_at is null
      and b.start_at < p_end_at
      and b.end_at > p_start_at
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
  );
$$;

revoke all on function private.rental_has_approved_overlap(uuid,timestamptz,timestamptz,uuid) from public, anon, authenticated;

create or replace function private.rental_alternative_candidates(
  p_original_vehicle_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_hourly boolean default false,
  p_with_driver boolean default false,
  p_limit integer default 5
)
returns table (
  vehicle_id uuid,
  stock_code text,
  brand text,
  model text,
  cover_image text,
  branch_id uuid,
  rental_price_daily numeric,
  rental_price_hourly numeric,
  body_type text,
  seats smallint,
  score numeric,
  reason text
)
language sql
stable
security definer
set search_path = public, pg_catalog, private
as $$
  with original as (
    select
      v.id,
      v.branch_id,
      v.rental_price_daily,
      v.rental_price_hourly,
      v.body_type,
      v.transmission,
      v.fuel_type,
      v.seats,
      coalesce(v.metadata->>'driverOption','BOTH') as driver_option
    from public.vehicles v
    where v.id = p_original_vehicle_id
  ), candidates as (
    select
      v.id as vehicle_id,
      v.stock_code,
      v.brand,
      v.model,
      v.cover_image,
      v.branch_id,
      v.rental_price_daily,
      v.rental_price_hourly,
      v.body_type,
      v.seats,
      (
        case when v.branch_id is not distinct from o.branch_id then 35 else 0 end +
        case when nullif(v.body_type,'') is not distinct from nullif(o.body_type,'') then 15 else 0 end +
        case when nullif(v.transmission,'') is not distinct from nullif(o.transmission,'') then 10 else 0 end +
        case when nullif(v.fuel_type,'') is not distinct from nullif(o.fuel_type,'') then 10 else 0 end +
        case when coalesce(v.seats,0) >= coalesce(o.seats,0) then 10 else 0 end +
        case
          when p_hourly and coalesce(o.rental_price_hourly,0) > 0 then
            greatest(0, 20 - least(20, round(abs(coalesce(v.rental_price_hourly,0) - o.rental_price_hourly) / o.rental_price_hourly * 20)))
          when not p_hourly and coalesce(o.rental_price_daily,0) > 0 then
            greatest(0, 20 - least(20, round(abs(coalesce(v.rental_price_daily,0) - o.rental_price_daily) / o.rental_price_daily * 20)))
          else 5
        end
      )::numeric as score,
      concat_ws(' · ',
        case when v.branch_id is not distinct from o.branch_id then 'Aynı şube' end,
        case when nullif(v.body_type,'') is not distinct from nullif(o.body_type,'') then 'Benzer araç tipi' end,
        case when nullif(v.transmission,'') is not distinct from nullif(o.transmission,'') then 'Aynı şanzıman' end,
        case when coalesce(v.seats,0) >= coalesce(o.seats,0) then 'Koltuk kapasitesi uygun' end,
        'Seçilen zamanda onaylı rezervasyonu yok'
      ) as reason
    from public.vehicles v
    cross join original o
    where v.id <> o.id
      and v.category = 'RENTAL'
      and v.is_active = true
      and v.publication_status = 'PUBLISHED'
      and coalesce(v.availability_status,'AVAILABLE') not in ('MAINTENANCE','SOLD','UNAVAILABLE','ARCHIVED')
      and (not p_hourly or (v.hourly_rental_enabled = true and coalesce(v.rental_price_hourly,0) > 0))
      and (
        (p_with_driver and coalesce(v.metadata->>'driverOption','BOTH') <> 'WITHOUT_DRIVER')
        or
        (not p_with_driver and coalesce(v.metadata->>'driverOption','BOTH') <> 'WITH_DRIVER')
      )
      and not private.rental_has_approved_overlap(v.id, p_start_at, p_end_at, null)
  )
  select
    c.vehicle_id,
    c.stock_code,
    c.brand,
    c.model,
    c.cover_image,
    c.branch_id,
    c.rental_price_daily,
    c.rental_price_hourly,
    c.body_type,
    c.seats,
    least(100, greatest(0, c.score)) as score,
    c.reason
  from candidates c
  order by c.score desc,
    case when p_hourly then coalesce(c.rental_price_hourly, 999999999) else coalesce(c.rental_price_daily, 999999999) end asc,
    c.brand asc,
    c.model asc
  limit greatest(1, least(coalesce(p_limit,5), 10));
$$;

revoke all on function private.rental_alternative_candidates(uuid,timestamptz,timestamptz,boolean,boolean,integer) from public, anon, authenticated;

create or replace function public.evaluate_rental_request(
  p_vehicle_identifier text,
  p_start_local timestamp without time zone,
  p_end_local timestamp without time zone
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_timezone text := 'Europe/Istanbul';
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_available boolean;
  v_alternatives jsonb := '[]'::jsonb;
begin
  if p_start_local is null or p_end_local is null or p_end_local <= p_start_local then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_DATES';
  end if;

  select v.* into v_vehicle
  from public.vehicles v
  where v.category = 'RENTAL'
    and v.is_active = true
    and v.publication_status = 'PUBLISHED'
    and coalesce(v.availability_status,'AVAILABLE') not in ('MAINTENANCE','SOLD','UNAVAILABLE','ARCHIVED')
    and (v.id::text = btrim(coalesce(p_vehicle_identifier,'')) or v.stock_code = btrim(coalesce(p_vehicle_identifier,'')))
  order by case when v.id::text = btrim(coalesce(p_vehicle_identifier,'')) then 0 else 1 end
  limit 1;

  if v_vehicle.id is null then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_VEHICLE';
  end if;

  if v_vehicle.branch_id is not null then
    select b.timezone into v_timezone from public.branches b where b.id = v_vehicle.branch_id;
  end if;
  v_timezone := coalesce(v_timezone,'Europe/Istanbul');
  if not private.is_valid_timezone(v_timezone) then
    raise exception using errcode = '22023', message = 'INVALID_BRANCH_TIMEZONE';
  end if;

  v_start_at := p_start_local at time zone v_timezone;
  v_end_at := p_end_local at time zone v_timezone;
  if v_end_at <= v_start_at or v_start_at < now() - interval '5 minutes' or v_end_at > now() + interval '3660 days' then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_DATES';
  end if;

  v_available := not private.rental_has_approved_overlap(v_vehicle.id, v_start_at, v_end_at, null);

  if not v_available then
    select coalesce(jsonb_agg(jsonb_build_object(
      'vehicleId', c.vehicle_id,
      'stockCode', c.stock_code,
      'brand', c.brand,
      'model', c.model,
      'coverImage', c.cover_image,
      'branchId', c.branch_id,
      'dailyPrice', c.rental_price_daily,
      'hourlyPrice', c.rental_price_hourly,
      'bodyType', c.body_type,
      'seats', c.seats,
      'score', c.score,
      'reason', c.reason
    ) order by c.score desc), '[]'::jsonb)
    into v_alternatives
    from private.rental_alternative_candidates(
      v_vehicle.id,
      v_start_at,
      v_end_at,
      coalesce(v_vehicle.hourly_rental_enabled,false),
      false,
      5
    ) c;
  end if;

  return jsonb_build_object(
    'vehicleId', v_vehicle.id,
    'startAt', v_start_at,
    'endAt', v_end_at,
    'branchTimezone', v_timezone,
    'available', v_available,
    'alternatives', v_alternatives
  );
end;
$$;

revoke all on function public.evaluate_rental_request(text,timestamp without time zone,timestamp without time zone) from public, anon, authenticated;
grant execute on function public.evaluate_rental_request(text,timestamp without time zone,timestamp without time zone) to service_role;

create or replace function private.seed_pending_booking_alternatives()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_approved_id uuid;
  v_candidate record;
  v_rank integer := 0;
begin
  if new.booking_type <> 'RENTAL' or new.status <> 'PENDING' or new.vehicle_id is null or new.start_at is null or new.end_at is null then
    return new;
  end if;

  select b.id into v_approved_id
  from public.bookings b
  where b.id <> new.id
    and b.vehicle_id = new.vehicle_id
    and b.booking_type = 'RENTAL'
    and b.status = 'APPROVED'
    and b.deleted_at is null
    and b.start_at < new.end_at
    and b.end_at > new.start_at
  order by b.updated_at desc, b.created_at desc
  limit 1;

  if v_approved_id is null then
    return new;
  end if;

  for v_candidate in
    select * from private.rental_alternative_candidates(
      new.vehicle_id,
      new.start_at,
      new.end_at,
      new.rental_duration = 'hourly',
      coalesce(new.with_driver,false),
      5
    )
  loop
    v_rank := v_rank + 1;
    insert into public.booking_alternative_offers(
      booking_id, approved_booking_id, original_vehicle_id, alternative_vehicle_id,
      status, rank, score, reason, expires_at, updated_at
    ) values (
      new.id, v_approved_id, new.vehicle_id, v_candidate.vehicle_id,
      'OPEN', v_rank, v_candidate.score, v_candidate.reason,
      greatest(new.start_at, now() + interval '1 day'), now()
    )
    on conflict (booking_id, alternative_vehicle_id)
    do update set
      approved_booking_id = excluded.approved_booking_id,
      status = case when public.booking_alternative_offers.status = 'ACCEPTED' then 'ACCEPTED' else 'OPEN' end,
      rank = excluded.rank,
      score = excluded.score,
      reason = excluded.reason,
      expires_at = excluded.expires_at,
      updated_at = now();
  end loop;

  update public.bookings b
  set metadata = coalesce(b.metadata,'{}'::jsonb) || jsonb_build_object(
    'availability',
    coalesce(b.metadata->'availability','{}'::jsonb) || jsonb_build_object(
      'status','ORIGINAL_VEHICLE_BOOKED',
      'approvedBookingId',v_approved_id,
      'alternativeCount',v_rank,
      'updatedAt',now()
    )
  ), updated_at = now()
  where b.id = new.id;

  return new;
end;
$$;

revoke all on function private.seed_pending_booking_alternatives() from public, anon, authenticated;

drop trigger if exists booking_seed_alternatives_after_pending_insert on public.bookings;
create trigger booking_seed_alternatives_after_pending_insert
after insert on public.bookings
for each row
when (new.booking_type = 'RENTAL' and new.status = 'PENDING')
execute function private.seed_pending_booking_alternatives();

create or replace function private.generate_booking_alternatives()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_pending record;
  v_candidate record;
  v_rank integer;
begin
  if new.booking_type <> 'RENTAL' or new.status <> 'APPROVED' or old.status = 'APPROVED' then
    return new;
  end if;

  for v_pending in
    select b.*
    from public.bookings b
    where b.id <> new.id
      and b.vehicle_id = new.vehicle_id
      and b.booking_type = 'RENTAL'
      and b.status = 'PENDING'
      and b.deleted_at is null
      and b.start_at < new.end_at
      and b.end_at > new.start_at
    for update
  loop
    update public.booking_alternative_offers
    set status = 'EXPIRED', updated_at = now()
    where booking_id = v_pending.id
      and status in ('OPEN','OFFERED')
      and approved_booking_id is distinct from new.id;

    v_rank := 0;
    for v_candidate in
      select *
      from private.rental_alternative_candidates(
        v_pending.vehicle_id,
        v_pending.start_at,
        v_pending.end_at,
        v_pending.rental_duration = 'hourly',
        coalesce(v_pending.with_driver,false),
        5
      )
    loop
      v_rank := v_rank + 1;
      insert into public.booking_alternative_offers(
        booking_id,
        approved_booking_id,
        original_vehicle_id,
        alternative_vehicle_id,
        status,
        rank,
        score,
        reason,
        expires_at,
        updated_at
      ) values (
        v_pending.id,
        new.id,
        v_pending.vehicle_id,
        v_candidate.vehicle_id,
        'OPEN',
        v_rank,
        v_candidate.score,
        v_candidate.reason,
        greatest(v_pending.start_at, now() + interval '1 day'),
        now()
      )
      on conflict (booking_id, alternative_vehicle_id)
      do update set
        approved_booking_id = excluded.approved_booking_id,
        original_vehicle_id = excluded.original_vehicle_id,
        status = case when public.booking_alternative_offers.status = 'ACCEPTED' then 'ACCEPTED' else 'OPEN' end,
        rank = excluded.rank,
        score = excluded.score,
        reason = excluded.reason,
        expires_at = excluded.expires_at,
        updated_at = now();
    end loop;

    update public.bookings b
    set metadata = coalesce(b.metadata,'{}'::jsonb) || jsonb_build_object(
      'availability',
      coalesce(b.metadata->'availability','{}'::jsonb) || jsonb_build_object(
        'status','ORIGINAL_VEHICLE_BOOKED',
        'approvedBookingId',new.reference,
        'alternativeCount',v_rank,
        'updatedAt',now()
      )
    ),
    updated_at = now()
    where b.id = v_pending.id;
  end loop;

  return new;
end;
$$;

revoke all on function private.generate_booking_alternatives() from public, anon, authenticated;

drop trigger if exists booking_generate_alternatives_after_approval on public.bookings;
create trigger booking_generate_alternatives_after_approval
after update of status on public.bookings
for each row
when (new.status = 'APPROVED' and old.status is distinct from 'APPROVED')
execute function private.generate_booking_alternatives();

create or replace function private.expire_booking_alternatives()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if old.status = 'APPROVED' and new.status <> 'APPROVED' then
    update public.booking_alternative_offers
    set status = case when status = 'ACCEPTED' then status else 'EXPIRED' end,
        updated_at = now()
    where approved_booking_id = old.id
      and status in ('OPEN','OFFERED');

    update public.bookings b
    set metadata = coalesce(b.metadata,'{}'::jsonb) || jsonb_build_object(
      'availability',
      coalesce(b.metadata->'availability','{}'::jsonb) || jsonb_build_object(
        'status','RECHECK_REQUIRED',
        'updatedAt',now()
      )
    ),
    updated_at = now()
    where b.id in (
      select distinct o.booking_id
      from public.booking_alternative_offers o
      where o.approved_booking_id = old.id
    )
      and b.status = 'PENDING';
  end if;
  return new;
end;
$$;

revoke all on function private.expire_booking_alternatives() from public, anon, authenticated;

drop trigger if exists booking_expire_alternatives_after_release on public.bookings;
create trigger booking_expire_alternatives_after_release
after update of status on public.bookings
for each row
when (old.status = 'APPROVED' and new.status is distinct from 'APPROVED')
execute function private.expire_booking_alternatives();

create or replace function public.admin_approve_booking(
  p_booking_id uuid,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog, private
as $$
declare
  v_booking public.bookings%rowtype;
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_conflicts integer := 0;
  v_offers integer := 0;
begin
  if v_actor is null or not private.can_manage_operations() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id and b.deleted_at is null
  for update;

  if v_booking.id is null then
    raise exception using errcode = 'P0002', message = 'BOOKING_NOT_FOUND';
  end if;
  if v_booking.status = 'APPROVED' then
    return jsonb_build_object('bookingId',v_booking.id,'reference',v_booking.reference,'alreadyApproved',true,'conflictCount',0,'alternativeOfferCount',0);
  end if;

  if v_booking.booking_type = 'RENTAL' then
    if v_booking.vehicle_id is null or v_booking.start_at is null or v_booking.end_at is null or v_booking.end_at <= v_booking.start_at then
      raise exception using errcode = '22023', message = 'INVALID_RENTAL_DATES';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v_booking.vehicle_id::text, 163));
    if private.rental_has_approved_overlap(v_booking.vehicle_id, v_booking.start_at, v_booking.end_at, v_booking.id) then
      raise exception using errcode = '23P01', message = 'VEHICLE_UNAVAILABLE';
    end if;
  end if;

  update public.bookings
  set status = 'APPROVED', updated_at = now()
  where id = v_booking.id;

  if v_booking.booking_type = 'RENTAL' then
    select count(*) into v_conflicts
    from public.bookings b
    where b.id <> v_booking.id
      and b.vehicle_id = v_booking.vehicle_id
      and b.booking_type = 'RENTAL'
      and b.status = 'PENDING'
      and b.deleted_at is null
      and b.start_at < v_booking.end_at
      and b.end_at > v_booking.start_at;

    select count(*) into v_offers
    from public.booking_alternative_offers o
    where o.approved_booking_id = v_booking.id
      and o.status in ('OPEN','OFFERED','ACCEPTED');
  end if;

  select lower(u.email) into v_actor_email from auth.users u where u.id = v_actor;
  insert into public.audit_logs(
    actor_user_id, actor_email, action, entity_type, entity_id,
    before_data, after_data, request_id, event_meta
  ) values (
    v_actor, v_actor_email, 'booking_approved_atomic', 'booking', v_booking.reference,
    jsonb_build_object('status',v_booking.status),
    jsonb_build_object('status','APPROVED'),
    left(nullif(btrim(coalesce(p_request_id,'')),''),80),
    jsonb_build_object('conflictCount',v_conflicts,'alternativeOfferCount',v_offers)
  );

  return jsonb_build_object(
    'bookingId',v_booking.id,
    'reference',v_booking.reference,
    'alreadyApproved',false,
    'conflictCount',v_conflicts,
    'alternativeOfferCount',v_offers
  );
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'VEHICLE_UNAVAILABLE';
end;
$$;

revoke all on function public.admin_approve_booking(uuid,text) from public, anon;
grant execute on function public.admin_approve_booking(uuid,text) to authenticated;

create or replace function public.admin_offer_booking_alternative(
  p_offer_id uuid,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog, private
as $$
declare
  v_offer public.booking_alternative_offers%rowtype;
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_booking public.bookings%rowtype;
begin
  if v_actor is null or not private.can_manage_operations() then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select o.* into v_offer
  from public.booking_alternative_offers o
  where o.id = p_offer_id
  for update;
  if v_offer.id is null then
    raise exception using errcode = 'P0002', message = 'ALTERNATIVE_NOT_FOUND';
  end if;

  select b.* into v_booking from public.bookings b where b.id = v_offer.booking_id and b.deleted_at is null;
  if v_booking.id is null or v_booking.status <> 'PENDING' then
    raise exception using errcode = '22023', message = 'BOOKING_NOT_PENDING';
  end if;
  if private.rental_has_approved_overlap(v_offer.alternative_vehicle_id, v_booking.start_at, v_booking.end_at, null) then
    update public.booking_alternative_offers set status='EXPIRED', updated_at=now() where id=v_offer.id;
    raise exception using errcode = '23P01', message = 'ALTERNATIVE_NO_LONGER_AVAILABLE';
  end if;

  update public.booking_alternative_offers
  set status='OFFERED', offered_at=now(), offered_by=v_actor, updated_at=now()
  where id=v_offer.id
  returning * into v_offer;

  update public.bookings b
  set metadata = coalesce(b.metadata,'{}'::jsonb) || jsonb_build_object(
    'availability',
    coalesce(b.metadata->'availability','{}'::jsonb) || jsonb_build_object(
      'status','ALTERNATIVE_OFFERED',
      'offerId',v_offer.id,
      'alternativeVehicleId',v_offer.alternative_vehicle_id,
      'updatedAt',now()
    )
  ),
  updated_at=now()
  where b.id=v_offer.booking_id;

  select lower(u.email) into v_actor_email from auth.users u where u.id=v_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,request_id,event_meta)
  values(v_actor,v_actor_email,'booking_alternative_offered','booking',v_booking.reference,left(nullif(btrim(coalesce(p_request_id,'')),''),80),jsonb_build_object('offerId',v_offer.id,'alternativeVehicleId',v_offer.alternative_vehicle_id));

  return jsonb_build_object('offerId',v_offer.id,'bookingId',v_offer.booking_id,'alternativeVehicleId',v_offer.alternative_vehicle_id,'status',v_offer.status);
end;
$$;

revoke all on function public.admin_offer_booking_alternative(uuid,text) from public, anon;
grant execute on function public.admin_offer_booking_alternative(uuid,text) to authenticated;

comment on table public.booking_alternative_offers is
  'Ranked alternatives generated only after another request wins admin approval; PENDING requests never reserve inventory.';
