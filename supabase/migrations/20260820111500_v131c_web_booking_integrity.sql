create or replace function public.enforce_web_booking_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  cfg public.payment_settings%rowtype;
begin
  if new.source = 'WEB' then
    if new.customer_email is null or btrim(new.customer_email) = '' then
      raise exception 'WEB_BOOKING_EMAIL_REQUIRED';
    end if;
    if new.booking_type = 'RENTAL' and new.payment_method = 'NONE' then
      raise exception 'WEB_RENTAL_PAYMENT_METHOD_REQUIRED';
    end if;
    select * into cfg from public.payment_settings where config_key = 'main';
    if found then
      if new.payment_method = 'CARD' and not cfg.card_enabled then
        raise exception 'CARD_PAYMENT_DISABLED';
      elsif new.payment_method = 'EFT' and not cfg.eft_enabled then
        raise exception 'EFT_PAYMENT_DISABLED';
      elsif new.payment_method = 'OFFICE' and not cfg.office_enabled then
        raise exception 'OFFICE_PAYMENT_DISABLED';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_web_booking_integrity() from public, anon, authenticated;
grant execute on function public.enforce_web_booking_integrity() to service_role;
drop trigger if exists bookings_web_integrity_guard on public.bookings;
create trigger bookings_web_integrity_guard
before insert or update of customer_email, payment_method, source, booking_type
on public.bookings
for each row execute function public.enforce_web_booking_integrity();
