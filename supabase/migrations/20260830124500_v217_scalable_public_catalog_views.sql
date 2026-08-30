-- V217 bounded public catalog projections for large datasets.
-- All customer-facing views are SECURITY INVOKER so base-table RLS remains authoritative.

create or replace view public.public_vehicle_catalog_v217
with (security_invoker = true)
as
select
  v.id,
  v.stock_code,
  v.category,
  v.brand,
  v.model,
  v.model_year,
  v.price,
  v.currency,
  v.rental_price_daily,
  v.rental_price_hourly,
  v.hourly_rental_enabled,
  v.minimum_rental_hours,
  v.hourly_mileage_limit,
  v.mileage_km,
  v.fuel_type,
  v.transmission,
  v.body_type,
  v.color,
  v.engine,
  v.seats,
  v.doors,
  v.location,
  v.description,
  v.features,
  v.images,
  v.cover_image,
  v.is_featured,
  v.availability_status,
  v.seo_slug,
  v.metadata,
  v.created_at,
  v.updated_at,
  v.publication_status,
  v.published_at,
  v.scheduled_at,
  v.branch_id,
  v.listing_origin,
  v.metadata->>'series' as series,
  v.metadata->>'driverOption' as driver_option,
  v.metadata->>'warranty' as warranty,
  v.metadata->>'damageStatus' as damage_status,
  v.metadata->>'tramerStatus' as tramer_status,
  lower(coalesce(v.metadata->>'hasWarranty','false')) = 'true' as has_warranty,
  lower(coalesce(v.metadata->>'isDamageFree','false')) = 'true' as is_damage_free,
  lower(coalesce(v.metadata->>'isPaintless','false')) = 'true' as is_paintless,
  lower(coalesce(v.metadata->>'isReplaceFree','false')) = 'true' as is_replace_free,
  case when coalesce(v.metadata->>'displayPriority','') ~ '^-?[0-9]+$' then (v.metadata->>'displayPriority')::integer else 0 end as display_priority,
  public.search_join_v217(
    v.id::text, v.stock_code, v.brand, v.model, v.model_year::text, v.fuel_type, v.transmission, v.body_type,
    v.color, v.engine, v.location, v.seo_slug, v.metadata->>'series', v.metadata->>'plate', v.metadata->>'plateNumber',
    v.metadata->>'vehicleNumber', v.metadata->>'vehicleNo', v.metadata->>'vin', v.metadata->>'chassisNumber',
    v.metadata->>'legacyId', v.metadata->>'legacy_id'
  ) as search_text
from public.vehicles v
where v.is_active = true
  and (v.publication_status = 'PUBLISHED' or (v.publication_status = 'SCHEDULED' and v.scheduled_at is not null and v.scheduled_at <= now()))
  and (v.branch_id is null or exists (
    select 1 from public.branches b where b.id = v.branch_id and b.is_active = true and b.public_status = 'ACTIVE'
  ));

revoke all on public.public_vehicle_catalog_v217 from public, anon, authenticated;
grant select on public.public_vehicle_catalog_v217 to anon, authenticated;

create or replace view public.public_tour_catalog_v217
with (security_invoker = true)
as
select
  t.id,
  t.title,
  t.short_description,
  t.description,
  t.price_per_person,
  t.currency,
  t.duration,
  t.capacity,
  t.meeting_point,
  t.itinerary,
  t.included_items,
  t.excluded_items,
  t.cover_image,
  t.images,
  t.is_featured,
  t.seo_slug,
  t.metadata,
  t.created_at,
  t.updated_at,
  t.publication_status,
  t.published_at,
  t.scheduled_at,
  t.latitude,
  t.longitude,
  t.map_url,
  t.category,
  t.location_name,
  t.branch_id,
  t.listing_origin,
  t.metadata->>'badge' as badge,
  public.search_join_v217(
    t.id::text, t.title, t.seo_slug, t.category, t.short_description, t.description, t.duration,
    t.meeting_point, t.location_name, t.metadata->>'badge', t.metadata->>'legacyId', t.metadata->>'legacy_id'
  ) as search_text
from public.tours t
where t.is_active = true
  and (t.publication_status = 'PUBLISHED' or (t.publication_status = 'SCHEDULED' and t.scheduled_at is not null and t.scheduled_at <= now()))
  and (t.branch_id is null or exists (
    select 1 from public.branches b where b.id = t.branch_id and b.is_active = true and b.public_status = 'ACTIVE'
  ));

