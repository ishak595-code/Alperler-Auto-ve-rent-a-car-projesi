-- Three truthful, conversion-focused campaigns based on existing catalog records.
-- No fabricated stock counters, reviews or markdown prices are used.

insert into public.campaigns (
  id,title,slug,short_description,description,badge,campaign_type,cover_image,
  new_price,target_type,target_id,cta_label,cta_url,whatsapp_message,
  starts_at,ends_at,publication_status,is_active,sort_order,metadata
) values
(
  'f1111111-1111-4111-8111-111111111111',
  'Mercedes Vito VIP | Şoförlü Premium Kiralama',
  'mercedes-vito-vip-soforlu-premium-kiralama',
  'Kalabalık aile, iş grubu ve özel transferler için VIP iç tasarım, deri koltuk, TV ve buzdolabı tek pakette.',
  'Konforu sonradan eklemek yerine yolculuğa baştan dahil edin. Mercedes Vito VIP, şoförlü hizmet ve geniş iç hacmiyle uzun yol, havalimanı ve özel gün transferlerinde güçlü bir premium seçenek.',
  'VIP KİRALAMA FIRSATI',
  'CUSTOM',
  'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
  8500,
  'VEHICLE','16fcb05c-4b4b-4008-920f-b9abf0a7d9ec',
  'Hemen Kirala','/fleet/1002',
  'Merhaba, Mercedes Vito VIP kampanyası için kiralama bilgisi almak istiyorum.',
  '2026-08-14T00:00:00+03','2026-09-15T23:59:59+03','PUBLISHED',true,1,
  '{"benefits":["Şoförlü VIP hizmet","TV ve buzdolabı","Geniş grup konforu"],"intent":"RENTAL","trustLine":"Şeffaf günlük fiyat • Hızlı talep • Premium hizmet"}'::jsonb
),
(
  'f2222222-2222-4222-8222-222222222222',
  'Audi A3 Sportback | 2 Yıl Garantili Fırsat',
  'audi-a3-sportback-2-yil-garantili-firsat',
  'Hatasız-boyasız ekspertiz kaydı, 150 hp motor ve 2 yıl garanti ile karar vermeyi kolaylaştıran net bir satış fırsatı.',
  'Satın alma kararında belirsizliği azaltan üç güçlü veri aynı araçta: hatasız-boyasız kayıt, 2 yıl garanti ve Sportback 35 TFSI donanımı.',
  'SATIŞ FIRSATI',
  'PRICE',
  'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
  2150000,
  'VEHICLE','59278f92-2a37-4aa8-bea4-a886b8459535',
  'Aracı Hemen İncele','/sales/2001',
  'Merhaba, Audi A3 Sportback satış kampanyası hakkında detaylı bilgi almak istiyorum.',
  '2026-08-14T00:00:00+03','2026-09-15T23:59:59+03','PUBLISHED',true,2,
  '{"benefits":["2 yıl garanti","Hatasız ve boyasız","150 hp Sportback"],"intent":"SALE","trustLine":"Ekspertiz bilgisi açık • Garanti bilgisi açık • Fiyat şeffaf"}'::jsonb
),
(
  'f3333333-3333-4333-8333-333333333333',
  'Cilo Dağları & Buzullar | Uzman Tur Deneyimi',
  'cilo-daglari-buzullar-uzman-tur-deneyimi',
  'Günübirlik profesyonel rota, bölgesel öğle yemeği ve buzul alanlarına özel yürüyüş ile Cilo’yu planlı ve güvenli biçimde keşfedin.',
  'Cilo’nun yüksek dağ coğrafyasını tek başına planlama yükü olmadan deneyimleyin. Rehberlik, rota ve temel tur organizasyonu aynı deneyimde birleşir.',
  '2026 YAZ ROTASI',
  'SEASONAL',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
  4500,
  'TOUR','1bc16a0e-3b12-4aef-9137-858d0b68958f',
  'Tura Katıl','/tour/3001',
  'Merhaba, Cilo Dağları ve Buzullar Uzman Turu kampanyası için yer ve program bilgisi almak istiyorum.',
  '2026-08-14T00:00:00+03','2026-09-15T23:59:59+03','PUBLISHED',true,3,
  '{"benefits":["Profesyonel dağ rehberliği","Bölgesel öğle yemeği","Buzul alanı yürüyüşü"],"intent":"TOUR","trustLine":"Planlı rota • Rehberli deneyim • Şeffaf kişi başı fiyat"}'::jsonb
)
on conflict (id) do update set
  title=excluded.title,slug=excluded.slug,short_description=excluded.short_description,
  description=excluded.description,badge=excluded.badge,campaign_type=excluded.campaign_type,
  cover_image=excluded.cover_image,new_price=excluded.new_price,target_type=excluded.target_type,
  target_id=excluded.target_id,cta_label=excluded.cta_label,cta_url=excluded.cta_url,
  whatsapp_message=excluded.whatsapp_message,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
  publication_status=excluded.publication_status,is_active=excluded.is_active,sort_order=excluded.sort_order,
  metadata=excluded.metadata,updated_at=now();

update public.homepage_sections
set max_items=3,is_enabled=true,updated_at=now()
where section_key='campaigns';

delete from public.homepage_placements where section_key='campaigns';

insert into public.homepage_placements(section_key,entity_type,entity_id,sort_order,is_active,metadata)
values
('campaigns','CAMPAIGN','f1111111-1111-4111-8111-111111111111',1,true,'{}'::jsonb),
('campaigns','CAMPAIGN','f2222222-2222-4222-8222-222222222222',2,true,'{}'::jsonb),
('campaigns','CAMPAIGN','f3333333-3333-4333-8333-333333333333',3,true,'{}'::jsonb)
on conflict(section_key,entity_type,entity_id) do update set sort_order=excluded.sort_order,is_active=true,updated_at=now();
