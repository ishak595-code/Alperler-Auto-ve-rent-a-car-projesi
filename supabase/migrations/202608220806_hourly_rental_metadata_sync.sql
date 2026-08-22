update public.vehicles
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'hourlyPrice', rental_price_hourly,
  'hourlyRentalEnabled', hourly_rental_enabled,
  'minimumRentalHours', minimum_rental_hours,
  'hourlyMileageLimit', hourly_mileage_limit
)
where category = 'RENTAL';