revoke all on public.public_tour_catalog_v217 from public, anon, authenticated;
grant select on public.public_tour_catalog_v217 to anon, authenticated;

create or replace view public.public_blog_catalog_v217
with (security_invoker = true)
as
select
  b.id,
  b.slug,
  b.title,
  b.excerpt,
  b.content,
  b.cover_image,
  b.author_name,
  b.published_at,
  b.seo_title,
  b.seo_description,
  b.metadata,
  public.search_join_v217(
    b.id::text, b.title, b.slug, b.excerpt, b.author_name, b.seo_title, b.seo_description,
    b.metadata->>'legacyId', b.metadata->>'legacy_id'
  ) as search_text
from public.blog_posts b
where b.status = 'PUBLISHED';

revoke all on public.public_blog_catalog_v217 from public, anon, authenticated;
grant select on public.public_blog_catalog_v217 to anon, authenticated;

create or replace view public.public_campaign_catalog_v217
with (security_invoker = true)
as
select
  c.id, c.title, c.slug, c.short_description, c.description, c.badge, c.campaign_type, c.cover_image,
  c.old_price, c.new_price, c.discount_percent, c.target_type, c.target_id, c.cta_label, c.cta_url,
  c.whatsapp_message, c.starts_at, c.ends_at, c.publication_status, c.is_active, c.sort_order, c.metadata,
  c.discount_method, c.discount_value, c.discount_scope, c.visibility_mode, c.minimum_order_amount,
  c.minimum_rental_days, c.minimum_rental_hours, c.max_redemptions, c.per_customer_limit,
  c.allow_referral_discount, c.allow_loyalty_redemption, c.priority,
  public.search_join_v217(c.id::text,c.title,c.slug,c.short_description,c.description,c.badge,c.campaign_type,c.cta_label) as search_text
from public.campaigns c
where c.is_active = true
  and (c.publication_status = 'PUBLISHED' or (c.publication_status = 'SCHEDULED' and c.starts_at is not null and c.starts_at <= now()))
  and (c.starts_at is null or c.starts_at <= now())
  and (c.ends_at is null or c.ends_at > now());

revoke all on public.public_campaign_catalog_v217 from public, anon, authenticated;
grant select on public.public_campaign_catalog_v217 to anon, authenticated;

create or replace view public.public_branch_catalog_v217
with (security_invoker = true)
as
select
  b.id, b.name, b.code, b.address_line, b.district, b.city, b.country, b.phone, b.whatsapp, b.email,
  b.opening_hours, b.services, b.sort_order, b.map_url, b.is_pickup_point, b.is_return_point, b.slug,
  b.network_type, b.territory_label, b.public_description, b.hero_image, b.operator_display_name, b.operator_legal_name
from public.branches b
where b.is_active = true and b.public_status = 'ACTIVE';

revoke all on public.public_branch_catalog_v217 from public, anon, authenticated;
grant select on public.public_branch_catalog_v217 to anon, authenticated;

create index if not exists vehicles_public_recommended_page_v217
  on public.vehicles (category, is_active, publication_status, is_featured desc, published_at desc, id)
  where is_active = true;
create index if not exists vehicles_public_daily_price_page_v217
  on public.vehicles (category, is_active, publication_status, rental_price_daily, id)
  where is_active = true and category = 'RENTAL';
create index if not exists vehicles_public_hourly_price_page_v217
  on public.vehicles (category, is_active, publication_status, rental_price_hourly, id)
  where is_active = true and category = 'RENTAL' and hourly_rental_enabled = true;
create index if not exists vehicles_public_sale_price_page_v217
  on public.vehicles (category, is_active, publication_status, price, id)
  where is_active = true and category = 'SALE';
create index if not exists vehicles_public_year_page_v217
  on public.vehicles (category, is_active, publication_status, model_year desc, id)
  where is_active = true;
create index if not exists vehicles_public_km_page_v217
  on public.vehicles (category, is_active, publication_status, mileage_km, id)
  where is_active = true and category = 'SALE';
create index if not exists tours_public_recommended_page_v217
  on public.tours (is_active, publication_status, is_featured desc, published_at desc, id)
  where is_active = true;
create index if not exists tours_public_price_page_v217
  on public.tours (is_active, publication_status, price_per_person, id)
  where is_active = true;
