begin;

-- Canonical initial campaign showroom: three live offers. From this point on,
-- Admin Campaigns is the operational source of truth and keeps homepage
-- placements synchronized automatically.
update public.campaigns
set
  is_active = case
    when slug in (
      '7-gun-kirala-6-gun-ode-renault-megane',
      'gelin-arabasi-ozel-gun-paketi',
      'cilo-daglari-buzullar-uzman-tur-deneyimi'
    ) then true
    else false
  end,
  publication_status = case
    when slug in (
      '7-gun-kirala-6-gun-ode-renault-megane',
      'gelin-arabasi-ozel-gun-paketi',
      'cilo-daglari-buzullar-uzman-tur-deneyimi'
    ) then 'PUBLISHED'
    else 'DRAFT'
  end,
  sort_order = case slug
    when '7-gun-kirala-6-gun-ode-renault-megane' then 0
    when 'gelin-arabasi-ozel-gun-paketi' then 1
    when 'cilo-daglari-buzullar-uzman-tur-deneyimi' then 2
    else sort_order
  end,
  badge = case slug
    when '7-gun-kirala-6-gun-ode-renault-megane' then '7 GÜNDE 1 GÜN BİZDEN'
    when 'gelin-arabasi-ozel-gun-paketi' then 'ÖZEL GÜN • %19 AVANTAJ'
    when 'cilo-daglari-buzullar-uzman-tur-deneyimi' then 'CİLO • %18 YAZ FIRSATI'
    else badge
  end,
  short_description = case slug
    when '7-gun-kirala-6-gun-ode-renault-megane' then '7 günlük kesintisiz kiralamada yalnızca 6 günlük ücret ödeyin. Planınızı uzatın, bir günlük kiralama bedelini cebinizde bırakın.'
    when 'gelin-arabasi-ozel-gun-paketi' then 'Şoförlü premium araç ve profesyonel süsleme tek pakette. Özel gününüzde ulaşım detayını son dakikaya bırakmayın.'
    when 'cilo-daglari-buzullar-uzman-tur-deneyimi' then 'Cilo Dağları ve buzul rotasını profesyonel rehberlik, bölgesel öğle yemeği ve planlı yürüyüş programıyla keşfedin.'
    else short_description
  end,
  metadata = case slug
    when '7-gun-kirala-6-gun-ode-renault-megane' then coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'intent', 'RENTAL',
      'benefits', jsonb_build_array('7 gün kullanım, 6 gün ücret', 'Net 2.800 TL avantaj', '31 Ekim 2026’ya kadar geçerli'),
      'trustLine', 'Gerçek fiyat avantajı • Araç müsaitliğine tabi • Gizli ücret yok',
      'priceLabel', '7 günlük kampanya fiyatı',
      'priceSuffix', '7 günlük paket'
    )
    when 'gelin-arabasi-ozel-gun-paketi' then coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'intent', 'WEDDING',
      'benefits', jsonb_build_array('Şoförlü premium hizmet', 'Profesyonel araç süslemesi', '1.500 TL paket avantajı'),
      'trustLine', 'Başlangıç fiyatı açık • Kapsam net • Tarih uygunluğuna tabi',
      'priceLabel', 'Özel gün paket fiyatı',
      'priceSuffix', 'özel gün paketi'
    )
    when 'cilo-daglari-buzullar-uzman-tur-deneyimi' then coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'intent', 'TOUR',
      'benefits', jsonb_build_array('Profesyonel rehberli rota', 'Bölgesel öğle yemeği dahil', '1.000 TL kişi başı avantaj'),
      'trustLine', 'Gerçek rota • Şeffaf kişi başı fiyat • Hava ve güvenlik koşullarına tabi',
      'priceLabel', 'Tur fırsat fiyatı',
      'priceSuffix', 'kişi başı'
    )
    else metadata
  end,
  updated_at = now()
