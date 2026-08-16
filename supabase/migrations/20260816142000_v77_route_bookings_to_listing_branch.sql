-- V77 - Route a customer request to the branch that owns the selected listing.

create or replace function public.assign_booking_fulfillment_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_branch uuid;
begin
  if new.fulfillment_branch_id is not null then return new; end if;
  if new.vehicle_id is not null then
    select branch_id into resolved_branch from public.vehicles where id=new.vehicle_id;
  elsif new.tour_id is not null then
    select branch_id into resolved_branch from public.tours where id=new.tour_id;
  end if;
  if resolved_branch is not null then new.fulfillment_branch_id := resolved_branch; end if;
  return new;
end;
$$;

drop trigger if exists bookings_assign_fulfillment_branch_trg on public.bookings;
create trigger bookings_assign_fulfillment_branch_trg
before insert or update of vehicle_id,tour_id,fulfillment_branch_id on public.bookings
for each row execute function public.assign_booking_fulfillment_branch();

update public.bookings b
set fulfillment_branch_id = coalesce(v.branch_id,t.branch_id)
from public.bookings bx
left join public.vehicles v on v.id=bx.vehicle_id
left join public.tours t on t.id=bx.tour_id
where b.id=bx.id
  and b.fulfillment_branch_id is null
  and coalesce(v.branch_id,t.branch_id) is not null;
