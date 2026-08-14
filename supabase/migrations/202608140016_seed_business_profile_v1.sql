insert into public.site_config (key, value, is_public)
values (
  'business_profile',
  jsonb_build_object(
    'companyName', 'Alperler Auto',
    'phone', '0537 959 48 51',
    'email', 'alperlerauto@gmail.com',
    'address', 'Hakkari Yüksekova Merkez',
    'website', 'https://alperrentacar.online',
    'whatsapp', '905379594851'
  ),
  true
)
on conflict (key) do update
set value = excluded.value,
    is_public = excluded.is_public,
    updated_at = now();
