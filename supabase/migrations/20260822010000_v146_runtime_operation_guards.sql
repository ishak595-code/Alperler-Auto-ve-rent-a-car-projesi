create or replace function public.runtime_operation_allowed(p_operation text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v jsonb;
  op text := upper(trim(coalesce(p_operation,'')));
begin
  select value into v from public.site_config where key='runtime_controls' limit 1;
  if v is null then return true; end if;
  if coalesce((v->>'maintenanceMode')::boolean,false) then return false; end if;
  if coalesce((v->>'readOnlyMode')::boolean,false) then return false; end if;
  case op
    when 'BOOKING' then return coalesce((v->>'allowBookings')::boolean,true);
    when 'APPOINTMENT' then return coalesce((v->>'allowAppointments')::boolean,true);
    when 'CONTACT' then return coalesce((v->>'allowContact')::boolean,true);
    when 'PARTNER_REQUEST' then return coalesce((v->>'allowPartnerRequests')::boolean,true);
    else return false;
  end case;
end;
$$;

revoke all on function public.runtime_operation_allowed(text) from public, anon, authenticated;
grant execute on function public.runtime_operation_allowed(text) to service_role;

create or replace function private.enforce_booking_runtime_control()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if new.source = 'WEB' and not public.runtime_operation_allowed(case when new.booking_type='APPOINTMENT' then 'APPOINTMENT' else 'BOOKING' end) then
    raise exception 'RUNTIME_OPERATION_DISABLED' using errcode='P0001';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_contact_runtime_control()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if not public.runtime_operation_allowed('CONTACT') then
    raise exception 'RUNTIME_OPERATION_DISABLED' using errcode='P0001';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_partner_runtime_control()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if not public.runtime_operation_allowed('PARTNER_REQUEST') then
    raise exception 'RUNTIME_OPERATION_DISABLED' using errcode='P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_booking_runtime_control on public.bookings;
create trigger trg_booking_runtime_control before insert on public.bookings for each row execute function private.enforce_booking_runtime_control();

drop trigger if exists trg_contact_runtime_control on public.contact_messages;
create trigger trg_contact_runtime_control before insert on public.contact_messages for each row execute function private.enforce_contact_runtime_control();

drop trigger if exists trg_partner_runtime_control on public.partner_requests;
create trigger trg_partner_runtime_control before insert on public.partner_requests for each row execute function private.enforce_partner_runtime_control();

revoke all on function private.enforce_booking_runtime_control() from public,anon,authenticated;
revoke all on function private.enforce_contact_runtime_control() from public,anon,authenticated;
revoke all on function private.enforce_partner_runtime_control() from public,anon,authenticated;
