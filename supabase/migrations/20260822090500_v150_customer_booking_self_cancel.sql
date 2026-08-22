create or replace function public.customer_cancel_booking(p_reference text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_booking public.bookings%rowtype;
  v_after public.bookings%rowtype;
begin
  if v_user_id is null then
    raise exception 'CUSTOMER_SESSION_REQUIRED' using errcode = 'P0001';
  end if;

  if p_reference is null or length(trim(p_reference)) < 3 or length(trim(p_reference)) > 80 then
    raise exception 'INVALID_BOOKING_REFERENCE' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.bookings
  where reference = trim(p_reference)
    and customer_user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('PENDING', 'APPROVED') then
    raise exception 'BOOKING_CANNOT_BE_CANCELLED' using errcode = 'P0001';
  end if;

  if v_booking.status = 'APPROVED'
     and v_booking.start_at is not null
     and v_booking.start_at <= now() then
    raise exception 'BOOKING_ALREADY_STARTED' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'CANCELLED',
      updated_at = now()
  where id = v_booking.id
  returning * into v_after;

  insert into public.audit_logs(
    actor_user_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) values (
    v_user_id,
    nullif(v_email, ''),
    'booking_cancelled_by_customer',
    'booking',
    v_booking.reference,
    jsonb_build_object('status', v_booking.status),
    jsonb_build_object('status', v_after.status)
  );

  return jsonb_build_object(
    'ok', true,
    'reference', v_after.reference,
    'status', v_after.status,
    'updatedAt', v_after.updated_at
  );
end;
$$;

revoke all on function public.customer_cancel_booking(text) from public;
grant execute on function public.customer_cancel_booking(text) to authenticated;
