-- V170 Tour Studio + Flexible Demand
-- Business rule: tour demand never closes a date because of cumulative reservations.
-- The capacity column is an operational/recommended group size, not a booking hard-stop.

update public.tours
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
  'capacityPolicy','FLEXIBLE_DEMAND',
  'capacityMeaning','RECOMMENDED_GROUP_SIZE',
  'reservationHardLimit',false
)
where coalesce(metadata->>'capacityPolicy','') <> 'FLEXIBLE_DEMAND'
   or coalesce((metadata->>'reservationHardLimit')::boolean,true) is not false;

create or replace function public.tour_demand_v170(
  p_tour_identifier text,
  p_tour_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_catalog
as $$
declare
  v_tour public.tours%rowtype;
  v_approved_people integer:=0;
  v_pending_people integer:=0;
  v_approved_reservations integer:=0;
  v_pending_reservations integer:=0;
begin
  if p_tour_date is null then
    raise exception using errcode='22023',message='TOUR_DATE_REQUIRED';
  end if;

  select t.* into v_tour
  from public.tours t
  where t.id::text=btrim(coalesce(p_tour_identifier,''))
     or t.seo_slug=btrim(coalesce(p_tour_identifier,''))
  limit 1;

  if v_tour.id is null then
    raise exception using errcode='P0002',message='TOUR_NOT_FOUND';
  end if;

  select
    coalesce(sum(coalesce(b.person_count,0)) filter(where b.status='APPROVED'),0)::integer,
    coalesce(sum(coalesce(b.person_count,0)) filter(where b.status='PENDING'),0)::integer,
    count(*) filter(where b.status='APPROVED')::integer,
    count(*) filter(where b.status='PENDING')::integer
  into v_approved_people,v_pending_people,v_approved_reservations,v_pending_reservations
  from public.bookings b
  where b.booking_type='TOUR'
    and b.tour_id=v_tour.id
    and b.status in ('APPROVED','PENDING')
    and b.deleted_at is null
    and b.start_at is not null
    and (b.start_at at time zone 'Europe/Istanbul')::date=p_tour_date;

  return jsonb_build_object(
    'tourId',v_tour.id,
    'date',p_tour_date,
    'publicationStatus',v_tour.publication_status,
    'isActive',v_tour.is_active,
    'available',v_tour.publication_status='PUBLISHED' and v_tour.is_active is true,
    'capacityPolicy','FLEXIBLE_DEMAND',
    'hardCapacity',false,
    'recommendedGroupSize',coalesce(v_tour.capacity,0),
    'approvedPeople',v_approved_people,
    'pendingPeople',v_pending_people,
    'approvedReservations',v_approved_reservations,
    'pendingReservations',v_pending_reservations,
    'remainingSeats',null,
    'pendingBlocksCapacity',false,
    'approvedBlocksCapacity',false
  );
end;
$$;

revoke all on function public.tour_demand_v170(text,date) from public,anon,authenticated;
grant execute on function public.tour_demand_v170(text,date) to service_role;

-- The V169 RPC remains as a compatibility endpoint for the existing Edge Function,
-- but it is no longer a browser-callable SECURITY DEFINER API.
revoke all on function public.tour_availability_v169(text,date) from public,anon,authenticated;
grant execute on function public.tour_availability_v169(text,date) to service_role;

create or replace function public.admin_approve_booking(p_booking_id uuid,p_request_id text default null::text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_catalog,private
as $$
declare
  v_booking public.bookings%rowtype;
  v_actor uuid:=auth.uid();
  v_actor_email text;
  v_conflicts integer:=0;
  v_offers integer:=0;
  v_tour_active boolean:=false;
  v_tour_publication text:='';
  v_tour_day date;
begin
  if v_actor is null or not private.can_manage_operations() then
    raise exception using errcode='42501',message='FORBIDDEN';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id=p_booking_id and b.deleted_at is null
  for update;

  if v_booking.id is null then
    raise exception using errcode='P0002',message='BOOKING_NOT_FOUND';
  end if;

  if v_booking.status='APPROVED' then
    return jsonb_build_object(
      'bookingId',v_booking.id,
      'reference',v_booking.reference,
      'alreadyApproved',true,
      'conflictCount',0,
      'alternativeOfferCount',0,
      'tourCapacityPolicy',case when v_booking.booking_type='TOUR' then 'FLEXIBLE_DEMAND' else null end
    );
  end if;

  if v_booking.booking_type='RENTAL' then
    if v_booking.vehicle_id is null or v_booking.start_at is null or v_booking.end_at is null or v_booking.end_at<=v_booking.start_at then
      raise exception using errcode='22023',message='INVALID_RENTAL_DATES';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v_booking.vehicle_id::text,163));
    if private.rental_has_approved_overlap(v_booking.vehicle_id,v_booking.start_at,v_booking.end_at,v_booking.id) then
      raise exception using errcode='23P01',message='VEHICLE_UNAVAILABLE';
    end if;
  elsif v_booking.booking_type='TOUR' then
    if v_booking.tour_id is null or v_booking.start_at is null or coalesce(v_booking.person_count,0)<1 then
      raise exception using errcode='22023',message='INVALID_TOUR_BOOKING';
    end if;
    v_tour_day:=(v_booking.start_at at time zone 'Europe/Istanbul')::date;
    select t.is_active,coalesce(t.publication_status,'')
      into v_tour_active,v_tour_publication
    from public.tours t
    where t.id=v_booking.tour_id;
    if v_tour_active is not true or v_tour_publication<>'PUBLISHED' then
      raise exception using errcode='22023',message='INVALID_TOUR';
    end if;
    -- No cumulative capacity check. Demand volume is operational planning data only.
  end if;

  update public.bookings
  set status='APPROVED',updated_at=now()
  where id=v_booking.id;

  if v_booking.booking_type='RENTAL' then
    select count(*) into v_conflicts
    from public.bookings b
    where b.id<>v_booking.id
      and b.vehicle_id=v_booking.vehicle_id
      and b.booking_type='RENTAL'
      and b.status='PENDING'
      and b.deleted_at is null
      and b.start_at<v_booking.end_at
      and b.end_at>v_booking.start_at;

    select count(*) into v_offers
    from public.booking_alternative_offers o
    where o.approved_booking_id=v_booking.id
      and o.status in ('OPEN','OFFERED','ACCEPTED');
  elsif v_booking.booking_type='TOUR' then
    select count(*) into v_conflicts
    from public.bookings b
    where b.id<>v_booking.id
      and b.tour_id=v_booking.tour_id
      and b.booking_type='TOUR'
      and b.status='PENDING'
      and b.deleted_at is null
      and b.start_at is not null
      and (b.start_at at time zone 'Europe/Istanbul')::date=v_tour_day;
  end if;

  select lower(u.email) into v_actor_email from auth.users u where u.id=v_actor;
  insert into public.audit_logs(
    actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,request_id,event_meta
  ) values(
    v_actor,
    v_actor_email,
    'booking_approved_atomic',
    'booking',
    v_booking.reference,
    jsonb_build_object('status',v_booking.status),
    jsonb_build_object('status','APPROVED'),
    left(nullif(btrim(coalesce(p_request_id,'')),''),80),
    jsonb_build_object(
      'conflictCount',v_conflicts,
      'alternativeOfferCount',v_offers,
      'tourCapacityPolicy',case when v_booking.booking_type='TOUR' then 'FLEXIBLE_DEMAND' else null end,
      'tourDate',case when v_booking.booking_type='TOUR' then v_tour_day else null end
    )
  );

  return jsonb_build_object(
    'bookingId',v_booking.id,
    'reference',v_booking.reference,
    'alreadyApproved',false,
    'conflictCount',v_conflicts,
    'alternativeOfferCount',v_offers,
    'tourRemainingSeats',null,
    'tourCapacityPolicy',case when v_booking.booking_type='TOUR' then 'FLEXIBLE_DEMAND' else null end
  );
exception when exclusion_violation then
  raise exception using errcode='23P01',message='VEHICLE_UNAVAILABLE';
end;
$$;

comment on function public.admin_approve_booking(uuid,text) is
'V170 atomic approval. Rental inventory remains overlap-protected. Tour approvals never hard-stop on cumulative demand; capacity is recommended group size only.';

comment on function public.tour_demand_v170(text,date) is
'V170 service-only tour demand metrics. Returns demand counts and operational group size without a reservation hard-stop.';