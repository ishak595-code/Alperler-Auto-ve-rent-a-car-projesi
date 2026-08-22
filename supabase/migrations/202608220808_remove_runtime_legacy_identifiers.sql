-- Canonicalize vehicle and tour runtime identities.
-- Historical booking audit columns are intentionally preserved, but public/runtime
-- catalog records no longer expose or depend on metadata.legacyId.

update public.vehicles
set metadata = coalesce(metadata, '{}'::jsonb) - 'legacyId'
where coalesce(metadata, '{}'::jsonb) ? 'legacyId';

update public.tours
set metadata = coalesce(metadata, '{}'::jsonb) - 'legacyId'
where coalesce(metadata, '{}'::jsonb) ? 'legacyId';

comment on column public.bookings.legacy_item_id is
'Historical compatibility field only. New runtime booking flows must resolve canonical vehicle_id or tour_id and leave this field null.';
