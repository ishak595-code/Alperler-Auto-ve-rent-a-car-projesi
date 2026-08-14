-- Verified campaign media from Wikimedia Commons with explicit attribution metadata.
-- Vehicle photos are representative model images, not photos of the physical Alperler fleet units.

update public.campaigns
set cover_image='https://upload.wikimedia.org/wikipedia/commons/7/7f/Mercedes-Benz_Vito_W447_Facelift_Sanming_02_2022-11-14.jpg',
    metadata = metadata || jsonb_build_object(
      'imageAttribution','JamesYoung8167 / Wikimedia Commons',
      'imageLicense','CC BY-SA 4.0',
      'imageSourceUrl','https://commons.wikimedia.org/wiki/File:Mercedes-Benz_Vito_W447_Facelift_Sanming_02_2022-11-14.jpg',
      'representativeImage',true
    ),
    updated_at=now()
where id='f1111111-1111-4111-8111-111111111111';

update public.campaigns
set cover_image='https://upload.wikimedia.org/wikipedia/commons/d/dd/Audi_A3_Sportback_35_TFSI_%282022%29_%2852722207714%29.jpg',
    metadata = metadata || jsonb_build_object(
      'imageAttribution','Charles / Wikimedia Commons',
      'imageLicense','CC BY 2.0',
      'imageSourceUrl','https://commons.wikimedia.org/wiki/File:Audi_A3_Sportback_35_TFSI_(2022)_(52722207714).jpg',
      'representativeImage',true
    ),
    updated_at=now()
where id='f2222222-2222-4222-8222-222222222222';

update public.campaigns
set cover_image='https://upload.wikimedia.org/wikipedia/commons/7/7d/Hakk%C3%A2ri_Cilo_Da%C4%9Flar%C4%B1.jpg',
    metadata = metadata || jsonb_build_object(
      'imageAttribution','Candanozgenkrusa / Wikimedia Commons',
      'imageLicense','CC BY-SA 4.0',
      'imageSourceUrl','https://commons.wikimedia.org/wiki/File:Hakk%C3%A2ri_Cilo_Da%C4%9Flar%C4%B1.jpg',
      'representativeImage',false
    ),
    updated_at=now()
where id='f3333333-3333-4333-8333-333333333333';

insert into public.catalog_media(
  id,vehicle_id,tour_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata
) values
(
  'a1111111-1111-4111-8111-111111111111','16fcb05c-4b4b-4008-920f-b9abf0a7d9ec',null,'IMAGE',
  'https://upload.wikimedia.org/wikipedia/commons/7/7f/Mercedes-Benz_Vito_W447_Facelift_Sanming_02_2022-11-14.jpg',
  'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_Vito_W447_Facelift_Sanming_02_2022-11-14.jpg',
  'Wikimedia Commons','CC BY-SA 4.0','JamesYoung8167','Mercedes-Benz Vito W447 facelift temsili model görseli',90,false,true,
  '{"representative":true,"verifiedModel":"Mercedes-Benz Vito W447 facelift"}'::jsonb
),
(
  'a2222222-2222-4222-8222-222222222222','59278f92-2a37-4aa8-bea4-a886b8459535',null,'IMAGE',
  'https://upload.wikimedia.org/wikipedia/commons/d/dd/Audi_A3_Sportback_35_TFSI_%282022%29_%2852722207714%29.jpg',
  'https://commons.wikimedia.org/wiki/File:Audi_A3_Sportback_35_TFSI_(2022)_(52722207714).jpg',
  'Wikimedia Commons','CC BY 2.0','Charles','Audi A3 Sportback 35 TFSI 2022 temsili model görseli',90,false,true,
  '{"representative":true,"verifiedModel":"Audi A3 Sportback 35 TFSI (2022)"}'::jsonb
),
(
  'a3333333-3333-4333-8333-333333333333',null,'1bc16a0e-3b12-4aef-9137-858d0b68958f','IMAGE',
  'https://upload.wikimedia.org/wikipedia/commons/7/7d/Hakk%C3%A2ri_Cilo_Da%C4%9Flar%C4%B1.jpg',
  'https://commons.wikimedia.org/wiki/File:Hakk%C3%A2ri_Cilo_Da%C4%9Flar%C4%B1.jpg',
  'Wikimedia Commons','CC BY-SA 4.0','Candanozgenkrusa','Hakkâri Cilo Dağları',90,false,true,
  '{"representative":false,"verifiedLocation":"Cilo Dağları, Hakkâri"}'::jsonb
)
on conflict(id) do update set
  vehicle_id=excluded.vehicle_id,tour_id=excluded.tour_id,kind=excluded.kind,external_url=excluded.external_url,
  source_url=excluded.source_url,source_name=excluded.source_name,license=excluded.license,attribution=excluded.attribution,
  alt_text=excluded.alt_text,sort_order=excluded.sort_order,is_cover=excluded.is_cover,is_active=excluded.is_active,
  metadata=excluded.metadata,updated_at=now();
