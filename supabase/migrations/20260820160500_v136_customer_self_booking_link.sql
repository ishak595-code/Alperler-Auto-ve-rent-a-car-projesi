create or replace function public.link_own_customer_booking(p_booking_reference text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_booking public.bookings;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select lower(nullif(email, '')) into v_email
  from public.customer_profiles
  where user_id = v_uid and status = 'ACTIVE';

  if v_email is null then raise exception 'CUSTOMER_EMAIL_REQUIRED'; end if;

  update public.bookings
     set customer_user_id = v_uid,
         customer_linked_at = coalesce(customer_linked_at, now()),
         updated_at = now()
   where reference = trim(p_booking_reference)
     and deleted_at is null
     and lower(coalesce(customer_email, '')) = v_email
     and (customer_user_id is null or customer_user_id = v_uid)
  returning * into v_booking;

  if not found then raise exception 'BOOKING_NOT_LINKABLE'; end if;

  return jsonb_build_object(
    'ok', true,
    'bookingReference', v_booking.reference,
    'customerUserId', v_booking.customer_user_id
  );
end;
$$;

revoke all on function public.link_own_customer_booking(text) from public, anon;
grant execute on function public.link_own_customer_booking(text) to authenticated;
