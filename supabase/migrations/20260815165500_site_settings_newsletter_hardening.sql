-- V57: database-first public site settings and durable newsletter subscriptions.
-- Safe for existing production: site_settings is seeded only when missing.

create unique index if not exists subscribers_email_normalized_unique
  on public.subscribers (lower(email));

insert into public.site_config (key, value, is_public, updated_at)
values (
  'site_settings',
  jsonb_build_object(
    'logoUrl', '',
    'logoWidthDesktop', 220,
    'logoWidthMobile', 180,
    'companyName', 'Alperler Auto',
    'tagline', 'Kiralama • Satış • Tur',
    'phone', '0537 959 48 51',
    'email', 'alperlerauto@gmail.com',
    'address', 'Hakkari Yüksekova Merkez',
    'whatsapp', '905379594851',
    'whatsappMessage', 'Merhaba, Alperler Auto araç kiralama, satış veya tur hizmetleri hakkında bilgi almak istiyorum.',
    'instagramUrl', '',
    'twitterUrl', '',
    'facebookUrl', '',
    'tiktokUrl', '',
    'youtubeUrl', '',
    'seoTitle', 'Alperler Auto | Yüksekova Araç Kiralama, Satış ve Turlar',
    'seoKeywords', 'yüksekova araç kiralama, hakkari rent a car, satılık araç, yüksekova turları, vip transfer, alperler auto',
    'seoDescription', 'Alperler Auto ile Yüksekova ve Hakkari çevresinde araç kiralama, ikinci el araç satışı, VIP transfer ve bölgesel tur hizmetlerini tek merkezden yönetin.',
    'seoAuthor', 'Alperler Auto',
    'seoOgTitle', 'Alperler Auto | Kiralama, Satış ve Turlar',
    'seoOgDescription', 'Yüksekova merkezli araç kiralama, ikinci el satış, VIP transfer ve tur çözümleri.',
    'seoOgImage', '',
    'seoTwitterHandle', '',
    'aboutTitle', 'Yüksekova’dan Bölgeye Güvenilir Otomotiv ve Seyahat Çözümleri',
    'team', '[]'::jsonb,
    'theme', 'luxury',
    'homeContent', jsonb_build_object(
      'heroTitle', 'Yüksekova’da Güvenilir Araç Kiralama, Satış ve Turlar',
      'heroSubtitle', 'Kiralık ve satılık araçları karşılaştırın, VIP transfer seçeneklerini inceleyin ve Hakkari’nin seçili rotalarını güvenle keşfedin.',
      'heroTrustLine', 'ŞEFFAF FİYAT • GÜVENİLİR FİLO • YEREL DESTEK',
      'heroCta', 'Araçları İncele',
      'bookingTitle', 'Yolculuğunuzu Planlayın'
    )
  ),
  true,
  now()
)
on conflict (key) do nothing;
