-- V39 media alignment: the rental Passat is a 2021 diesel listing.
-- Replace the previous GTE-specific representative image with a neutral B8 facelift sedan photo.

update public.catalog_media cm
set external_url = 'https://upload.wikimedia.org/wikipedia/commons/8/85/Volkswagen_Passat_B8_%282019%29_IMG_2432.jpg',
    source_url = 'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2432.jpg',
    source_name = 'Wikimedia Commons',
    license = 'CC BY-SA 4.0',
    attribution = 'Alexander Migl / Wikimedia Commons',
    alt_text = 'Volkswagen Passat B8 facelift sedan temsili model ailesi görseli',
    metadata = coalesce(cm.metadata, '{}'::jsonb) || jsonb_build_object(
      'verifiedModelFamily', 'Volkswagen Passat B8 Facelift Sedan',
      'mediaScope', 'MODEL_FAMILY_REPRESENTATION',
      'mediaSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where cm.vehicle_id = (
  select id from public.vehicles where stock_code = 'LEGACY-1005' limit 1
)
  and cm.is_active = true
  and cm.kind = 'IMAGE';
