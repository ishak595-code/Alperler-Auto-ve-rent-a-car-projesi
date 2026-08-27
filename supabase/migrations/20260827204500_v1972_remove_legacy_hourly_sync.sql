begin;

drop trigger if exists vehicles_sync_hourly_fields on public.vehicles;
drop function if exists public.sync_vehicle_hourly_fields();

commit;
