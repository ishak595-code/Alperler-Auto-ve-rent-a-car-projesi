-- V36 catalog/media/content placement/staff management foundation.
-- Existing public records remain published after this migration.

alter table public.vehicles
  add column if not exists publication_status text not null default 'PUBLISHED',
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_at timestamptz;

alter table public.tours
  add column if not exists publication_status text not null default 'PUBLISHED',
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_at timestamptz;

update public.vehicles
set published_at = coalesce(published_at, created_at, now())
where publication_status = 'PUBLISHED';

update public.tours
set published_at = coalesce(published_at, created_at, now())
where publication_status = 'PUBLISHED';

do $$ begin
  alter table public.vehicles add constraint vehicles_publication_status_check
    check (publication_status in ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.tours add constraint tours_publication_status_check
    check (publication_status in ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED'));
exception when duplicate_object then null; end $$;

create table if not exists public.catalog_media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  tour_id uuid references public.tours(id) on delete cascade,
  blog_post_id uuid references public.blog_posts(id) on delete cascade,
  kind text not null default 'IMAGE' check (kind in ('IMAGE','VIDEO')),
  storage_bucket text,
  object_path text,
  external_url text,
  poster_url text,
  source_url text,
  source_name text,
  license text,
  attribution text,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_media_one_owner check (
    ((vehicle_id is not null)::int + (tour_id is not null)::int + (blog_post_id is not null)::int) = 1
  ),
  constraint catalog_media_one_location check (
    ((object_path is not null and storage_bucket is not null)::int + (external_url is not null)::int) = 1
  )
);

create unique index if not exists catalog_media_vehicle_cover_uidx
  on public.catalog_media(vehicle_id) where vehicle_id is not null and is_cover and is_active;
create unique index if not exists catalog_media_tour_cover_uidx
  on public.catalog_media(tour_id) where tour_id is not null and is_cover and is_active;
create unique index if not exists catalog_media_blog_cover_uidx
  on public.catalog_media(blog_post_id) where blog_post_id is not null and is_cover and is_active;
create index if not exists catalog_media_vehicle_sort_idx on public.catalog_media(vehicle_id, sort_order) where is_active;
create index if not exists catalog_media_tour_sort_idx on public.catalog_media(tour_id, sort_order) where is_active;
create index if not exists catalog_media_blog_sort_idx on public.catalog_media(blog_post_id, sort_order) where is_active;

create table if not exists public.homepage_sections (
  section_key text primary key,
  title text not null,
  section_type text not null check (section_type in ('VEHICLES','TOURS','BLOG','CAMPAIGN','CUSTOM')),
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  max_items integer not null default 6 check (max_items between 1 and 24),
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_placements (
  id uuid primary key default gen_random_uuid(),
  section_key text not null references public.homepage_sections(section_key) on delete cascade,
  entity_type text not null check (entity_type in ('VEHICLE','TOUR','BLOG')),
  entity_id uuid not null,
  label text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_key, entity_type, entity_id),
  constraint homepage_placement_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists homepage_placements_slot_sort_idx
  on public.homepage_placements(section_key, sort_order) where is_active;

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
  end if;
  return new;
end;
$$;
revoke all on function private.validate_homepage_placement_entity() from public;

drop trigger if exists homepage_placements_validate_entity on public.homepage_placements;
create trigger homepage_placements_validate_entity
before insert or update of entity_type, entity_id on public.homepage_placements
for each row execute function private.validate_homepage_placement_entity();

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  email text,
  phone text,
  job_title text,
  department text not null default 'GENERAL' check (department in ('MANAGEMENT','SALES','RENTAL','FLEET','TOURS','CONTENT','SUPPORT','GENERAL')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists staff_profiles_email_uidx on public.staff_profiles(lower(email)) where email is not null;

create table if not exists public.staff_branch_assignments (
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(staff_id, branch_id)
);
create unique index if not exists staff_primary_branch_uidx on public.staff_branch_assignments(staff_id) where is_primary;

create table if not exists public.vehicle_staff_assignments (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  responsibility text not null default 'RESPONSIBLE' check (responsibility in ('RESPONSIBLE','SALES','FLEET','DELIVERY','MAINTENANCE')),
  created_at timestamptz not null default now(),
  primary key(vehicle_id, staff_id, responsibility)
);

create table if not exists public.tour_staff_assignments (
  tour_id uuid not null references public.tours(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  responsibility text not null default 'COORDINATOR' check (responsibility in ('COORDINATOR','GUIDE','DRIVER','CONTENT')),
  created_at timestamptz not null default now(),
  primary key(tour_id, staff_id, responsibility)
);

alter table public.admin_users
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists primary_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

create table if not exists public.admin_user_branches (
  user_id uuid not null references public.admin_users(user_id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, branch_id)
);

-- Dedicated catalog media bucket supports images and short MP4/WebM videos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media',
  'catalog-media',
  true,
  157286400,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.catalog_media enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_placements enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_branch_assignments enable row level security;
alter table public.vehicle_staff_assignments enable row level security;
alter table public.tour_staff_assignments enable row level security;
alter table public.admin_user_branches enable row level security;

drop policy if exists catalog_media_public_read on public.catalog_media;
create policy catalog_media_public_read on public.catalog_media for select
using (is_active = true or private.is_admin());
drop policy if exists catalog_media_admin_insert on public.catalog_media;
create policy catalog_media_admin_insert on public.catalog_media for insert with check (private.is_admin());
drop policy if exists catalog_media_admin_update on public.catalog_media;
create policy catalog_media_admin_update on public.catalog_media for update using (private.is_admin()) with check (private.is_admin());
drop policy if exists catalog_media_admin_delete on public.catalog_media;
create policy catalog_media_admin_delete on public.catalog_media for delete using (private.is_admin());

drop policy if exists homepage_sections_public_read on public.homepage_sections;
create policy homepage_sections_public_read on public.homepage_sections for select
using (is_enabled = true or private.is_admin());
drop policy if exists homepage_sections_admin_all on public.homepage_sections;
create policy homepage_sections_admin_all on public.homepage_sections for all
using (private.is_admin()) with check (private.is_admin());

drop policy if exists homepage_placements_public_read on public.homepage_placements;
create policy homepage_placements_public_read on public.homepage_placements for select
using (
  (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
  or private.is_admin()
);
drop policy if exists homepage_placements_admin_all on public.homepage_placements;
create policy homepage_placements_admin_all on public.homepage_placements for all
using (private.is_admin()) with check (private.is_admin());

create policy staff_profiles_admin_all on public.staff_profiles for all using (private.is_admin()) with check (private.is_admin());
create policy staff_branch_assignments_admin_all on public.staff_branch_assignments for all using (private.is_admin()) with check (private.is_admin());
create policy vehicle_staff_assignments_admin_all on public.vehicle_staff_assignments for all using (private.is_admin()) with check (private.is_admin());
create policy tour_staff_assignments_admin_all on public.tour_staff_assignments for all using (private.is_admin()) with check (private.is_admin());
create policy admin_user_branches_admin_all on public.admin_user_branches for all using (private.is_admin()) with check (private.is_admin());

-- Public catalog only receives explicitly published records. Admins can still see drafts.
drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles for select
using ((is_active = true and publication_status = 'PUBLISHED') or private.is_admin());

drop policy if exists tours_public_read on public.tours;
create policy tours_public_read on public.tours for select
using ((is_active = true and publication_status = 'PUBLISHED') or private.is_admin());

-- Storage policies for catalog media.
drop policy if exists catalog_media_objects_public_read on storage.objects;
create policy catalog_media_objects_public_read on storage.objects for select
using (bucket_id = 'catalog-media');
drop policy if exists catalog_media_objects_admin_insert on storage.objects;
create policy catalog_media_objects_admin_insert on storage.objects for insert
with check (bucket_id = 'catalog-media' and private.is_admin());
drop policy if exists catalog_media_objects_admin_update on storage.objects;
create policy catalog_media_objects_admin_update on storage.objects for update
using (bucket_id = 'catalog-media' and private.is_admin())
with check (bucket_id = 'catalog-media' and private.is_admin());
drop policy if exists catalog_media_objects_admin_delete on storage.objects;
create policy catalog_media_objects_admin_delete on storage.objects for delete
using (bucket_id = 'catalog-media' and private.is_admin());

-- Seed a reorderable homepage layout without changing current public visibility.
insert into public.homepage_sections(section_key,title,section_type,is_enabled,sort_order,max_items,settings)
values
  ('rental_featured','Öne Çıkan Kiralık Araçlar','VEHICLES',true,10,6,'{"category":"RENTAL"}'::jsonb),
  ('sale_featured','Öne Çıkan Satılık Araçlar','VEHICLES',true,20,6,'{"category":"SALE"}'::jsonb),
  ('campaigns','Kampanyalar ve Fırsatlar','CAMPAIGN',true,30,6,'{}'::jsonb),
  ('tour_featured','Öne Çıkan Turlar','TOURS',true,40,6,'{}'::jsonb),
  ('blog_featured','Son Yazılar','BLOG',true,50,3,'{}'::jsonb)
on conflict(section_key) do nothing;

insert into public.homepage_placements(section_key,entity_type,entity_id,sort_order,is_active)
select 'rental_featured','VEHICLE',id,row_number() over(order by is_featured desc, created_at desc),true
from public.vehicles where category='RENTAL' and is_active=true
on conflict(section_key,entity_type,entity_id) do nothing;

insert into public.homepage_placements(section_key,entity_type,entity_id,sort_order,is_active)
select 'sale_featured','VEHICLE',id,row_number() over(order by is_featured desc, created_at desc),true
from public.vehicles where category='SALE' and is_active=true
on conflict(section_key,entity_type,entity_id) do nothing;

insert into public.homepage_placements(section_key,entity_type,entity_id,sort_order,is_active)
select 'campaigns','VEHICLE',id,row_number() over(order by is_featured desc, created_at desc),true
from public.vehicles
where is_active=true and (
  coalesce(metadata->>'isCampaign','false')='true'
  or upper(coalesce(metadata->>'badge','')) in ('KAMPANYA','FIRSAT')
)
on conflict(section_key,entity_type,entity_id) do nothing;

insert into public.homepage_placements(section_key,entity_type,entity_id,sort_order,is_active)
select 'tour_featured','TOUR',id,row_number() over(order by is_featured desc, created_at desc),true
from public.tours where is_active=true
on conflict(section_key,entity_type,entity_id) do nothing;

insert into public.homepage_placements(section_key,entity_type,entity_id,sort_order,is_active)
select 'blog_featured','BLOG',id,row_number() over(order by published_at desc nulls last, created_at desc),true
from public.blog_posts where status='PUBLISHED'
on conflict(section_key,entity_type,entity_id) do nothing;
