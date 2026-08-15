insert into public.catalog_media (tour_id, kind, external_url, source_url, source_name, license, attribution, alt_text, sort_order, is_cover, is_active, metadata)
select * from (values
('e901d206-2987-475f-be06-63cf1ad7201c'::uuid,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Baston%20ustas%C4%B1.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Baston_ustas%C4%B1.jpg','Wikimedia Commons','CC BY-SA 4.0','Mkrc85 / Wikimedia Commons','Çukurca Gündeş köyünde geleneksel yaşam ve baston ustası',2,false,true,'{"sourceVerified":true,"location":"Gündeş, Çukurca, Hakkari"}'::jsonb),
('fe3b0ba2-061f-4f4b-b3d9-92618c086e30'::uuid,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Semdinli%20Hakkari.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Semdinli_Hakkari.jpg','Wikimedia Commons','Public Domain','Sabri76 / Wikimedia Commons','Şemdinli şehir ve vadi görünümü',2,false,true,'{"sourceVerified":true,"location":"Şemdinli, Hakkari"}'::jsonb),
('ad3214ae-5644-422e-9b84-413ba8d29093'::uuid,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Hakkari.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Hakkari.jpg','Wikimedia Commons','Public Domain (VOA)','Voice of America / Wikimedia Commons','Hakkari şehir görünümü',2,false,true,'{"sourceVerified":true,"location":"Hakkari Merkez"}'::jsonb)
) as v(tour_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
where not exists (
  select 1 from public.catalog_media cm
  where cm.tour_id = v.tour_id and cm.source_url = v.source_url
);
