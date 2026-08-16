-- V70 customer homepage flow.
-- Keeps the homepage order database-first, adds dynamic branches and partner sections,
-- and persists concise customer-facing campaign/planner copy.

insert into public.homepage_sections(section_key,title,section_type,is_enabled,sort_order,max_items,settings,updated_at)
values
  ('branches','Şubelerimiz','CUSTOM',true,35,3,'{}'::jsonb,now()),
  ('partner','Aracınızı Değerlendirin','CUSTOM',true,40,1,'{}'::jsonb,now())
on conflict(section_key) do update set
  title=excluded.title,
  section_type=excluded.section_type,
  is_enabled=true,
  sort_order=excluded.sort_order,
  max_items=excluded.max_items,
  updated_at=now();

update public.homepage_sections
set sort_order = case section_key
  when 'campaigns' then 5
  when 'rental_featured' then 10
  when 'sale_featured' then 20
  when 'tour_featured' then 30
  when 'branches' then 35
  when 'partner' then 40
  when 'blog_featured' then 50
  else sort_order end,
  updated_at=now()
where section_key in ('campaigns','rental_featured','sale_featured','tour_featured','branches','partner','blog_featured');

update public.homepage_sections
set title='Planınızı Avantaja Çeviren Fırsatlar', updated_at=now()
where section_key='campaigns';

update public.campaigns
set short_description = case id::text
    when 'f4444444-4444-4444-8444-444444444444' then '7 gün kullan, 6 gün öde. Tarihini seç, uygun aracı gör; bir günlük kiralama bedeli cebinde kalsın.'
    when '889781eb-91dd-4323-a1a9-a315170a03f0' then 'Araç, şoför ve süslemeyi tek pakette planla. Tarihini erkenden ayır, son gün koşturmasını azalt.'
    when 'f3333333-3333-4333-8333-333333333333' then 'Ulaşım ve rota planını tek noktadan çöz. Tarihini seç, Cilo deneyimine odaklan.'
    else short_description end,
  cta_label = case id::text
    when 'f4444444-4444-4444-8444-444444444444' then 'Tarihimi Kontrol Et'
    when '889781eb-91dd-4323-a1a9-a315170a03f0' then 'Tarihi Kontrol Et'
    when 'f3333333-3333-4333-8333-333333333333' then 'Turu Planla'
    else cta_label end,
  updated_at=now()
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
    'bookingTitle','5 Dakikada Planını Netleştir',
    'campaignBannerBadge','Seçili Fırsatlar',
    'campaignBannerTitle','Planınızı Avantaja Çevirin',
    'campaignBannerSubtitle','Ne kazanacağınızı ilk bakışta görün. Tarihinizi seçin ve size uyan fırsatı planınıza ekleyin.',
    'featuredSubtitle','Müsait araçları ve günlük fiyatları karşılaştırın. Tarihinize uyan aracı hızlıca seçin.',
    'salesDescription','İlanları, teknik bilgileri ve fiyatları karşılaştırın. Beğendiğiniz aracı doğrudan açın.',
    'toursSubtitle','Rotayı, buluşma noktasını ve tur kapsamını karşılaştırın. Size uyan tarihi seçin.'
  ),
  true
), updated_at=now()
where key='site_settings';
