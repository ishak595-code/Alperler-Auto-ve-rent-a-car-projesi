-- Campaign management + catalog gallery hard limit.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  description text,
  badge text,
  campaign_type text not null default 'CUSTOM' check (campaign_type in ('DISCOUNT','PRICE','BUNDLE','SEASONAL','CUSTOM')),
  cover_image text,
  old_price numeric,
  new_price numeric,
  discount_percent numeric check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  target_type text check (target_type is null or target_type in ('VEHICLE','TOUR','GENERAL')),
  target_id uuid,
  cta_label text not null default 'Detayları Gör',
  cta_url text,
  whatsapp_message text,
  starts_at timestamptz,
  ends_at timestamptz,
  publication_status text not null default 'DRAFT' check (publication_status in ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_date_window_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint campaigns_price_check check (old_price is null or old_price >= 0),
  constraint campaigns_new_price_check check (new_price is null or new_price >= 0)
);
create index if not exists campaigns_public_idx on public.campaigns(publication_status,is_active,sort_order);
create index if not exists campaigns_dates_idx on public.campaigns(starts_at,ends_at);

alter table public.campaigns enable row level security;
drop policy if exists campaigns_public_read on public.campaigns;
create policy campaigns_public_read on public.campaigns for select using (
  (is_active=true and publication_status='PUBLISHED' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()))
  or private.is_admin()
);
drop policy if exists campaigns_admin_insert on public.campaigns;
create policy campaigns_admin_insert on public.campaigns for insert with check (private.is_admin());
drop policy if exists campaigns_admin_update on public.campaigns;
create policy campaigns_admin_update on public.campaigns for update using (private.is_admin()) with check (private.is_admin());
drop policy if exists campaigns_admin_delete on public.campaigns;
create policy campaigns_admin_delete on public.campaigns for delete using (private.is_admin());

alter table public.homepage_placements drop constraint if exists homepage_placements_entity_type_check;
alter table public.homepage_placements add constraint homepage_placements_entity_type_check
  check (entity_type in ('VEHICLE','TOUR','BLOG','CAMPAIGN'));

create or replace function private.validate_homepage_placement_entity()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.entity_type = 'VEHICLE' and not exists (select 1 from public.vehicles where id = new.entity_id) then
    raise exception 'homepage vehicle does not exist';
  elsif new.entity_type = 'TOUR' and not exists (select 1 from public.tours where id = new.entity_id) then
    raise exception 'homepage tour does not exist';
  elsif new.entity_type = 'BLOG' and not exists (select 1 from public.blog_posts where id = new.entity_id) then
    raise exception 'homepage blog does not exist';
  elsif new.entity_type = 'CAMPAIGN' and not exists (select 1 from public.campaigns where id = new.entity_id) then
    raise exception 'homepage campaign does not exist';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_homepage_placement_entity() from public;

-- Enforce at most 30 active media items for any single catalog entity.
create or replace function private.enforce_catalog_media_limit()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  active_count integer;
begin
  if new.is_active is not true then return new; end if;

  if new.vehicle_id is not null then
    select count(*) into active_count from public.catalog_media
      where vehicle_id = new.vehicle_id and is_active = true and id <> coalesce(new.id, gen_random_uuid());
  elsif new.tour_id is not null then
    select count(*) into active_count from public.catalog_media
      where tour_id = new.tour_id and is_active = true and id <> coalesce(new.id, gen_random_uuid());
  elsif new.blog_post_id is not null then
    select count(*) into active_count from public.catalog_media
      where blog_post_id = new.blog_post_id and is_active = true and id <> coalesce(new.id, gen_random_uuid());
  else
    return new;
  end if;

  if active_count >= 30 then
    raise exception 'CATALOG_MEDIA_LIMIT_30';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_catalog_media_limit() from public;
drop trigger if exists catalog_media_limit_30 on public.catalog_media;
create trigger catalog_media_limit_30
before insert or update of is_active,vehicle_id,tour_id,blog_post_id on public.catalog_media
for each row execute function private.enforce_catalog_media_limit();

-- Keep placement sort numbers contiguous after deletes so no visual/data holes remain.
create or replace function private.compact_homepage_placement_order()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  with ranked as (
    select id, row_number() over(order by sort_order,id)::int as rn
    from public.homepage_placements
    where section_key = old.section_key and is_active = true
  )
  update public.homepage_placements p
  set sort_order = ranked.rn, updated_at = now()
  from ranked where p.id = ranked.id and p.sort_order <> ranked.rn;
  return old;
end;
$$;
revoke all on function private.compact_homepage_placement_order() from public;
drop trigger if exists homepage_placements_compact_after_delete on public.homepage_placements;
create trigger homepage_placements_compact_after_delete
after delete on public.homepage_placements
for each row execute function private.compact_homepage_placement_order();
