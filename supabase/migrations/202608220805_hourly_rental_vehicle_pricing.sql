alter table public.vehicles
  add column if not exists rental_price_hourly numeric,
  add column if not exists hourly_rental_enabled boolean not null default false,
  add column if not exists minimum_rental_hours smallint not null default 1,
  add column if not exists hourly_mileage_limit integer;

alter table public.vehicles drop constraint if exists vehicles_rental_price_hourly_check;
alter table public.vehicles add constraint vehicles_rental_price_hourly_check check (rental_price_hourly is null or rental_price_hourly >= 0);
alter table public.vehicles drop constraint if exists vehicles_minimum_rental_hours_check;
alter table public.vehicles add constraint vehicles_minimum_rental_hours_check check (minimum_rental_hours between 1 and 23);
alter table public.vehicles drop constraint if exists vehicles_hourly_mileage_limit_check;
alter table public.vehicles add constraint vehicles_hourly_mileage_limit_check check (hourly_mileage_limit is null or hourly_mileage_limit >= 0);

update public.vehicles
set hourly_rental_enabled = true,
    rental_price_hourly = coalesce(rental_price_hourly, round(coalesce(rental_price_daily, price, 0) / 8.0, 2)),
    minimum_rental_hours = greatest(1, least(23, coalesce(minimum_rental_hours, 1)))
where category = 'RENTAL'
  and is_active = true
  and coalesce(rental_price_daily, price, 0) > 0;

create index if not exists vehicles_hourly_rental_public_idx
  on public.vehicles (hourly_rental_enabled, publication_status, availability_status)
  where category = 'RENTAL' and is_active = true;
