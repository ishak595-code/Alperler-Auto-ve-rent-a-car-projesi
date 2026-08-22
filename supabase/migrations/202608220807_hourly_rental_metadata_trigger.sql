create or replace function public.sync_vehicle_hourly_fields()
returns trigger
language plpgsql
as $$
begin
  if new.category = 'RENTAL' then
    if new.metadata ? 'hourlyPrice' and nullif(new.metadata->>'hourlyPrice','') is not null then
      new.rental_price_hourly := greatest(0, (new.metadata->>'hourlyPrice')::numeric);
    end if;
    if new.metadata ? 'hourlyRentalEnabled' then
      new.hourly_rental_enabled := coalesce((new.metadata->>'hourlyRentalEnabled')::boolean, false);
    end if;
    if new.metadata ? 'minimumRentalHours' and nullif(new.metadata->>'minimumRentalHours','') is not null then
      new.minimum_rental_hours := greatest(1, least(23, (new.metadata->>'minimumRentalHours')::smallint));
    end if;
    if new.metadata ? 'hourlyMileageLimit' then
      if nullif(new.metadata->>'hourlyMileageLimit','') is null then
        new.hourly_mileage_limit := null;
      else
        new.hourly_mileage_limit := greatest(0, (new.metadata->>'hourlyMileageLimit')::integer);
      end if;
    end if;

    new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'hourlyPrice', new.rental_price_hourly,
      'hourlyRentalEnabled', new.hourly_rental_enabled,
      'minimumRentalHours', new.minimum_rental_hours,
      'hourlyMileageLimit', new.hourly_mileage_limit
    );
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_sync_hourly_fields on public.vehicles;
create trigger vehicles_sync_hourly_fields
before insert or update on public.vehicles
for each row execute function public.sync_vehicle_hourly_fields();
