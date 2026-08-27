begin;

create or replace function private.sync_vehicle_hourly_canonical_v1971()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.metadata, '{}'::jsonb);
  old_meta jsonb := case when tg_op = 'UPDATE' then coalesce(old.metadata, '{}'::jsonb) else '{}'::jsonb end;
begin
  if new.category <> 'RENTAL' then
    return new;
  end if;

  if (tg_op = 'INSERT' and meta ? 'hourlyRentalEnabled')
     or (tg_op = 'UPDATE' and (meta -> 'hourlyRentalEnabled') is distinct from (old_meta -> 'hourlyRentalEnabled')) then
    if jsonb_typeof(meta -> 'hourlyRentalEnabled') = 'null' then
      new.hourly_rental_enabled := false;
    elsif jsonb_typeof(meta -> 'hourlyRentalEnabled') = 'boolean' then
      new.hourly_rental_enabled := (meta ->> 'hourlyRentalEnabled')::boolean;
    else
      raise exception 'hourlyRentalEnabled must be a boolean';
    end if;
  else
    meta := jsonb_set(meta, '{hourlyRentalEnabled}', to_jsonb(coalesce(new.hourly_rental_enabled, false)), true);
  end if;

  if (tg_op = 'INSERT' and meta ? 'hourlyPrice')
     or (tg_op = 'UPDATE' and (meta -> 'hourlyPrice') is distinct from (old_meta -> 'hourlyPrice')) then
    if jsonb_typeof(meta -> 'hourlyPrice') = 'null' then
      new.rental_price_hourly := null;
    elsif jsonb_typeof(meta -> 'hourlyPrice') in ('number', 'string') and trim(meta ->> 'hourlyPrice') ~ '^[0-9]+([.][0-9]+)?$' then
      new.rental_price_hourly := (meta ->> 'hourlyPrice')::numeric;
    else
      raise exception 'hourlyPrice must be a non-negative number';
    end if;
  elsif new.rental_price_hourly is null then
    meta := meta - 'hourlyPrice';
  else
    meta := jsonb_set(meta, '{hourlyPrice}', to_jsonb(new.rental_price_hourly), true);
  end if;

  if (tg_op = 'INSERT' and meta ? 'minimumRentalHours')
     or (tg_op = 'UPDATE' and (meta -> 'minimumRentalHours') is distinct from (old_meta -> 'minimumRentalHours')) then
    if jsonb_typeof(meta -> 'minimumRentalHours') = 'null' then
      new.minimum_rental_hours := 1;
    elsif jsonb_typeof(meta -> 'minimumRentalHours') in ('number', 'string') and trim(meta ->> 'minimumRentalHours') ~ '^[0-9]+$' then
      new.minimum_rental_hours := (meta ->> 'minimumRentalHours')::integer;
    else
      raise exception 'minimumRentalHours must be an integer';
    end if;
  else
    meta := jsonb_set(meta, '{minimumRentalHours}', to_jsonb(coalesce(new.minimum_rental_hours, 1)), true);
  end if;

  if (tg_op = 'INSERT' and meta ? 'hourlyMileageLimit')
     or (tg_op = 'UPDATE' and (meta -> 'hourlyMileageLimit') is distinct from (old_meta -> 'hourlyMileageLimit')) then
    if jsonb_typeof(meta -> 'hourlyMileageLimit') = 'null' then
      new.hourly_mileage_limit := null;
    elsif jsonb_typeof(meta -> 'hourlyMileageLimit') in ('number', 'string') and trim(meta ->> 'hourlyMileageLimit') ~ '^[0-9]+$' then
      new.hourly_mileage_limit := (meta ->> 'hourlyMileageLimit')::integer;
    else
      raise exception 'hourlyMileageLimit must be a non-negative integer';
    end if;
  elsif new.hourly_mileage_limit is null then
    meta := meta - 'hourlyMileageLimit';
  else
    meta := jsonb_set(meta, '{hourlyMileageLimit}', to_jsonb(new.hourly_mileage_limit), true);
  end if;

  new.metadata := meta;
  return new;
end;
$$;

revoke all on function private.sync_vehicle_hourly_canonical_v1971() from public, anon, authenticated;

drop trigger if exists vehicles_hourly_canonical_v1971 on public.vehicles;
create trigger vehicles_hourly_canonical_v1971
before insert or update of metadata, category, rental_price_hourly, hourly_rental_enabled, minimum_rental_hours, hourly_mileage_limit
on public.vehicles
for each row
execute function private.sync_vehicle_hourly_canonical_v1971();

alter table public.vehicles
  drop constraint if exists vehicles_hourly_enabled_integrity_v1971_ck;

alter table public.vehicles
  add constraint vehicles_hourly_enabled_integrity_v1971_ck
  check (
    category <> 'RENTAL'
    or hourly_rental_enabled is not true
    or (
      rental_price_hourly is not null
      and rental_price_hourly > 0
      and minimum_rental_hours between 1 and 23
    )
  )
  not valid;

alter table public.vehicles
  validate constraint vehicles_hourly_enabled_integrity_v1971_ck;

commit;
