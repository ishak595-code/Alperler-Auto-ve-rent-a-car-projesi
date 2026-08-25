-- Protect ACTIVE hold creation/reactivation against already approved rentals.
-- The GiST exclusion on booking_holds protects hold-vs-hold; this trigger adds
-- the cross-table booking-vs-hold invariant.

create or replace function private.guard_booking_hold_activation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.status <> 'ACTIVE' or new.expires_at <= now() then
    return new;
  end if;
  if exists (
    select 1
    from public.bookings b
    where b.vehicle_id = new.vehicle_id
      and b.booking_type = 'RENTAL'
      and b.status = 'APPROVED'
      and b.deleted_at is null
      and b.start_at < new.end_at
      and b.end_at > new.start_at
  ) then
    raise exception using errcode = '23P01', message = 'VEHICLE_UNAVAILABLE';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_booking_hold_activation() from public, anon, authenticated;

drop trigger if exists booking_holds_activation_guard on public.booking_holds;
create trigger booking_holds_activation_guard
before insert or update of status,start_at,end_at,vehicle_id,expires_at on public.booking_holds
for each row execute function private.guard_booking_hold_activation();
