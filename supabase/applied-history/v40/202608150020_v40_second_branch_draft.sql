-- V40: create the requested second branch as an admin-visible draft.
-- It stays inactive until exact public operating details are confirmed in the
-- admin panel. This prevents unverified phone/hours from being shown to users.

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
values (
  'Yeşiltaş Operasyon Noktası',
  'YESILTAS-OPS',
  'DELIVERY_POINT',
  'Yeşiltaş, Yüksekova / Hakkari',
  'Yüksekova',
  'Hakkari',
  'Türkiye',
  null,
  null,
  'alperlerauto@gmail.com',
  '{}'::jsonb,
  '["Araç teslim alma", "Araç iade", "Tur buluşma noktası"]'::jsonb,
  false,
  20,
  null,
  false,
  false
)
on conflict (code) do update set
  name = excluded.name,
  branch_type = excluded.branch_type,
  address_line = excluded.address_line,
  district = excluded.district,
  city = excluded.city,
  country = excluded.country,
  email = coalesce(public.branches.email, excluded.email),
  services = excluded.services,
  sort_order = excluded.sort_order,
  updated_at = now();
