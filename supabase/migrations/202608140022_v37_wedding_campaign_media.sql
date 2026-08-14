begin;

with wedding_vehicle as (
  select id
  from public.vehicles
  where category = 'RENTAL'
    and (metadata->>'legacyId')::int = 1001
  limit 1
)
update public.vehicles v
set cover_image = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg?width=1600',
    images = jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg?width=1600'),
    metadata = coalesce(v.metadata,'{}'::jsonb) || jsonb_build_object(
      'coverMediaRepresentative', true,
      'coverMediaSourceUrl', 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg',
      'coverMediaLicense', 'CC BY 2.0',
      'coverMediaAttribution', 'Charles / Wikimedia Commons'
    ),
    updated_at = now()
from wedding_vehicle w
where v.id = w.id;

with wedding_vehicle as (
  select id
  from public.vehicles
  where category = 'RENTAL'
    and (metadata->>'legacyId')::int = 1001
  limit 1
)
insert into public.catalog_media (
  id, vehicle_id, kind, external_url, source_url, source_name, license,
  attribution, alt_text, sort_order, is_cover, is_active, metadata
)
select
  gen_random_uuid(), w.id, 'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg',
  'Wikimedia Commons', 'CC BY 2.0', 'Charles',
  'Mercedes-Benz C-Serisi W206 2023 temsili model görseli',
  1, true, true,
  jsonb_build_object('representative',true,'verifiedModelFamily','Mercedes-Benz C-Class W206','verifiedYear',2023)
from wedding_vehicle w
where not exists (
  select 1 from public.catalog_media m
  where m.vehicle_id = w.id
    and m.external_url = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg?width=1600'
);

update public.campaigns
set sort_order = sort_order + 1
where sort_order >= 1
  and slug <> 'gelin-arabasi-ozel-gun-paketi';

with wedding_vehicle as (
  select id, rental_price_daily
  from public.vehicles
  where category = 'RENTAL'
    and (metadata->>'legacyId')::int = 1001
  limit 1
)
insert into public.campaigns (
  id, title, slug, short_description, description, badge, campaign_type,
  cover_image, new_price, target_type, target_id, cta_label, cta_url,
  whatsapp_message, starts_at, ends_at, publication_status, is_active,
  sort_order, metadata
)
select
  gen_random_uuid(),
  'Gelin Arabası | Şoförlü Özel Gün Paketi',
  'gelin-arabasi-ozel-gun-paketi',
  'Süsleme ve şoförlü hizmetle özel gününüz için tek pakette premium ulaşım.',
  '2023 Mercedes-Benz C-Serisi tabanlı özel gün hizmeti. Süsleme ve şoförlü hizmet araç ilanındaki kapsam doğrultusunda sunulur.',
  'ÖZEL GÜN',
  'BUNDLE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg?width=1600',
  w.rental_price_daily,
  'VEHICLE',
  w.id,
  'Paketi İncele',
  '/fleet/1001',
  'Merhaba, gelin arabası özel gün paketi hakkında bilgi ve uygunluk almak istiyorum.',
  now(),
  '2026-09-30 23:59:59+03',
  'PUBLISHED',
  true,
  1,
  jsonb_build_object(
    'intent','WEDDING',
    'benefits',jsonb_build_array('Profesyonel araç süslemesi','Şoförlü VIP hizmet','Özel gün planına uygun hizmet'),
    'trustLine','Başlangıç fiyatı açık • Hizmet kapsamı açık • Hızlı uygunluk kontrolü',
    'priceLabel','Başlangıç fiyatı',
    'priceSuffix','özel gün',
    'imageSourceUrl','https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C-Klasse_(W206)_C_300_(2023)_(53491181737).jpg',
    'imageAttribution','Charles / Wikimedia Commons',
    'imageLicense','CC BY 2.0',
    'representativeImage',true
  )
from wedding_vehicle w
on conflict (slug) do update set
  title=excluded.title,
  short_description=excluded.short_description,
  description=excluded.description,
  badge=excluded.badge,
  campaign_type=excluded.campaign_type,
  cover_image=excluded.cover_image,
  new_price=excluded.new_price,
  target_type=excluded.target_type,
  target_id=excluded.target_id,
  cta_label=excluded.cta_label,
  cta_url=excluded.cta_url,
  whatsapp_message=excluded.whatsapp_message,
  starts_at=excluded.starts_at,
  ends_at=excluded.ends_at,
  publication_status=excluded.publication_status,
  is_active=excluded.is_active,
  sort_order=excluded.sort_order,
  metadata=excluded.metadata,
  updated_at=now();

commit;
