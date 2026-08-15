update public.site_config
set value = jsonb_set(
      case
        when coalesce(value->>'seoOgImage', '') = '' then jsonb_set(value, '{seoOgImage}', to_jsonb('https://images.unsplash.com/photo-1503376713028-98e6cd35549d?q=82&w=2200&auto=format&fit=crop'::text), true)
        else value
      end,
      '{homeContent}',
      jsonb_build_object(
        'heroCtaSubtext', 'Canlı katalog ve aktif teslim noktalarıyla uygun seçeneği hızla bulun.',
        'quickActionLabel', 'Hızlı Erişim',
        'quickActionRentTitle', 'Kiralık Araçlar',
        'quickActionRentDesc', 'Güncel kiralık filoyu ve müsait araçları inceleyin.',
        'quickActionSalesTitle', 'Satılık Araçlar',
        'quickActionSalesDesc', 'Güncel satış ilanlarını ve araç detaylarını karşılaştırın.',
        'quickActionToursTitle', 'Turlar',
        'quickActionToursDesc', 'Hakkari ve Yüksekova çevresindeki seçili rotaları keşfedin.',
        'quickActionSellTitle', 'Aracımı Değerlendir',
        'quickActionSellDesc', 'Araç değerlendirme ve iş ortaklığı başvurusu oluşturun.',
        'featuredBadge', 'Kiralama Filosu',
        'featuredSubtitle', 'Müsait kiralık araçları, güncel fiyatları ve araç detaylarını karşılaştırın.',
        'featuredViewAll', 'Tüm Kiralık Araçlar',
        'salesBadge', 'Satış Galerisi',
        'salesDescription', 'Satıştaki araçları, teknik detayları ve ilan bilgilerini tek yerde inceleyin.',
        'salesViewAll', 'Tüm Satılık Araçlar',
        'toursSubtitle', 'Bölgenin seçili rotalarını, buluşma noktalarını ve tur detaylarını inceleyin.',
        'toursViewAll', 'Tüm Turlar',
        'toursBookBtn', 'Turu İncele',
        'partnerTitle', 'Aracınız kazanca dönüşsün',
        'partnerSubtitle', 'Aracınızı değerlendirme veya iş ortaklığı sürecini güvenli başvuru formumuzdan başlatın.'
      ) || coalesce(value->'homeContent', '{}'::jsonb),
      true
    ),
    updated_at = now()
where key = 'site_settings';
