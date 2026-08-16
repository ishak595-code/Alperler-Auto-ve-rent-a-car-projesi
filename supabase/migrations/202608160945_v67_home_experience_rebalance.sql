-- V67 homepage hierarchy and customer-facing copy rebalance.
-- Inventory and tours lead the homepage. Campaigns remain dynamic but secondary.

update public.homepage_sections
set sort_order = case section_key
  when 'rental_featured' then 10
  when 'sale_featured' then 20
  when 'tour_featured' then 30
  when 'campaigns' then 40
  when 'blog_featured' then 50
  else sort_order
end,
title = case when section_key = 'campaigns' then 'Seçili Fırsatlar' else title end,
updated_at = now()
where section_key in ('rental_featured','sale_featured','tour_featured','campaigns','blog_featured');

update public.site_config
set value = jsonb_set(
  value,
  '{homeContent}',
  coalesce(value->'homeContent','{}'::jsonb) || jsonb_build_object(
    'heroTrustLine','YÜKSEKOVA • HAKKARİ',
    'heroTitle','Aracınızı seçin. Rotanızı belirleyin. Yola güvenle çıkın.',
    'heroSubtitle','Şoförlü veya şoförsüz kiralama, satılık araçlar ve seçili bölge turları. Teslim noktasını ve tarihi seçin, size uygun seçenekleri doğrudan görün.',
    'bookingTitle','Yolculuğu Buradan Başlat',
    'heroCta','Uygun Araçları Göster',
    'heroCtaSubtext','Şoför tercihinizi, tarihi ve teslim noktasını seçin.',
    'quickActionRentTitle','Şoförsüz Kiralama',
    'campaignBannerBadge','Fırsatlar',
    'campaignBannerSubtitle','Kiralama, özel gün ve tur seçeneklerinde gerçek fiyat avantajlarını karşılaştırın. Bitiş tarihi ve koşullar açıkça gösterilir.',
    'campaignBannerButtonText','Fırsatı İncele'
  ),
  true
),
updated_at = now()
where key = 'site_settings';

update public.campaigns
set short_description = 'Şoförlü araç ve profesyonel süsleme tek pakette. Özel gününüzde ulaşımı son dakikaya bırakmayın.',
    updated_at = now()
where id = '889781eb-91dd-4323-a1a9-a315170a03f0';

update public.campaigns
set title = 'Mercedes Vito VIP | Şoförlü Kiralama',
    description = replace(description, 'güçlü bir premium seçenek', 'güçlü ve konforlu bir seçenek'),
    updated_at = now()
where id = 'f1111111-1111-4111-8111-111111111111';
