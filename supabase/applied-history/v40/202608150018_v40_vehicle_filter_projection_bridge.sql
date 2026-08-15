-- V40: keep technical filter fields available to the public catalog adapter.
-- The legacy-compatible catalog endpoint spreads vehicles.metadata into the
-- public Vehicle shape. Canonical values remain in first-class table columns;
-- this trigger mirrors only the fields that the public filter contract needs
-- until the legacy adapter is fully retired.

create or replace function public.sync_vehicle_filter_projection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.metadata := coalesce(new.metadata, '{}'::jsonb);

  if new.doors is null then
    new.metadata := new.metadata - 'doors';
  else
    new.metadata := jsonb_set(new.metadata, '{doors}', to_jsonb(new.doors), true);
  end if;

  return new;
end;
$$;

revoke all on function public.sync_vehicle_filter_projection() from public;

drop trigger if exists trg_vehicle_filter_projection on public.vehicles;
create trigger trg_vehicle_filter_projection
before insert or update of doors, metadata
on public.vehicles
for each row execute function public.sync_vehicle_filter_projection();

-- Backfill the current catalog through the same canonical values.
update public.vehicles
set metadata = case
  when doors is null then coalesce(metadata, '{}'::jsonb) - 'doors'
  else jsonb_set(coalesce(metadata, '{}'::jsonb), '{doors}', to_jsonb(doors), true)
end,
updated_at = now();
