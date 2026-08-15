-- V40: keep model-family research distinct from physical-unit verification
-- and ensure the production branch model is immediately usable.

begin;

update public.vehicles
set actual_vehicle_verified = false,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'physicalUnitVerification', 'PENDING_REAL_UNIT_EVIDENCE',
      'mediaRepresentation', 'MODEL_FAMILY_REPRESENTATION',
      'verificationNote', 'Current catalog media represents the model family. Physical unit verification requires business-owned vehicle evidence.'
    ),
    updated_at = now()
where stock_code like 'LEGACY-%';

insert into public.branches (
  name,
  code,
  branch_type,
  address_line,
  district,
  city,
  country,
  phone,
  whatsapp,
  email,
  opening_hours,
  services,
  is_active,
  sort_order,
  map_url,
  is_pickup_point,
  is_return_point
)
select
  'Yüksekova Merkez',
  'YUKSEKOVA',
  'BRANCH',
  'Hakkari Yüksekova Merkez',
  'Yüksekova',
  'Hakkari',
  'Türkiye',
  '0537 959 48 51',
  '905379594851',
  'alperlerauto@gmail.com',
  '{}'::jsonb,
  '["Kiralık araç", "Satılık araç", "Tur buluşma noktası"]'::jsonb,
  true,
  1,
  'https://www.google.com/maps?q=Y%C3%BCksekova%20Hakkari',
  true,
  true
where not exists (
  select 1 from public.branches where code = 'YUKSEKOVA'
);

update public.vehicles
set branch_id = (select id from public.branches where code = 'YUKSEKOVA' limit 1),
    updated_at = now()
where branch_id is null;

update public.tours
set branch_id = (select id from public.branches where code = 'YUKSEKOVA' limit 1),
    updated_at = now()
where branch_id is null;

commit;
