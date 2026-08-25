-- V163.1 advisor cleanup.
-- Tightens executable privileges, removes a duplicate index, adds missing FK
-- indexes for the alternative-offer table, and separates write-only RLS policy
-- from SELECT so operations queries evaluate one fewer permissive policy.

revoke execute on function public.admin_set_customer_status(uuid,text) from anon;
revoke execute on function public.customer_cancel_booking(text) from anon;

alter function public.sync_vehicle_hourly_fields() set search_path = public, pg_catalog;

create index if not exists booking_alternative_original_vehicle_idx
  on public.booking_alternative_offers(original_vehicle_id);
create index if not exists booking_alternative_offered_by_idx
  on public.booking_alternative_offers(offered_by)
  where offered_by is not null;

drop index if exists public.system_events_last_seen_desc_idx;

drop policy if exists booking_alternative_operations_write on public.booking_alternative_offers;

drop policy if exists booking_alternative_operations_insert on public.booking_alternative_offers;
create policy booking_alternative_operations_insert
on public.booking_alternative_offers
for insert
to authenticated
with check ((select private.can_manage_operations()));

drop policy if exists booking_alternative_operations_update on public.booking_alternative_offers;
create policy booking_alternative_operations_update
on public.booking_alternative_offers
for update
to authenticated
using ((select private.can_manage_operations()))
with check ((select private.can_manage_operations()));

drop policy if exists booking_alternative_operations_delete on public.booking_alternative_offers;
create policy booking_alternative_operations_delete
on public.booking_alternative_offers
for delete
to authenticated
using ((select private.can_manage_operations()));
