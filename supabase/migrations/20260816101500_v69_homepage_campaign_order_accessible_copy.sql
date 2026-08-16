-- V69 homepage ordering and customer-facing campaign copy.

update public.homepage_sections
set sort_order = case section_key
  when 'campaigns' then 5
  when 'rental_featured' then 10
  when 'sale_featured' then 20
  when 'tour_featured' then 30
  when 'blog_featured' then 50
  else sort_order end,
  title = case when section_key='campaigns' then 'Planınızı Avantaja Çeviren Fırsatlar' else title end,
  updated_at = now()
where section_key in ('campaigns','rental_featured','sale_featured','tour_featured','blog_featured');

update public.campaigns
set short_description = case id::text
    when 'f4444444-4444-4444-8444-444444444444' then 'Bir haftalık yolculuğunuzdan bir günlük kiralama bedelini çıkarın. Aynı planı daha düşük toplam maliyetle yapın, uygun tarih ve aracı şimdi eşleştirin.'
    when '889781eb-91dd-4323-a1a9-a315170a03f0' then 'Araç, şoför ve süsleme için ayrı ayrı uğraşmayın. Özel gününüzü tek plan ve net kapsamla yönetin, tarih uygunluğunu erkenden kontrol edin.'
    when 'f3333333-3333-4333-8333-333333333333' then 'Cilo yolculuğunda ulaşım ve rota planını bize bırakın. Siz manzaraya ve deneyime odaklanın, avantajlı dönem fiyatıyla uygun tarihi seçin.'
    else short_description end,
  cta_label = case id::text
    when 'f4444444-4444-4444-8444-444444444444' then 'Tarihimi Kontrol Et'
    when '889781eb-91dd-4323-a1a9-a315170a03f0' then 'Tarihi Kontrol Et'
    when 'f3333333-3333-4333-8333-333333333333' then 'Turu Planla'
    else cta_label end,
  updated_at = now()
where id::text in (
  'f4444444-4444-4444-8444-444444444444',
  '889781eb-91dd-4323-a1a9-a315170a03f0',
  'f3333333-3333-4333-8333-333333333333'
);

update public.site_config
set value = jsonb_set(
  coalesce(value,'{}'::jsonb),
  '{homeContent}',
  coalesce(value->'homeContent','{}'::jsonb) || jsonb_build_object(
    'campaignBannerBadge','Seçili Fırsatlar',
    'campaignBannerTitle','Planınızı Avantaja Çevirin',
    'campaignBannerSubtitle','İhtiyacınıza uyan avantajı seçin. Gerçek fiyat farkını, kalan süreyi ve hizmet kapsamını tek bakışta görün.'
  ),
  true
),
updated_at = now()
where key='site_settings';
