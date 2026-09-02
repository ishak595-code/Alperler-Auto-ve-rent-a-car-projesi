-- V237 complimentary plan semantics.
-- START is not a normal self-serve/public acquisition tier. It is a discretionary
-- Super Admin grant and carries exactly one active publication slot across vehicles+tours.

update public.branch_subscription_plans
set entitlements = jsonb_set(
      jsonb_set(coalesce(entitlements,'{}'::jsonb), '{listingLimit}', '1'::jsonb, true),
      '{adminGrantOnly}', 'true'::jsonb, true
    ),
    short_description = 'Super Admin inisiyatifiyle tanımlanabilen ücretsiz şube hakkı. Toplam 1 aktif araç veya tur ilanı yayınlanabilir.',
    sales_copy = jsonb_build_object(
      'headline','Super Admin tarafından tanımlanan tek ilanlık ücretsiz hak',
      'benefits',jsonb_build_array(
        'Toplam 1 aktif araç veya tur ilanı',
        'Taslak ve merkez incelemesi aktif ilan kotasını tüketmez',
        'Yalnız Super Admin inisiyatifiyle şubeye tanımlanır'
      )
    ),
    updated_at = now()
where code = 'START';

comment on table public.branch_subscription_plans is
  'Branch subscription plans. Plans may carry entitlements.adminGrantOnly=true; those plans are discretionary administrative grants and must not be presented as normal public/self-serve acquisition options.';
