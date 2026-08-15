begin;

create or replace function private.enforce_runtime_transaction_insert()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  allowed boolean;
  operation_name text;
begin
  if tg_table_name = 'bookings' then
    if coalesce(new.source, 'WEB') <> 'WEB' then return new; end if;
    operation_name := case when new.booking_type = 'APPOINTMENT' then 'APPOINTMENT' else 'BOOKING' end;
  elsif tg_table_name = 'contact_messages' then
    if coalesce(new.source, 'WEB') <> 'WEB' then return new; end if;
    operation_name := 'CONTACT';
  elsif tg_table_name = 'partner_requests' then
    operation_name := 'PARTNER_REQUEST';
  else
    return new;
  end if;

  allowed := public.runtime_operation_allowed(operation_name);
  if allowed is not true then
    raise exception using
      errcode = 'P0001',
      message = 'RUNTIME_OPERATION_BLOCKED',
      detail = operation_name;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_runtime_transaction_insert() from public, anon, authenticated;

drop trigger if exists bookings_runtime_guard on public.bookings;
create trigger bookings_runtime_guard
before insert on public.bookings
for each row execute function private.enforce_runtime_transaction_insert();

drop trigger if exists contact_messages_runtime_guard on public.contact_messages;
create trigger contact_messages_runtime_guard
before insert on public.contact_messages
for each row execute function private.enforce_runtime_transaction_insert();

drop trigger if exists partner_requests_runtime_guard on public.partner_requests;
create trigger partner_requests_runtime_guard
before insert on public.partner_requests
for each row execute function private.enforce_runtime_transaction_insert();

commit;
