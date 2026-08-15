begin;

-- The homepage campaign showroom intentionally contains exactly three live items:
-- 1) 7-day rental bundle, 2) wedding/special-day package, 3) Cilo tour.
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
  is_active
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
  true
from public.campaigns
where slug in (
  '7-gun-kirala-6-gun-ode-renault-megane',
  'gelin-arabasi-ozel-gun-paketi',
  'cilo-daglari-buzullar-uzman-tur-deneyimi'
);

update public.homepage_sections
set
  title = 'Sadece Şimdi: Seçilmiş 3 Fırsat',
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
        coalesce(value, '{}'::jsonb),
        '{homeContent,campaignBannerBadge}',
        to_jsonb('3 Seçilmiş Fırsat'::text),
        true
      ),
      '{homeContent,campaignBannerSubtitle}',
      to_jsonb('Kiralama, özel gün ve Cilo tur fırsatlarını şeffaf fiyatlarla inceleyin. Süreli avantajları kaçırmadan size uygun seçeneği değerlendirin.'::text),
      true
    ),
    '{homeContent,campaignBannerButtonText}',
    to_jsonb('Fırsatı İncele'::text),
    true
  ),
  updated_at = now()
where key = 'site_settings';

commit;
