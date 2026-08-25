-- V163.2 explicit booking state machine.
-- Only a customer request in PENDING may transition to APPROVED. Rejected,
-- cancelled or completed records must first be intentionally moved back to
-- PENDING by an operations user, preventing accidental state skipping.

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
    return jsonb_build_object(
      'bookingId',v_booking.id,
      'reference',v_booking.reference,
      'alreadyApproved',true,
      'conflictCount',0,
      'alternativeOfferCount',0
    );
  end if;
  if v_booking.status <> 'PENDING' then
    raise exception using errcode = '22023', message = 'BOOKING_NOT_PENDING';
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
  where id = v_booking.id
    and status = 'PENDING';

  if not found then
    raise exception using errcode = '40001', message = 'BOOKING_STATE_CHANGED';
  end if;

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
