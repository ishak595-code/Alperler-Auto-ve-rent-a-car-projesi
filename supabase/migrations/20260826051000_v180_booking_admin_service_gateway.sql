begin;

-- V180: move privileged booking approval/alternative mutations behind the
-- trusted Edge/service boundary. The actor is explicit and authorization is
-- re-checked inside PostgreSQL; browser/authenticated roles cannot execute
-- these service RPCs directly.

create or replace function public.service_approve_booking_v180(
  p_actor uuid,
  p_booking_id uuid,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_booking public.bookings%rowtype;
  v_actor_email text;
  v_conflicts integer := 0;
  v_offers integer := 0;
  v_tour_active boolean := false;
  v_tour_publication text := '';
  v_tour_day date;
begin
  if p_actor is null or not private.can_actor_manage_operations(p_actor) then
    raise exception using errcode='42501', message='FORBIDDEN';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.deleted_at is null
  for update;

  if v_booking.id is null then
    raise exception using errcode='P0002', message='BOOKING_NOT_FOUND';
  end if;

  if v_booking.status = 'APPROVED' then
    return jsonb_build_object(
      'bookingId', v_booking.id,
      'reference', v_booking.reference,
      'alreadyApproved', true,
      'conflictCount', 0,
      'alternativeOfferCount', 0,
      'tourCapacityPolicy', case when v_booking.booking_type='TOUR' then 'FLEXIBLE_DEMAND' else null end
    );
  end if;

  if v_booking.booking_type = 'RENTAL' then
    if v_booking.vehicle_id is null
       or v_booking.start_at is null
       or v_booking.end_at is null
       or v_booking.end_at <= v_booking.start_at then
      raise exception using errcode='22023', message='INVALID_RENTAL_DATES';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(v_booking.vehicle_id::text, 163));
    if private.rental_has_approved_overlap(
      v_booking.vehicle_id,
      v_booking.start_at,
      v_booking.end_at,
      v_booking.id
    ) then
      raise exception using errcode='23P01', message='VEHICLE_UNAVAILABLE';
    end if;
  elsif v_booking.booking_type = 'TOUR' then
    if v_booking.tour_id is null
       or v_booking.start_at is null
       or coalesce(v_booking.person_count,0) < 1 then
      raise exception using errcode='22023', message='INVALID_TOUR_BOOKING';
    end if;

    v_tour_day := (v_booking.start_at at time zone 'Europe/Istanbul')::date;
    select t.is_active, coalesce(t.publication_status,'')
      into v_tour_active, v_tour_publication
    from public.tours t
    where t.id = v_booking.tour_id;

    if v_tour_active is not true or v_tour_publication <> 'PUBLISHED' then
      raise exception using errcode='22023', message='INVALID_TOUR';
    end if;
  end if;

  update public.bookings
  set status='APPROVED', updated_at=now()
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

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au
  left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor
  limit 1;

  insert into public.audit_logs(
    actor_user_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    request_id,
    event_meta
  ) values(
    p_actor,
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
      'tourDate',case when v_booking.booking_type='TOUR' then v_tour_day else null end,
      'gateway','booking-admin-actions-v180'
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

create or replace function public.service_offer_booking_alternative_v180(
  p_actor uuid,
  p_offer_id uuid,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_offer public.booking_alternative_offers%rowtype;
  v_actor_email text;
  v_booking public.bookings%rowtype;
begin
  if p_actor is null or not private.can_actor_manage_operations(p_actor) then
    raise exception using errcode='42501', message='FORBIDDEN';
  end if;

  select o.* into v_offer
  from public.booking_alternative_offers o
  where o.id=p_offer_id
  for update;

  if v_offer.id is null then
    raise exception using errcode='P0002',message='ALTERNATIVE_NOT_FOUND';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id=v_offer.booking_id
    and b.deleted_at is null;

  if v_booking.id is null or v_booking.status<>'PENDING' then
    raise exception using errcode='22023',message='BOOKING_NOT_PENDING';
  end if;

  if private.rental_has_approved_overlap(
    v_offer.alternative_vehicle_id,
    v_booking.start_at,
    v_booking.end_at,
    null
  ) then
    update public.booking_alternative_offers
    set status='EXPIRED',updated_at=now()
    where id=v_offer.id;
    raise exception using errcode='23P01',message='ALTERNATIVE_NO_LONGER_AVAILABLE';
  end if;

  update public.booking_alternative_offers
  set status='OFFERED',offered_at=now(),offered_by=p_actor,updated_at=now()
  where id=v_offer.id
  returning * into v_offer;

  update public.bookings b
  set metadata=coalesce(b.metadata,'{}'::jsonb) || jsonb_build_object(
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

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au
  left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor
  limit 1;

  insert into public.audit_logs(
    actor_user_id,actor_email,action,entity_type,entity_id,request_id,event_meta
  ) values(
    p_actor,
    v_actor_email,
    'booking_alternative_offered',
    'booking',
    v_booking.reference,
    left(nullif(btrim(coalesce(p_request_id,'')),''),80),
    jsonb_build_object(
      'offerId',v_offer.id,
      'alternativeVehicleId',v_offer.alternative_vehicle_id,
      'gateway','booking-admin-actions-v180'
    )
  );

  return jsonb_build_object(
    'offerId',v_offer.id,
    'bookingId',v_offer.booking_id,
    'alternativeVehicleId',v_offer.alternative_vehicle_id,
    'status',v_offer.status
  );
end;
$$;

revoke all on function public.service_approve_booking_v180(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.service_offer_booking_alternative_v180(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.service_approve_booking_v180(uuid,uuid,text) to service_role;
grant execute on function public.service_offer_booking_alternative_v180(uuid,uuid,text) to service_role;

commit;
