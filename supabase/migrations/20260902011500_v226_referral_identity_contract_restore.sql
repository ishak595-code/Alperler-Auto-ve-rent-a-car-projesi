-- V226: restore the verified referral identity trigger contract without rowtype-unsafe NEW field access.
-- The trigger is attached only to customer_referral_codes and customer_referrals.

create or replace function private.enforce_verified_referral_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth
as $function$
declare
  v_user_id uuid;
begin
  if tg_table_name = 'customer_referral_codes' then
    v_user_id := new.user_id;
  elsif tg_table_name = 'customer_referrals' then
    v_user_id := new.invitee_user_id;
  else
    raise exception using errcode = 'P0001', message = 'REFERRAL_TRIGGER_TABLE_UNSUPPORTED';
  end if;

  if v_user_id is null or not exists (
    select 1
    from auth.users u
    where u.id = v_user_id
      and u.email_confirmed_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'EMAIL_VERIFICATION_REQUIRED';
  end if;

  return new;
end
$function$;

revoke all on function private.enforce_verified_referral_identity() from public, anon, authenticated, service_role;
