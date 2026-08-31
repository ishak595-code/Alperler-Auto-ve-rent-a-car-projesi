create or replace function public.assign_booking_fulfillment_branch()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resolved_branch uuid;
begin
  resolved_branch := null;
  if new.vehicle_id is not null then
    select v.branch_id into resolved_branch from public.vehicles v where v.id = new.vehicle_id;
  elsif new.tour_id is not null then
    select t.branch_id into resolved_branch from public.tours t where t.id = new.tour_id;
  end if;
  if resolved_branch is not null then
    new.fulfillment_branch_id := resolved_branch;
  elsif new.booking_type in ('RENTAL', 'SALE_INQUIRY', 'TOUR') then
    new.fulfillment_branch_id := null;
  end if;
  return new;
end;
$$;
revoke all on function public.assign_booking_fulfillment_branch() from public, anon, authenticated;
drop trigger if exists bookings_assign_fulfillment_branch_trg on public.bookings;
create trigger bookings_assign_fulfillment_branch_trg
before insert or update of vehicle_id, tour_id, fulfillment_branch_id
on public.bookings
for each row execute function public.assign_booking_fulfillment_branch();
create index if not exists bookings_fulfillment_branch_idx on public.bookings (fulfillment_branch_id, status, created_at desc);
