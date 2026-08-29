-- V210: premium lower-funnel conversion without introducing parallel content/navigation owners.
BEGIN;

-- The blog source is already ordered by published_at DESC. Mark this section as automatic so
-- stale manual placements cannot pin old articles into the three-card homepage preview.
UPDATE public.homepage_sections
SET max_items = 3,
    settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
      'selectionMode', 'LATEST',
      'viewAllLabel', COALESCE(NULLIF(settings->>'viewAllLabel',''), 'Tüm Yazılar'),
      'viewAllUrl', '/blog'
    ),
    updated_at = now()
WHERE section_key = 'blog_featured';

-- A database-managed closing conversion block. Existing homepage admin can edit title, copy,
-- background image, CTA, width, theme and device visibility through the canonical section owner.
INSERT INTO public.homepage_sections (
  section_key, title, section_type, is_enabled, sort_order, max_items, settings, updated_at
)
VALUES (
  'closing_cta',
  'Yolculuğunuzu Birlikte Planlayalım',
  'CUSTOM',
  true,
  60,
  1,
  jsonb_build_object(
    'renderer', 'PROMO',
    'badge', 'ALPERLER RENT A CAR',
    'description', 'Hakkari ve Yüksekova’da kiralama, özel gün aracı ve rota planınızı tek noktadan oluşturun. Uygun seçeneği birlikte netleştirip rezervasyonunuzu güvenle başlatın.',
    'layout', 'wide',
    'width', 'full',
    'theme', 'dark',
    'backgroundImage', 'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/tour/c2981d9a-60df-4979-ab72-1348f89f1ade/v124-01-c7222a42-e07c-4609-b367-5fb9216683e3.jpg',
    'ctaLabel', 'Rezervasyon Oluştur',
    'ctaUrl', '/appointment',
    'showOnMobile', true,
    'showOnTablet', true,
    'showOnDesktop', true
  ),
  now()
)
ON CONFLICT (section_key) DO UPDATE SET
  title = EXCLUDED.title,
  section_type = EXCLUDED.section_type,
  is_enabled = EXCLUDED.is_enabled,
  sort_order = EXCLUDED.sort_order,
  max_items = EXCLUDED.max_items,
  settings = COALESCE(public.homepage_sections.settings, '{}'::jsonb) || EXCLUDED.settings,
  updated_at = now();

-- Keep one five-item canonical mobile dock. The central search slot becomes the primary booking
-- action; no second sticky bar or duplicated navigation source is introduced.
DO $$
DECLARE
  v_appointment_id uuid;
  v_search_id uuid;
BEGIN
  SELECT id INTO v_appointment_id
  FROM public.navigation_items
  WHERE surface = 'MOBILE_DOCK' AND item_key = 'appointment'
  ORDER BY archived_at NULLS FIRST, updated_at DESC
  LIMIT 1;

  SELECT id INTO v_search_id
  FROM public.navigation_items
  WHERE surface = 'MOBILE_DOCK' AND item_key = 'search'
  ORDER BY archived_at NULLS FIRST, updated_at DESC
  LIMIT 1;

  IF v_appointment_id IS NOT NULL THEN
    UPDATE public.navigation_items
    SET label = 'Rezervasyon', icon = 'event_available', route = '/appointment', sort_order = 30,
        is_active = true, archived_at = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || '{"primary":true}'::jsonb,
        updated_at = now()
    WHERE id = v_appointment_id;

    IF v_search_id IS NOT NULL AND v_search_id <> v_appointment_id THEN
      UPDATE public.navigation_items
      SET is_active = false, archived_at = COALESCE(archived_at, now()), updated_at = now()
      WHERE id = v_search_id;
    END IF;
  ELSIF v_search_id IS NOT NULL THEN
    UPDATE public.navigation_items
    SET item_key = 'appointment', label = 'Rezervasyon', icon = 'event_available', route = '/appointment',
        sort_order = 30, is_active = true, archived_at = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || '{"primary":true}'::jsonb,
        updated_at = now()
    WHERE id = v_search_id;
  ELSE
    INSERT INTO public.navigation_items(surface,item_key,label,icon,route,sort_order,is_active,metadata)
    VALUES ('MOBILE_DOCK','appointment','Rezervasyon','event_available','/appointment',30,true,'{"primary":true}'::jsonb);
  END IF;
END
$$;

COMMIT;