where slug in (
  '7-gun-kirala-6-gun-ode-renault-megane',
  'gelin-arabasi-ozel-gun-paketi',
  'mercedes-vito-vip-soforlu-premium-kiralama',
  'audi-a3-sportback-2-yil-garantili-firsat',
  'cilo-daglari-buzullar-uzman-tur-deneyimi'
);

delete from public.homepage_placements
where section_key = 'campaigns'
  and entity_type = 'CAMPAIGN';

insert into public.homepage_placements (
  section_key,
  entity_type,
  entity_id,
  label,
  sort_order,
  is_active,
  starts_at,
  ends_at,
  metadata
)
select
  'campaigns',
  'CAMPAIGN',
  id,
  case slug
    when '7-gun-kirala-6-gun-ode-renault-megane' then '1 Gün Bizden'
    when 'gelin-arabasi-ozel-gun-paketi' then 'Özel Gün Fırsatı'
    else 'Cilo Tur Fırsatı'
  end,
  case slug
    when '7-gun-kirala-6-gun-ode-renault-megane' then 1
    when 'gelin-arabasi-ozel-gun-paketi' then 2
    else 3
  end,
  true,
  starts_at,
  ends_at,
  jsonb_build_object('managedBy', 'admin_campaigns')
from public.campaigns
where slug in (
  '7-gun-kirala-6-gun-ode-renault-megane',
  'gelin-arabasi-ozel-gun-paketi',
  'cilo-daglari-buzullar-uzman-tur-deneyimi'
);

update public.homepage_sections
set
  title = 'Avantajı Şimdi Yakalayın',
  max_items = 3,
  settings = jsonb_set(
    jsonb_set(
      coalesce(settings, '{}'::jsonb),
      '{layout}',
      '"premium_campaign_cards"'::jsonb,
      true
    ),
    '{showCountdown}',
    'true'::jsonb,
    true
  ),
  updated_at = now()
where section_key = 'campaigns';

update public.site_config
set
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      coalesce(value, '{}'::jsonb),
                      '{homeContent,heroTrustLine}',
                      to_jsonb('ŞEFFAF FİYAT • DOĞRU ARAÇ • YEREL DESTEK'::text),
                      true
                    ),
                    '{homeContent,heroTitle}',
                    to_jsonb('Yüksekova’da Doğru Aracı Bulun, Yolculuğunuza Güvenle Başlayın'::text),
                    true
                  ),
                  '{homeContent,heroSubtitle}',
                  to_jsonb('Kiralama, satış ve seçili Cilo rotalarını tek yerde karşılaştırın. Tarihinizi seçin, net fiyatı görün ve size uygun seçeneğe hızlıca ulaşın.'::text),
                  true
                ),
                '{homeContent,heroCta}',
                to_jsonb('Uygun Seçenekleri Bul'::text),
                true
              ),
              '{homeContent,heroCtaSubtext}',
              to_jsonb('Tarih ve teslim noktanızı seçin; müsait seçenekleri doğrudan karşılaştırın.'::text),
              true
            ),
            '{homeContent,campaignBannerBadge}',
            to_jsonb('SEÇİLMİŞ FIRSATLAR'::text),
            true
          ),
          '{homeContent,campaignBannerSubtitle}',
          to_jsonb('Gerçek indirimleri, özel gün paketlerini ve Cilo tur fırsatlarını tek bakışta karşılaştırın. Süresi dolmadan size uygun avantajı değerlendirin.'::text),
          true
        ),
        '{homeContent,campaignBannerButtonText}',
        to_jsonb('Fırsatı İncele'::text),
        true
      ),
      '{homeContent,partnerTitle}',
      to_jsonb('Aracınız beklemesin, kazanca dönüşsün'::text),
      true
    ),
    '{homeContent,partnerSubtitle}',
    to_jsonb('Aracınız için değerlendirme veya iş ortaklığı başvurusu oluşturun; süreci ekibimiz sizinle birlikte netleştirsin.'::text),
    true
  ),
  updated_at = now()
where key = 'site_settings';

commit;
