-- V68 homepage content/order contract. Data-only migration.

update public.homepage_sections
set sort_order = case section_key
      when 'rental_featured' then 10
      when 'sale_featured' then 20
      when 'tour_featured' then 30
      when 'campaigns' then 40
      when 'blog_featured' then 50
      else sort_order
    end,
    title = case when section_key = 'campaigns' then 'Planınıza Değer Katan Fırsatlar' else title end,
    updated_at = now()
where section_key in ('rental_featured','sale_featured','tour_featured','campaigns','blog_featured');

update public.campaigns
set short_description = case id::text
      when 'f4444444-4444-4444-8444-444444444444' then 'Yedi günlük planınızı altı günlük kiralama bedeliyle tamamlayın. Tarihinizi seçin, toplam avantajı görün ve size uygun aracı erkenden planlayın.'
      when '889781eb-91dd-4323-a1a9-a315170a03f0' then 'Özel gününüzde araç, şoför ve süsleme koordinasyonunu tek pakette toplayın. Tarih uygunluğunu şimdi kontrol edin, son gün stresini azaltın.'
      when 'f3333333-3333-4333-8333-333333333333' then 'Cilo rotasını ulaşım ve planlama belirsizliğiyle uğraşmadan keşfedin. Yaz dönemi avantajlı fiyatını görün ve size uygun tarihi seçin.'
      else short_description
    end,
    updated_at = now()
where id::text in (
  'f4444444-4444-4444-8444-444444444444',
  '889781eb-91dd-4323-a1a9-a315170a03f0',
  'f3333333-3333-4333-8333-333333333333'
);

update public.site_config
set value = jsonb_set(
      jsonb_set(coalesce(value,'{}'::jsonb), '{tagline}', to_jsonb('Kiralama • Satış • Tur'::text), true),
      '{homeContent}',
      coalesce(value->'homeContent','{}'::jsonb) || jsonb_build_object(
        'heroTrustLine','YÜKSEKOVA • HAKKARİ',
        'heroTitle','Aracınızı seçin. Rotanızı belirleyin. Yola güvenle çıkın.',
        'heroSubtitle','Kiralama, satış ve bölgesel tur seçeneklerini tek yerde karşılaştırın. Tarihinize ve ihtiyacınıza uyan seçeneği doğrudan bulun.',
        'bookingTitle','Yolculuğunuzu Planlayın',
        'campaignBannerBadge','FIRSATLAR',
        'campaignBannerSubtitle','İhtiyacınıza gerçekten uyan avantajı seçin. Fiyat farkını, bitiş tarihini ve hizmet kapsamını tek bakışta görün.'
      ),
      true
    ),
    updated_at = now()
where key='site_settings';
